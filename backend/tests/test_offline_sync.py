import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any, cast

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
from tests.test_offline_sync_mongodb import validate_disposable_database_name

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = REPO_ROOT / "data" / "samples" / "offline-mission.example.json"


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
        tracking_state: dict[str, Any] | None = None,
        team_position: dict[str, Any] | None = None,
        session: Any = None,
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
        if tracking_state is not None:
            update["tracking_state"] = tracking_state
        if team_position is not None:
            update["team_position"] = team_position
        self.missions[mission_id] = mission.model_copy(update=update)
        return self.missions[mission_id]


class InMemoryEventRepository:
    def __init__(self, mission_store: dict[str, Mission]) -> None:
        self._mission_store = mission_store
        self.events: dict[str, MissionStatusEvent] = {}
        self.fail_on_append = False

    async def ensure_indexes(self) -> None:
        return None

    async def run_in_transaction(self, callback: Any) -> Any:
        mission_snapshot = deepcopy(self._mission_store)
        event_snapshot = deepcopy(self.events)
        try:
            return await callback(None)
        except Exception:
            self._mission_store.clear()
            self._mission_store.update(mission_snapshot)
            self.events.clear()
            self.events.update(event_snapshot)
            raise

    async def get_by_event_id(
        self,
        event_id: str,
        session: Any = None,
    ) -> MissionStatusEvent | None:
        return self.events.get(event_id)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        return sorted(
            [event for event in self.events.values() if event.mission_id == mission_id],
            key=lambda event: event.server_recorded_at,
        )

    async def append(
        self,
        event: MissionStatusEvent,
        session: Any = None,
    ) -> MissionStatusEvent:
        if self.fail_on_append:
            raise RuntimeError("simulated history persistence failure")
        if event.event_id in self.events:
            raise DuplicateMissionStatusEventError
        self.events[event.event_id] = event
        return event


@pytest.fixture()
def offline_fixture() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(FIXTURE_PATH.read_text(encoding="utf-8")))


@pytest.fixture()
def mission_store(offline_fixture: dict[str, Any]) -> dict[str, Mission]:
    mission = Mission.model_validate(offline_fixture["mission"])
    return {mission.id: mission}


@pytest.fixture()
def event_store(mission_store: dict[str, Mission]) -> InMemoryEventRepository:
    return InMemoryEventRepository(mission_store)


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


def offline_body(offline_fixture: dict[str, Any], **overrides: Any) -> dict[str, Any]:
    body = deepcopy(offline_fixture["pending_event"]["body"])
    body.update(overrides)
    return cast(dict[str, Any], body)


def post_offline(
    client: TestClient,
    offline_fixture: dict[str, Any],
    **overrides: Any,
) -> Any:
    mission_id = overrides.pop("mission_id", offline_fixture["mission"]["id"])
    headers = overrides.pop("headers", rescuer_headers())
    return client.post(
        f"/api/v1/missions/{mission_id}/status-events",
        json=offline_body(offline_fixture, **overrides),
        headers=headers,
    )


def event_count(event_store: InMemoryEventRepository, mission_id: str) -> int:
    return sum(1 for event in event_store.events.values() if event.mission_id == mission_id)


def test_get_mission_exposes_state_and_version_needed_for_offline_update(
    client: TestClient,
    offline_fixture: dict[str, Any],
) -> None:
    response = client.get(
        f"/api/v1/missions/{offline_fixture['mission']['id']}",
        headers=rescuer_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "en-route"
    assert body["version"] == 2
    assert body["assigned_rescuer_id"] == offline_fixture["actor_id"]
    assert body["version"] == offline_fixture["pending_event"]["body"]["expected_mission_version"]


def test_valid_offline_event_commits_one_transition_version_and_history(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
) -> None:
    response = post_offline(client, offline_fixture)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "arrived"
    assert body["version"] == 3
    assert mission_store["mission-offline-001"].status == "arrived"
    assert mission_store["mission-offline-001"].version == 3
    assert event_count(event_store, "mission-offline-001") == 1

    history = body["status_history"]
    assert len(history) == 1
    assert history[0]["event_id"] == "offline-event-001"
    assert history[0]["prior_status"] == "en-route"
    assert history[0]["new_status"] == "arrived"
    assert history[0]["source"] == "offline-sync"
    assert history[0]["client_recorded_at"] == "2026-10-04T00:05:00Z"
    assert history[0]["server_recorded_at"].endswith("Z")


def test_same_event_retry_and_lost_response_replay_do_not_apply_again(
    client: TestClient,
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
) -> None:
    committed_but_ignored = post_offline(client, offline_fixture)
    assert committed_but_ignored.status_code == 200

    retry = post_offline(client, offline_fixture)

    assert retry.status_code == 200
    assert retry.json()["status"] == "arrived"
    assert retry.json()["version"] == 3
    assert len(retry.json()["status_history"]) == 1
    assert event_count(event_store, "mission-offline-001") == 1


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("client_recorded_at", "2026-10-04T00:06:00Z"),
        ("client_recorded_at", None),
        ("note", "Different offline note"),
        ("source", "online"),
        ("new_status", "completed"),
    ],
)
def test_conflicting_reuse_of_event_id_with_different_offline_record_is_rejected(
    client: TestClient,
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
    field: str,
    value: Any,
) -> None:
    first = post_offline(client, offline_fixture)
    assert first.status_code == 200

    conflict = post_offline(
        client,
        offline_fixture,
        **{field: value},
    )

    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "duplicate_event"
    assert event_count(event_store, "mission-offline-001") == 1


