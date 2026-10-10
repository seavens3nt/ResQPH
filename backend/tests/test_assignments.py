from copy import deepcopy
from datetime import UTC, datetime
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
from app.schemas.routing import NoRouteResponse, RouteFoundResponse
from app.services.assignments import AssignmentService

BASE_TIME = datetime(2026, 9, 21, 4, 0, tzinfo=UTC)


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
            "team-sampaloc-fire-station": RescuerTeam(
                id="team-sampaloc-fire-station",
                team_name="Sampaloc Fire Station",
                unit_type="Rubber Boat",
                member_count=4,
                has_medical_unit=True,
                availability="available",
                station_id="sampaloc-fire-station",
                base_location={"type": "Point", "coordinates": [120.9931, 14.608]},
                current_location={"type": "Point", "coordinates": [120.9931, 14.608]},
                version=1,
                created_at=BASE_TIME,
                updated_at=BASE_TIME,
            ),
            "team-central-sampaloc-algeciras": RescuerTeam(
                id="team-central-sampaloc-algeciras",
                team_name="Central Sampaloc Volunteer Brigade",
                unit_type="High-Clearance Truck",
                member_count=3,
                has_medical_unit=False,
                availability="available",
                station_id="central-sampaloc-algeciras",
                base_location={"type": "Point", "coordinates": [120.9909, 14.6181]},
                current_location={"type": "Point", "coordinates": [120.9909, 14.6181]},
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
        station_id: str | None,
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
                "assigned_station_id": station_id,
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

    async def list_all(self, session: Any = None) -> list[RescuerTeam]:
        return list(self.state.teams.values())

    async def reserve_if_available(
        self,
        *,
        team_id: str,
        request_id: str,
        mission_id: str,
        assigned_at: datetime,
        session: Any,
        expected_version: int | None = None,
    ) -> RescuerTeam | None:
        team = self.state.teams.get(team_id)
        if team is None or team.availability != "available" or (expected_version is not None and team.version != expected_version):
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


class FakeRoutingAdapter:
    def __init__(self, distances: dict[tuple[float, float], float] | None = None, times: dict[tuple[float, float], float] | None = None) -> None:
        self.distances = distances or {}
        self.times = times or {}

    def evaluate(self, _payload: Any) -> RouteFoundResponse:
        origin = tuple(_payload.origin.coordinates)
        distance = self.distances.get(origin, 123.0)
        travel_time = self.times.get(origin, 45.0)
        return RouteFoundResponse(
            fixture_notice="Synthetic academic scenario; not live flood evidence.",
            status="route-found",
            route_id=f"route-test-{int(distance)}",
            algorithm="astar",
            geometry={
                "type": "LineString",
                "coordinates": [[120.9931743, 14.5983287], [120.9938198, 14.5977093]],
            },
            distance_m=distance,
            estimated_time_s=travel_time,
            total_cost=travel_time,
            edge_ids=["edge-test"],
            cost_breakdown={"base": travel_time, "deterministic_risk": 0.0, "ml_risk": 0.0},
            fallback_used=True,
            warnings=["Synthetic controlled scenario; not live navigation data.", "Runtime ML is disabled; deterministic rules were used."],
            explanation="Controlled test route.",
            scenario_timestamp="2026-09-21T04:00:00Z",
            model_version=None,
            selection_mode="distance",
        )


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
            FakeRoutingAdapter(),  # type: ignore[arg-type]
        )

    app.dependency_overrides[get_assignment_service] = service_override
    return TestClient(app, raise_server_exceptions=False)


def headers(
    role: str = "coordinator", user_id: str = "coordinator-demo"
) -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": role}


def assignment_payload(team_id: str = "team-sampaloc-fire-station", version: int = 1) -> dict[str, Any]:
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
    assert body["request"]["assigned_team_id"] == "team-sampaloc-fire-station"
    assert body["mission"]["status"] == "assigned"
    assert body["mission"]["version"] == 1
    assert body["mission"]["latest_route_result"]["status"] == "route-found"
    assert body["mission"]["station_id"] == "sampaloc-fire-station"
    assert body["request"]["assigned_station_id"] == "sampaloc-fire-station"

    mission_id = body["mission"]["id"]
    assert state.requests["request-1"].mission_id == mission_id
    assert state.teams["team-sampaloc-fire-station"].availability == "assigned"
    assert state.teams["team-sampaloc-fire-station"].assigned_mission_id == mission_id
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
        json=assignment_payload("team-central-sampaloc-algeciras", version=2),
        headers=headers(),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "duplicate_assignment"
    assert (state.requests, state.teams, state.missions) == after_first
    assert state.teams["team-central-sampaloc-algeciras"].availability == "available"


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


