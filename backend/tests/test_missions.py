from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.api.routes.missions import (
    get_mission_service,
    router,
    validation_exception_handler,
)
from app.models.mission import Mission, MissionStatus
from app.models.mission_status_event import MissionStatusEvent
from app.repositories.mission_status_events import DuplicateMissionStatusEventError
from app.services.missions import MissionService

BASE_TIME = datetime(2026, 9, 21, 4, 0, tzinfo=timezone.utc)


class InMemoryMissionRepository:
    def __init__(self, missions: dict[str, Mission]) -> None:
        self.missions = missions

    async def list_for_rescuer(
        self,
        rescuer_id: str,
        statuses: list[MissionStatus] | None = None,
    ) -> list[Mission]:
        return [
            mission
            for mission in self.missions.values()
            if mission.is_assigned_to(rescuer_id) and (statuses is None or mission.status in statuses)
        ]

    async def list_all(self, statuses: list[MissionStatus] | None = None) -> list[Mission]:
        return [
            mission
            for mission in self.missions.values()
            if statuses is None or mission.status in statuses
        ]

    async def get_by_id(self, mission_id: str) -> Mission | None:
        return self.missions.get(mission_id)

    async def update_status_if_current(
        self,
        mission_id: str,
        expected_version: int,
        prior_status: MissionStatus,
        new_status: MissionStatus,
        recorded_at: datetime,
    ) -> Mission | None:
        mission = self.missions.get(mission_id)
        if mission is None or mission.version != expected_version or mission.status != prior_status:
            return None

        update: dict[str, Any] = {
            "status": new_status,
            "version": mission.version + 1,
            "updated_at": recorded_at,
        }
        if new_status == "completed":
            update["completed_at"] = recorded_at
        self.missions[mission_id] = mission.model_copy(update=update)
        return self.missions[mission_id]


class InMemoryEventRepository:
    def __init__(self) -> None:
        self.events: dict[str, MissionStatusEvent] = {}

    async def get_by_event_id(self, event_id: str) -> MissionStatusEvent | None:
        return self.events.get(event_id)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        return sorted(
            [event for event in self.events.values() if event.mission_id == mission_id],
            key=lambda event: event.server_recorded_at,
        )

    async def append(self, event: MissionStatusEvent) -> MissionStatusEvent:
        if event.event_id in self.events:
            raise DuplicateMissionStatusEventError
        self.events[event.event_id] = event
        return event


@pytest.fixture()
def mission_store() -> dict[str, Mission]:
    return {
        "mission-1": Mission(
            id="mission-1",
            request_id="request-1",
            team_id="rescuer-alpha",
            assigned_rescuer_id="rescuer-alpha",
            status="assigned",
            version=1,
            assigned_at=BASE_TIME,
            created_at=BASE_TIME,
            updated_at=BASE_TIME,
            request_summary={"fixture_notice": "Synthetic academic demonstration data."},
        ),
        "mission-2": Mission(
            id="mission-2",
            request_id="request-2",
            team_id="rescuer-bravo",
            assigned_rescuer_id="rescuer-bravo",
            status="assigned",
            version=1,
            assigned_at=BASE_TIME,
            created_at=BASE_TIME,
            updated_at=BASE_TIME,
        ),
    }


@pytest.fixture()
def event_store() -> InMemoryEventRepository:
    return InMemoryEventRepository()


@pytest.fixture()
def client(
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def service_override() -> MissionService:
        return MissionService(InMemoryMissionRepository(mission_store), event_store)  # type: ignore[arg-type]

    app.dependency_overrides[get_mission_service] = service_override
    return TestClient(app)


def rescuer_headers(user_id: str = "rescuer-alpha") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": "rescuer"}


def coordinator_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "coordinator-demo", "X-Demo-Role": "coordinator"}


def status_payload(
    event_id: str,
    new_status: str,
    expected_version: int,
    source: str = "online",
) -> dict[str, Any]:
    return {
        "event_id": event_id,
        "new_status": new_status,
        "expected_mission_version": expected_version,
        "client_recorded_at": "2026-09-21T04:00:00Z",
        "source": source,
        "note": "<b>Sanitized optional note</b>",
    }


def post_status(
    client: TestClient,
    event_id: str,
    new_status: str,
    expected_version: int,
    headers: dict[str, str] | None = None,
    mission_id: str = "mission-1",
    source: str = "online",
) -> Any:
    return client.post(
        f"/api/v1/missions/{mission_id}/status-events",
        json=status_payload(event_id, new_status, expected_version, source),
        headers=headers or rescuer_headers(),
    )


