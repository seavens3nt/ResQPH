"""Real mission router/service acceptance with test-only repository adapters."""

from copy import deepcopy

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from offline_test_support import (
    OfflineEventRepository,
    OfflineMissionRepository,
    get_offline_event_payload,
    get_test_headers,
    load_offline_fixture,
)

from app.api.routes.missions import (
    get_mission_service,
    router,
    validation_exception_handler,
)
from app.services.missions import MissionService


@pytest.fixture
def harness():
    fixture = load_offline_fixture()
    missions = OfflineMissionRepository(fixture)
    events = OfflineEventRepository(missions)
    service = MissionService(missions, events)  # type: ignore[arg-type]
    application = FastAPI()
    application.include_router(router, prefix="/api/v1")
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.dependency_overrides[get_mission_service] = lambda: service
    with TestClient(application) as client:
        yield client, fixture, missions, events


def post(harness, body=None, actor="rescuer-alpha", role="rescuer"):
    client, fixture, _, _ = harness
    return client.post(
        f"/api/v1/missions/{fixture['mission']['id']}/status-events",
        json=body if body is not None else get_offline_event_payload(fixture),
        headers=get_test_headers(actor, role),
    )


def snapshot(harness):
    _, _, missions, events = harness
    return deepcopy((missions.missions, events.events))


def test_accepted_offline_event(harness):
    _, fixture, _, events = harness
    body = get_offline_event_payload(fixture)
    response = post(harness, body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert (data["status"], data["version"], len(data["status_history"])) == ("arrived", 3, 1)
    event = data["status_history"][0]
    assert event["event_id"] == body["event_id"]
    assert event["mission_id"] == fixture["mission"]["id"]
    assert (event["prior_status"], event["new_status"]) == ("en-route", "arrived")
    assert (event["actor_id"], event["actor_role"]) == (fixture["actor_id"], "rescuer")
    assert event["source"] == "offline-sync"
    assert event["client_recorded_at"] == body["client_recorded_at"]
    assert event["note"] is None  # actual wire shape, not a simplified UI mock
    assert event["server_recorded_at"]
    assert data["data_source"] == "synthetic"
    assert len(events.events) == 1


def test_duplicate_replay_after_dropped_response(harness):
    # Discard the first successful response to model a client missing it.
    # This does not claim a real network drop was induced.
    initial = post(harness)
    assert initial.status_code == 200, initial.text
    accepted_snapshot = snapshot(harness)
    replay = post(harness)
    assert replay.status_code == 200, replay.text
    assert replay.json() == initial.json()
    assert snapshot(harness) == accepted_snapshot
    assert len(replay.json()["status_history"]) == 1


def test_stale_version_conflict(harness):
    _, fixture, missions, _ = harness
    mission_id = fixture["mission"]["id"]
    missions.missions[mission_id] = missions.missions[mission_id].model_copy(update={"version": 3})
    before = snapshot(harness)
    response = post(harness)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "stale_mission_version"
    assert snapshot(harness) == before


def test_wrong_actor_forbidden(harness):
    before = snapshot(harness)
    response = post(harness, actor="rescuer-beta")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"
    assert snapshot(harness) == before


@pytest.mark.parametrize("role", ["citizen", "volunteer", "unknown"])
def test_wrong_role_does_not_mutate(harness, role):
    before = snapshot(harness)
    assert post(harness, role=role).status_code == 403
    assert snapshot(harness) == before


@pytest.mark.parametrize("field,value", [("new_status", "completed"), ("source", "online")])
def test_conflicting_reuse_of_event_id_does_not_mutate(harness, field, value):
    assert post(harness).status_code == 200
    before = snapshot(harness)
    body = get_offline_event_payload(harness[1])
    body[field] = value
    response = post(harness, body)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_event"
    assert snapshot(harness) == before


def test_invalid_transition_does_not_mutate(harness):
    body = get_offline_event_payload(harness[1])
    body["new_status"] = "completed"
    before = snapshot(harness)
    response = post(harness, body)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_transition"
    assert snapshot(harness) == before


def test_completed_event_retry_preserves_terminal_history(harness):
    assert post(harness).status_code == 200
    body = get_offline_event_payload(harness[1])
    body.update(event_id="offline-completion-002", new_status="completed", expected_mission_version=3)
    accepted = post(harness, body)
    assert accepted.status_code == 200
    before = snapshot(harness)
    replay = post(harness, body)
    assert replay.status_code == 200
    assert replay.json() == accepted.json()
    assert (replay.json()["status"], replay.json()["version"], len(replay.json()["status_history"])) == ("completed", 4, 2)
    assert replay.json()["completed_at"]
    assert snapshot(harness) == before


def test_authorized_refresh_after_conflict(harness):
    assert post(harness).status_code == 200
    stale = get_offline_event_payload(harness[1])
    stale["event_id"] = "another-stale-attempt"
    assert post(harness, stale).status_code == 409
    client, fixture, _, _ = harness
    url = f"/api/v1/missions/{fixture['mission']['id']}"
    current = client.get(url, headers=get_test_headers())
    assert current.status_code == 200
    assert (current.json()["status"], current.json()["version"]) == ("arrived", 3)
    assert client.get(url, headers=get_test_headers("rescuer-beta")).status_code == 404


def test_503_repository_outage_does_not_mutate(harness):
    harness[2].unavailable = True
    before = snapshot(harness)
    response = post(harness)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "dependency_unavailable"
    assert snapshot(harness) == before


def test_event_write_failure_rolls_back_then_same_payload_can_retry(harness):
    harness[3].fail_on_append = True
    before = snapshot(harness)
    assert post(harness).status_code == 503
    assert snapshot(harness) == before
    harness[3].fail_on_append = False
    assert post(harness).status_code == 200
    assert len(harness[3].events) == 1


def test_schema_validation_does_not_mutate(harness):
    body = get_offline_event_payload(harness[1])
    body["expected_mission_version"] = 0
    before = snapshot(harness)
    response = post(harness, body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert snapshot(harness) == before