def test_recommendations_rank_available_teams_by_valid_road_distance(
    client: TestClient,
    state: AssignmentState,
) -> None:
    state.teams["team-sampaloc-fire-station"] = state.teams["team-sampaloc-fire-station"].model_copy(
        update={
            "station_id": "sampaloc-fire-station",
            "station_address": "A.H. Lacson Ave.",
            "base_location": {"type": "Point", "coordinates": [120.9931, 14.608]},
            "current_location": {"type": "Point", "coordinates": [120.9931, 14.608]},
        }
    )
    state.teams["team-central-sampaloc-algeciras"] = state.teams["team-central-sampaloc-algeciras"].model_copy(
        update={"availability": "assigned"}
    )

    response = client.get(
        "/api/v1/rescue-requests/request-1/recommendations",
        headers=headers(),
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["selection_mode"] == "distance"
    assert body["candidates"][0]["team_id"] == "team-sampaloc-fire-station"
    assert body["candidates"][0]["road_distance_m"] == 123.0
    assert body["candidates"][0]["origin_source"] == "current_location"
    assert body["candidates"][0]["routing_origin"] == [120.9931, 14.608]
    assert body["candidates"][0]["route"]["origin_source"] == "current_location"
    assert body["exclusions"][0]["reason"] == "team_unavailable"


@pytest.mark.asyncio
async def test_equal_road_distance_uses_stable_station_id_tie_break_not_eta(
    state: AssignmentState,
) -> None:
    service = AssignmentService(
        InMemoryRequests(state),  # type: ignore[arg-type]
        InMemoryRescuers(state),  # type: ignore[arg-type]
        InMemoryAssignments(state),  # type: ignore[arg-type]
        FakeRoutingAdapter(
            distances={(120.9931, 14.608): 500.0, (120.9909, 14.6181): 500.0},
            times={(120.9931, 14.608): 20.0, (120.9909, 14.6181): 300.0},
        ),  # type: ignore[arg-type]
    )

    candidates, _ = await service._rank_eligible_teams(state.requests["request-1"])

    assert [candidate.station_id for candidate in candidates] == [
        "central-sampaloc-algeciras",
        "sampaloc-fire-station",
    ]


@pytest.mark.asyncio
async def test_auto_assignment_selects_closest_valid_road_distance_and_creates_mission(
    state: AssignmentState,
) -> None:
    state.teams["team-sampaloc-fire-station"] = state.teams["team-sampaloc-fire-station"].model_copy(
        update={
            "base_location": {"type": "Point", "coordinates": [120.9931, 14.608]},
            "current_location": {"type": "Point", "coordinates": [120.9931, 14.608]},
        }
    )
    state.teams["team-central-sampaloc-algeciras"] = state.teams["team-central-sampaloc-algeciras"].model_copy(
        update={
            "base_location": {"type": "Point", "coordinates": [120.9922, 14.607]},
            "current_location": {"type": "Point", "coordinates": [120.9922, 14.607]},
        }
    )
    service = AssignmentService(
        InMemoryRequests(state),  # type: ignore[arg-type]
        InMemoryRescuers(state),  # type: ignore[arg-type]
        InMemoryAssignments(state),  # type: ignore[arg-type]
        FakeRoutingAdapter(
            {
                (120.9931, 14.608): 900.0,
                (120.9922, 14.607): 300.0,
            }
        ),  # type: ignore[arg-type]
    )

    assigned = await service.auto_assign_best_team("request-1", 1)

    assert assigned is not None
    assert assigned.request.status == "assigned"
    assert assigned.request.assigned_team_id == "team-central-sampaloc-algeciras"
    assert assigned.mission.team_id == "team-central-sampaloc-algeciras"
    assert assigned.mission.assigned_rescuer_id == "team-central-sampaloc-algeciras"
    assert assigned.mission.latest_route_result is not None
    assert assigned.mission.latest_route_result["distance_m"] == 300.0
    assert state.teams["team-sampaloc-fire-station"].availability == "available"
    assert state.teams["team-central-sampaloc-algeciras"].availability == "assigned"


@pytest.mark.asyncio
async def test_auto_assignment_leaves_request_pending_when_no_team_is_reachable(
    state: AssignmentState,
) -> None:
    class NoRouteAdapter:
        def evaluate(self, _payload: Any) -> NoRouteResponse:
            return NoRouteResponse(
                status="no-route",
                reason="fixture_no_path",
                warnings=["No route in the controlled test fixture."],
                scenario_timestamp="2026-09-21T04:00:00Z",
            )

    service = AssignmentService(
        InMemoryRequests(state),  # type: ignore[arg-type]
        InMemoryRescuers(state),  # type: ignore[arg-type]
        InMemoryAssignments(state),  # type: ignore[arg-type]
        NoRouteAdapter(),  # type: ignore[arg-type]
    )

    assigned = await service.auto_assign_best_team("request-1", 1)

    assert assigned is None
    assert state.requests["request-1"].status == "pending"
    assert state.requests["request-1"].mission_id is None
    assert state.missions == {}