@pytest.mark.parametrize("name", ["resqph", "admin", "local", "resqph_issue62_offline_", "resqph_issue62_offline_/normal", "resqph_issue62_offline_test.data"])
def test_disposable_database_guard_rejects_unsafe_names(name: str) -> None:
    with pytest.raises(ValueError):
        validate_disposable_database_name(name)


def test_disposable_database_guard_accepts_explicit_test_name() -> None:
    validate_disposable_database_name("resqph_issue62_offline_pr67_review")


def test_new_event_id_with_stale_expected_version_is_rejected_without_writes(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
) -> None:
    mission_store["mission-offline-001"] = mission_store["mission-offline-001"].model_copy(
        update={"status": "arrived", "version": 3}
    )
    before = deepcopy(mission_store["mission-offline-001"])

    response = post_offline(client, offline_fixture, event_id="offline-event-stale")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "stale_mission_version"
    assert mission_store["mission-offline-001"] == before
    assert event_store.events == {}


@pytest.mark.parametrize(
    ("start_status", "version", "requested_status"),
    [
        ("en-route", 2, "completed"),
        ("en-route", 2, "assigned"),
        ("arrived", 3, "en-route"),
        ("arrived", 3, "arrived"),
        ("completed", 4, "arrived"),
        ("cancelled", 4, "arrived"),
    ],
)
def test_invalid_skipped_backward_repeated_or_terminal_offline_transition_is_rejected(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
    start_status: MissionStatus,
    version: int,
    requested_status: str,
) -> None:
    mission_store["mission-offline-001"] = mission_store["mission-offline-001"].model_copy(
        update={"status": start_status, "version": version}
    )
    before = deepcopy(mission_store["mission-offline-001"])

    response = post_offline(
        client,
        offline_fixture,
        event_id=f"invalid-{requested_status}",
        new_status=requested_status,
        expected_mission_version=version,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_transition"
    assert mission_store["mission-offline-001"] == before
    assert event_store.events == {}


def test_wrong_or_reassigned_rescuer_cannot_replay_offline_event(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
) -> None:
    accepted = post_offline(client, offline_fixture)
    assert accepted.status_code == 200

    wrong_rescuer = post_offline(client, offline_fixture, headers=rescuer_headers("rescuer-bravo"))
    assert wrong_rescuer.status_code == 403
    assert wrong_rescuer.json()["error"]["code"] == "forbidden"

    mission_store["mission-offline-001"] = mission_store["mission-offline-001"].model_copy(
        update={"team_id": "rescuer-bravo", "assigned_rescuer_id": "rescuer-bravo"}
    )
    reassigned_original = post_offline(client, offline_fixture)
    assert reassigned_original.status_code == 403
    assert reassigned_original.json()["error"]["code"] == "forbidden"
    assert event_count(event_store, "mission-offline-001") == 1


def test_history_insertion_failure_rolls_back_mission_status_and_version(
    client: TestClient,
    mission_store: dict[str, Mission],
    event_store: InMemoryEventRepository,
    offline_fixture: dict[str, Any],
) -> None:
    before = deepcopy(mission_store["mission-offline-001"])
    event_store.fail_on_append = True

    with pytest.raises(RuntimeError, match="simulated history persistence failure"):
        post_offline(client, offline_fixture)

    assert mission_store["mission-offline-001"] == before
    assert event_store.events == {}
