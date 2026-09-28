from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.api.routes.assignments import get_assignment_service, router
from app.models.mission import Mission
from app.models.rescue_request import (
    GeoPoint,
    RequestLocation,
    RequestStatusHistory,
    RescueRequest,
)
from app.models.rescuer import RescuerTeam
from app.repositories.assignments import DuplicateAssignmentError
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)
from app.services.assignments import AssignmentService

BASE_TIME = datetime(2026, 9, 21, 4, 0, tzinfo=timezone.utc)


class AssignmentState:
    def __init__(self) -> None:
        self.requests = {
            "request-1": RescueRequest(
                id="request-1",
                citizen_id="citizen-demo",
                location=RequestLocation(
                    address="Sanitized demonstration address",
                    point=GeoPoint(coordinates=(120.9946, 14.6042)),
                    landmark="Sanitized landmark",
                ),
                headcount=4,
                vulnerabilities=["infant"],
                medical_needs=True,
                medical_details="Sanitized demonstration note",
                reported_flood_level="high",
                situation_summary="Controlled rescue demonstration",
                status="pending",
                version=1,
                created_at=BASE_TIME,
                updated_at=BASE_TIME,
                status_history=[
                    RequestStatusHistory(status="pending", occurred_at=BASE_TIME)
                ],
            )
        }
        self.teams = {
            "team-alpha": RescuerTeam(
                id="team-alpha",
                team_name="U-Belt Demo Team Alpha",
                unit_type="Rubber Boat",
                member_count=4,
                has_medical_unit=True,
                availability="available",
                version=1,
                created_at=BASE_TIME,
                updated_at=BASE_TIME,
            ),
            "team-bravo": RescuerTeam(
                id="team-bravo",
                team_name="U-Belt Demo Team Bravo",
                unit_type="High-Clearance Truck",
                member_count=3,
                has_medical_unit=False,
                availability="available",
                version=1,
                created_at=BASE_TIME,
                updated_at=BASE_TIME,
            ),
        }
        self.missions: dict[str, Mission] = {}
        self.fail_on_mission = False


class InMemoryRequests:
    def __init__(self, state: AssignmentState) -> None:
        self.state = state

    async def get_by_id(
        self, request_id: str, session: Any = None
    ) -> RescueRequest | None:
        return self.state.requests.get(request_id)

    async def mark_assigned_if_current(
        self,
        *,
        request_id: str,
        expected_version: int,
        team_id: str,
        mission_id: str,
        assigned_at: datetime,
        session: Any,
    ) -> RescueRequest | None:
        request = self.state.requests.get(request_id)
        if (
            request is None
            or request.status != "pending"
            or request.version != expected_version
            or request.mission_id is not None
        ):
            return None
        updated = request.model_copy(
            update={
                "status": "assigned",
                "version": request.version + 1,
                "assigned_team_id": team_id,
                "mission_id": mission_id,
                "updated_at": assigned_at,
                "status_history": [
                    *request.status_history,
                    RequestStatusHistory(
                        status="assigned",
                        occurred_at=assigned_at,
                        note=f"Assigned to synthetic team {team_id}",
                    ),
                ],
            }
        )
        self.state.requests[request_id] = updated
        return updated


class InMemoryRescuers:
    def __init__(self, state: AssignmentState) -> None:
        self.state = state

    async def get_by_id(self, team_id: str, session: Any = None) -> RescuerTeam | None:
        return self.state.teams.get(team_id)

    async def reserve_if_available(
        self,
        *,
        team_id: str,
        request_id: str,
        mission_id: str,
        assigned_at: datetime,
        session: Any,
    ) -> RescuerTeam | None:
        team = self.state.teams.get(team_id)
        if team is None or team.availability != "available":
            return None
        updated = team.model_copy(
            update={
                "availability": "assigned",
                "version": team.version + 1,
                "assigned_request_id": request_id,
                "assigned_mission_id": mission_id,
                "updated_at": assigned_at,
            }
        )
        self.state.teams[team_id] = updated
        return updated