def test_assigned_rescuer_lists_and_retrieves_only_their_missions(client: TestClient) -> None:
    list_response = client.get(
        "/api/v1/missions?assigned_to=me&status=assigned,en-route,arrived",
        headers=rescuer_headers(),
    )
    assert list_response.status_code == 200
    assert [mission["id"] for mission in list_response.json()] == ["mission-1"]

    get_response = client.get("/api/v1/missions/mission-1", headers=rescuer_headers())
    assert get_response.status_code == 200
    assert get_response.json()["id"] == "mission-1"

    other_rescuer_response = client.get("/api/v1/missions/mission-1", headers=rescuer_headers("rescuer-bravo"))
    assert other_rescuer_response.status_code == 404
    assert other_rescuer_response.json()["error"]["code"] == "mission_not_found"

    missing_response = client.get("/api/v1/missions/unavailable", headers=rescuer_headers())
    assert missing_response.status_code == 404


def test_every_allowed_rescuer_transition_updates_once_and_appends_ordered_history(
    client: TestClient,
    mission_store: dict[str, Mission],
) -> None:
    first = post_status(client, "event-1", "en-route", 1)
    assert first.status_code == 200
    assert first.json()["status"] == "en-route"
    assert first.json()["version"] == 2

    second = post_status(client, "event-2", "arrived", 2, source="offline-sync")
    assert second.status_code == 200
    assert second.json()["status"] == "arrived"
    assert second.json()["version"] == 3

    third = post_status(client, "event-3", "completed", 3)
    assert third.status_code == 200
    body = third.json()
    assert body["status"] == "completed"
    assert body["version"] == 4
    assert mission_store["mission-1"].status == "completed"
    assert mission_store["mission-1"].version == 4

    history = body["status_history"]
    assert [event["prior_status"] for event in history] == ["assigned", "en-route", "arrived"]
    assert [event["new_status"] for event in history] == ["en-route", "arrived", "completed"]
    assert [event["actor_id"] for event in history] == ["rescuer-alpha", "rescuer-alpha", "rescuer-alpha"]
    assert history[1]["source"] == "offline-sync"
    assert history[0]["note"] == "&lt;b&gt;Sanitized optional note&lt;/b&gt;"


def test_coordinator_can_complete_arrived_mission(
    client: TestClient,
    mission_store: dict[str, Mission],
) -> None:
    mission_store["mission-1"] = mission_store["mission-1"].model_copy(
        update={"status": "arrived", "version": 3}
    )

    response = post_status(
        client,
        "coordinator-complete",
        "completed",
        3,
        headers=coordinator_headers(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["status_history"][0]["actor_role"] == "coordinator"


@pytest.mark.parametrize(
    ("start_status", "version", "requested_status"),
    [
        ("assigned", 1, "arrived"),
        ("assigned", 1, "completed"),
        ("en-route", 2, "completed"),
        ("en-route", 2, "assigned"),
        ("arrived", 3, "en-route"),
        ("completed", 4, "arrived"),
        ("assigned", 1, "assigned"),
    ],
)
def test_invalid_skipped_repeated_backward_and_terminal_transitions_do_not_write_history(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    start_status: MissionStatus,
    version: int,
    requested_status: str,
) -> None:
    mission_store["mission-1"] = mission_store["mission-1"].model_copy(
        update={"status": start_status, "version": version}
    )
    before = deepcopy(mission_store["mission-1"])

    response = post_status(client, f"invalid-{requested_status}", requested_status, version)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_transition"
    assert mission_store["mission-1"] == before
    assert event_store.events == {}


def test_stale_version_does_not_change_state_version_or_history(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
) -> None:
    mission_store["mission-1"] = mission_store["mission-1"].model_copy(
        update={"status": "en-route", "version": 2}
    )
    before = deepcopy(mission_store["mission-1"])

    response = post_status(client, "stale-event", "arrived", 1)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "stale_mission_version"
    assert mission_store["mission-1"] == before
    assert event_store.events == {}


def test_duplicate_event_id_retry_does_not_duplicate_history(
    client: TestClient,
    event_store: InMemoryEventRepository,
) -> None:
    first = post_status(client, "same-event", "en-route", 1)
    assert first.status_code == 200

    retry = post_status(client, "same-event", "en-route", 1)
    assert retry.status_code == 200
    assert retry.json()["status"] == "en-route"
    assert len(retry.json()["status_history"]) == 1
    assert list(event_store.events) == ["same-event"]

    conflict = post_status(client, "same-event", "arrived", 2)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "duplicate_event"
    assert len(event_store.events) == 1


def test_unsupported_status_and_source_values_return_422(client: TestClient) -> None:
    bad_status = post_status(client, "bad-status", "flying", 1)
    assert bad_status.status_code == 422
    assert bad_status.json()["error"]["code"] == "validation_error"

    bad_source = post_status(client, "bad-source", "en-route", 1, source="sms")
    assert bad_source.status_code == 422
    assert bad_source.json()["error"]["code"] == "validation_error"

    bad_filter = client.get("/api/v1/missions?assigned_to=me&status=assigned,flying", headers=rescuer_headers())
    assert bad_filter.status_code == 422
    assert bad_filter.json()["error"]["code"] == "invalid_status_filter"
