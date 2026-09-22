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


class RoleMissionRepository:
    def __init__(self) -> None:
        self.mission = Mission(
            id="mission-1",
            request_id="request-1",
            team_id="rescuer-alpha",
            assigned_rescuer_id="rescuer-alpha",
            status="assigned",
            version=1,
            assigned_at=BASE_TIME,
            created_at=BASE_TIME,
            updated_at=BASE_TIME,
        )

    async def list_for_rescuer(
        self,
        rescuer_id: str,
        statuses: list[MissionStatus] | None = None,
    ) -> list[Mission]:
        if self.mission.is_assigned_to(rescuer_id) and (statuses is None or self.mission.status in statuses):
            return [self.mission]
        return []

    async def list_all(self, statuses: list[MissionStatus] | None = None) -> list[Mission]:
        if statuses is None or self.mission.status in statuses:
            return [self.mission]
        return []

    async def get_by_id(self, mission_id: str) -> Mission | None:
        if mission_id == self.mission.id:
            return self.mission
        return None

    async def update_status_if_current(
        self,
        mission_id: str,
        expected_version: int,
        prior_status: MissionStatus,
        new_status: MissionStatus,
        recorded_at: datetime,
    ) -> Mission | None:
        if (
            mission_id != self.mission.id
            or expected_version != self.mission.version
            or prior_status != self.mission.status
        ):
            return None
        self.mission = self.mission.model_copy(
            update={"status": new_status, "version": self.mission.version + 1, "updated_at": recorded_at}
        )
        return self.mission


class RoleEventRepository:
    def __init__(self) -> None:
        self.events: dict[str, MissionStatusEvent] = {}

    async def get_by_event_id(self, event_id: str) -> MissionStatusEvent | None:
        return self.events.get(event_id)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        return [event for event in self.events.values() if event.mission_id == mission_id]

    async def append(self, event: MissionStatusEvent) -> MissionStatusEvent:
        if event.event_id in self.events:
            raise DuplicateMissionStatusEventError
        self.events[event.event_id] = event
        return event


@pytest.fixture()
def role_repository() -> RoleMissionRepository:
    return RoleMissionRepository()


@pytest.fixture()
def client(role_repository: RoleMissionRepository) -> TestClient:
    event_repository = RoleEventRepository()
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def service_override() -> MissionService:
        return MissionService(role_repository, event_repository)  # type: ignore[arg-type]

    app.dependency_overrides[get_mission_service] = service_override
    return TestClient(app)


def headers(user_id: str, role: str) -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": role}


def payload(event_id: str = "event-1", new_status: str = "en-route", version: int = 1) -> dict[str, Any]:
    return {
        "event_id": event_id,
        "new_status": new_status,
        "expected_mission_version": version,
        "source": "online",
    }


@pytest.mark.parametrize("role", ["citizen", "volunteer"])
def test_citizen_and_volunteer_cannot_retrieve_or_update_missions(
    client: TestClient,
    role_repository: RoleMissionRepository,
    role: str,
) -> None:
    role_headers = headers(f"{role}-demo", role)

    retrieve = client.get("/api/v1/missions/mission-1", headers=role_headers)
    assert retrieve.status_code == 403
    assert retrieve.json()["error"]["code"] == "forbidden"

    update = client.post("/api/v1/missions/mission-1/status-events", json=payload(), headers=role_headers)
    assert update.status_code == 403
    assert update.json()["error"]["code"] == "forbidden"
    assert role_repository.mission.status == "assigned"
    assert role_repository.mission.version == 1


def test_unassigned_rescuer_cannot_retrieve_or_operate_known_mission_id(
    client: TestClient,
    role_repository: RoleMissionRepository,
) -> None:
    role_headers = headers("rescuer-bravo", "rescuer")

    retrieve = client.get("/api/v1/missions/mission-1", headers=role_headers)
    assert retrieve.status_code == 404

    update = client.post("/api/v1/missions/mission-1/status-events", json=payload(), headers=role_headers)
    assert update.status_code == 403
    assert role_repository.mission.status == "assigned"
    assert role_repository.mission.version == 1


def test_unsupported_demo_role_is_forbidden(client: TestClient) -> None:
    response = client.get("/api/v1/missions/mission-1", headers=headers("demo-user", "pilot"))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_coordinator_may_only_update_completion_transition(client: TestClient) -> None:
    coordinator_headers = headers("coordinator-demo", "coordinator")

    early_update = client.post(
        "/api/v1/missions/mission-1/status-events",
        json=payload(event_id="coordinator-early", new_status="en-route", version=1),
        headers=coordinator_headers,
    )
    assert early_update.status_code == 403

    retrieve = client.get("/api/v1/missions/mission-1", headers=coordinator_headers)
    assert retrieve.status_code == 200