class InMemoryAssignments:
    def __init__(self, state: AssignmentState) -> None:
        self.state = state

    async def run_in_transaction(self, callback: Any) -> Any:
        snapshot = deepcopy(
            (
                self.state.requests,
                self.state.teams,
                self.state.missions,
            )
        )
        try:
            return await callback(None)
        except Exception:
            (
                self.state.requests,
                self.state.teams,
                self.state.missions,
            ) = snapshot
            raise

    async def create_mission(self, mission: Mission, session: Any) -> Mission:
        if self.state.fail_on_mission:
            raise RuntimeError("simulated mission persistence failure")
        if any(
            existing.request_id == mission.request_id
            for existing in self.state.missions.values()
        ):
            raise DuplicateAssignmentError
        self.state.missions[mission.id] = mission
        return mission


@pytest.fixture()
def state() -> AssignmentState:
    return AssignmentState()


@pytest.fixture()
def client(state: AssignmentState) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def service_override() -> AssignmentService:
        return AssignmentService(
            InMemoryRequests(state),  # type: ignore[arg-type]
            InMemoryRescuers(state),  # type: ignore[arg-type]
            InMemoryAssignments(state),  # type: ignore[arg-type]
        )

    app.dependency_overrides[get_assignment_service] = service_override
    return TestClient(app, raise_server_exceptions=False)


def headers(
    role: str = "coordinator", user_id: str = "coordinator-demo"
) -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": role}


def assignment_payload(team_id: str = "team-alpha", version: int = 1) -> dict[str, Any]:
    return {"team_id": team_id, "expected_request_version": version}


def test_coordinator_assignment_updates_all_records_atomically(
    client: TestClient,
    state: AssignmentState,
) -> None:
    response = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload(),
        headers=headers(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["request"]["status"] == "assigned"
    assert body["request"]["version"] == 2
    assert body["request"]["assigned_team_id"] == "team-alpha"
    assert body["mission"]["status"] == "assigned"
    assert body["mission"]["version"] == 1
    assert body["mission"]["latest_route_result"] is None

    mission_id = body["mission"]["id"]
    assert state.requests["request-1"].mission_id == mission_id
    assert state.teams["team-alpha"].availability == "assigned"
    assert state.teams["team-alpha"].assigned_mission_id == mission_id
    assert list(state.missions) == [mission_id]
    assert state.requests["request-1"].status_history[-1].status == "assigned"


def test_roles_stale_versions_duplicate_assignment_and_unavailable_team_do_not_partially_write(
    client: TestClient,
    state: AssignmentState,
) -> None:
    baseline = deepcopy(state)
    forbidden = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload(),
        headers=headers("citizen", "citizen-demo"),
    )
    stale = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload(version=99),
        headers=headers(),
    )
    missing_team = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload("team-missing"),
        headers=headers(),
    )

    assert forbidden.status_code == 403
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_request_version"
    assert missing_team.status_code == 409
    assert missing_team.json()["error"]["code"] == "team_unavailable"
    assert state.requests == baseline.requests
    assert state.teams == baseline.teams
    assert state.missions == {}

    first = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload(),
        headers=headers(),
    )
    assert first.status_code == 201
    after_first = deepcopy((state.requests, state.teams, state.missions))

    duplicate = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload("team-bravo", version=2),
        headers=headers(),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "duplicate_assignment"
    assert (state.requests, state.teams, state.missions) == after_first
    assert state.teams["team-bravo"].availability == "available"


def test_mid_transaction_failure_rolls_back_request_team_mission_and_history(
    client: TestClient,
    state: AssignmentState,
) -> None:
    before = deepcopy((state.requests, state.teams, state.missions))
    state.fail_on_mission = True

    response = client.post(
        "/api/v1/rescue-requests/request-1/assignment",
        json=assignment_payload(),
        headers=headers(),
    )

    assert response.status_code == 500
    assert (state.requests, state.teams, state.missions) == before


def test_assignment_openapi_documents_created_and_conflict_responses(
    client: TestClient,
) -> None:
    schema = client.get("/openapi.json").json()
    operation = schema["paths"]["/api/v1/rescue-requests/{request_id}/assignment"][
        "post"
    ]

    assert "201" in operation["responses"]
    assert "403" in operation["responses"]
    assert "409" in operation["responses"]
    assert "503" in operation["responses"]
