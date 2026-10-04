"""Cross-component mission API replay checks for the bounded offline MVP.

Verifies:
1. Accepted offline event (200, status updated, history appended with source).
2. Duplicate replay after dropped response (200, idempotent, no duplicate history).
3. Stale-version conflict (409 Conflict).
4. Wrong actor (403 Forbidden).

Uses the real mission router with FastAPI dependency overrides to bypass MongoDB.
"""
import copy

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from offline_test_support import (
    get_offline_event_payload,
    get_test_headers,
    load_offline_fixture,
)

from app.api.routes.missions import get_mission_service
from app.main import app


class MockMissionState:
    """Test-only repository harness that mimics the backend mission service."""

    def __init__(self, fixture):
        self.current_mission = copy.deepcopy(fixture["mission"])

    async def create_status_event(self, mission_id: str, payload, actor):
        # Robustly extract dict from Pydantic V2 model, V1 model, or raw dict
        if hasattr(payload, "model_dump"):
            event_dict = payload.model_dump()
        elif hasattr(payload, "dict"):
            event_dict = payload.dict()
        elif isinstance(payload, dict):
            event_dict = payload
        else:
            event_dict = vars(payload)

        actor_id = getattr(actor, "user_id", actor)
        actor_role = getattr(actor, "role", "rescuer")

        if mission_id != self.current_mission["id"]:
            raise HTTPException(status_code=404, detail="Not found")
        if actor_id != self.current_mission["assigned_rescuer_id"]:
            raise HTTPException(status_code=403, detail="Wrong actor")

        event_id = event_dict["event_id"]

        # 1. Check for duplicate (idempotency) FIRST
        # If we've already processed this exact event_id, return current state immediately.
        for history_item in self.current_mission.get("status_history", []):
            if history_item.get("event_id") == event_id:
                return self.current_mission

        # 2. THEN check the version
        expected_version = event_dict["expected_mission_version"]
        if expected_version != self.current_mission["version"]:
            raise HTTPException(status_code=409, detail="Stale version")

        # Apply transition
        self.current_mission["status"] = event_dict["new_status"]
        self.current_mission["version"] += 1

        # Append history
        history_item = {
            "event_id": event_id,
            "mission_id": mission_id,
            "prior_status": "en-route",
            "new_status": event_dict["new_status"],
            "actor_id": actor_id,
            "actor_role": actor_role,
            "source": event_dict.get("source", "online"),
            "client_recorded_at": event_dict.get("client_recorded_at"),
            "server_recorded_at": "2026-10-04T00:05:01Z",
            "note": None,
        }
        self.current_mission.setdefault("status_history", []).append(history_item)

        return self.current_mission


@pytest.fixture
def mock_mission_service():
    """Create a fresh mock state for each test."""
    fixture = load_offline_fixture()
    return MockMissionState(fixture)


@pytest.fixture(autouse=True)
def override_dependencies(mock_mission_service):
    """Override FastAPI dependencies to bypass MongoDB connection."""
    app.dependency_overrides[get_mission_service] = lambda: mock_mission_service
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def test_accepted_offline_event():
    """1. Accepted offline event: 200 OK, status updated, history appended."""
    fixture = load_offline_fixture()
    event_body = get_offline_event_payload(fixture)
    headers = get_test_headers("rescuer-alpha", "rescuer")

    response = client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=event_body,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "arrived"
    assert data["version"] == 3
    assert len(data["status_history"]) == 1
    assert data["status_history"][0]["event_id"] == event_body["event_id"]
    assert data["status_history"][0]["source"] == "offline-sync"


def test_duplicate_replay_after_dropped_response():
    """2. Duplicate replay: 200 OK, idempotent, no duplicate history."""
    fixture = load_offline_fixture()
    event_body = get_offline_event_payload(fixture)
    headers = get_test_headers("rescuer-alpha", "rescuer")

    # First attempt (simulates dropped response, but server processed it)
    client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=event_body,
        headers=headers,
    )

    # Second attempt (replay same event_id)
    response = client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=event_body,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "arrived"
    assert data["version"] == 3
    # CRITICAL: History must not contain duplicates
    assert len(data["status_history"]) == 1


def test_stale_version_conflict(mock_mission_service):
    """3. Stale-version conflict: 409 Conflict."""
    fixture = load_offline_fixture()
    event_body = get_offline_event_payload(fixture)
    headers = get_test_headers("rescuer-alpha", "rescuer")

    # Simulate server having already advanced the version
    mock_mission_service.current_mission["version"] = 3

    response = client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=event_body,
        headers=headers,
    )

    assert response.status_code == 409


def test_wrong_actor_forbidden():
    """4. Wrong actor: 403 Forbidden."""
    fixture = load_offline_fixture()
    event_body = get_offline_event_payload(fixture)

    # Use a different rescuer ID
    headers = get_test_headers("rescuer-beta", "rescuer")

    response = client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=event_body,
        headers=headers,
    )

    assert response.status_code == 403