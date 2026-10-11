from datetime import UTC, datetime
from math import isfinite
from uuid import uuid4

from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.errors import PyMongoError

from app.integrations.routing import RoutingAdapter, RoutingIntegrationError
from app.models.mission import Mission
from app.models.rescue_request import RescueRequest
from app.repositories.assignments import AssignmentRepository, DuplicateAssignmentError
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.schemas.assignments import (
    AssignmentCreate,
    AssignmentResponse,
    TeamRecommendationCandidate,
    TeamRecommendationExclusion,
    TeamRecommendationResponse,
)
from app.schemas.common import DemoActor, ServiceError
from app.schemas.missions import MissionResponse
from app.schemas.rescue_requests import RescueRequestResponse
from app.schemas.routing import RouteRequest
from app.services.stations import load_station_catalog, station_by_team_id


class AssignmentService:
    def __init__(
        self,
        requests: RescueRequestRepository,
        rescuers: RescuerRepository,
        assignments: AssignmentRepository,
        routing_adapter: RoutingAdapter | None = None,
    ) -> None:
        self._requests = requests
        self._rescuers = rescuers
        self._assignments = assignments
        self._routing = routing_adapter or RoutingAdapter()

    async def pending_assignment_reason(self) -> str:
        teams = await self._rescuers.list_all()
        stations = [team for team in teams if team.station_id]
        return "no_station_available" if not any(team.availability == "available" for team in stations) else "no_reachable_station"

    async def recommend_teams(
        self,
        request_id: str,
        actor: DemoActor,
    ) -> TeamRecommendationResponse:
        if actor.role != "coordinator":
            raise ServiceError(
                403,
                "forbidden",
                "Only a simulated coordinator may request team recommendations.",
                [{"field": "X-Demo-Role", "reason": "expected coordinator"}],
            )
        request = await self._requests.get_by_id(request_id)
        if request is None:
            raise ServiceError(404, "request_not_found", "Rescue request is unavailable.")
        if request.status != "pending" or request.mission_id is not None:
            raise ServiceError(
                409,
                "request_not_pending",
                "Recommendations are only available for pending unassigned requests.",
            )

        candidates, exclusions = await self._rank_eligible_teams(request)
        return TeamRecommendationResponse(
            request_id=request.id,
            scenario_id="scenario-controlled-ubelt-001",
            selection_mode="distance",
            fixture_notice=load_station_catalog()["fixture_notice"],
            candidates=candidates,
            exclusions=exclusions,
        )

    async def auto_assign_best_team(
        self,
        request_id: str,
        expected_request_version: int,
    ) -> AssignmentResponse | None:
        request = await self._requests.get_by_id(request_id)
        if request is None:
            raise ServiceError(404, "request_not_found", "Rescue request is unavailable.")
        if request.version != expected_request_version:
            raise ServiceError(
                409,
                "stale_request_version",
                "Automatic assignment was skipped because the request version changed.",
                [
                    {
                        "field": "expected_request_version",
                        "reason": f"current version is {request.version}",
                    }
                ],
            )
        if request.status != "pending" or request.mission_id is not None:
            raise ServiceError(
                409,
                "request_not_pending",
                "Automatic assignment is only available for pending unassigned requests.",
            )

        for _attempt in range(3):
            candidates, _ = await self._rank_eligible_teams(request)
            if not candidates:
                return None
            best = candidates[0]
            try:
                return await self._commit_assignment(
                    request_id,
                    AssignmentCreate(
                        team_id=best.team_id,
                        expected_request_version=expected_request_version,
                    ),
                    precomputed_route=best.route,
                    expected_team_version=best.team_version,
                )
            except ServiceError as exc:
                if exc.code != "team_unavailable":
                    raise
        return None

    async def _rank_eligible_teams(
        self,
        request: RescueRequest,
    ) -> tuple[list[TeamRecommendationCandidate], list[TeamRecommendationExclusion]]:
        teams = await self._rescuers.list_all()
        candidates: list[TeamRecommendationCandidate] = []
        exclusions: list[TeamRecommendationExclusion] = []
        for team in teams:
            station = station_by_team_id(team.id)
            if station is None or team.station_id != station["station_id"]:
                exclusions.append(
                    TeamRecommendationExclusion(
                        team_id=team.id,
                        team_name=team.team_name,
                        reason="legacy_team_requires_explicit_station_mapping",
                    )
                )
                continue
            if team.availability != "available":
                exclusions.append(
                    TeamRecommendationExclusion(
                        team_id=team.id,
                        team_name=team.team_name,
                        reason="team_unavailable",
                    )
                )
                continue
            origin = _team_point(team)
            if origin is None:
                location = team.current_location or team.base_location
                exclusions.append(
                    TeamRecommendationExclusion(
                        team_id=team.id,
                        team_name=team.team_name,
                        reason="malformed_simulated_position" if location else "missing_simulated_position",
                    )
                )
                continue
            origin_source = "current_location" if team.current_location else "base_location"
            route = self._with_origin_metadata(
                self._evaluate_team_route(origin, request.location.point.coordinates),
                origin,
                origin_source,
            )
            if route["status"] != "route-found":
                exclusions.append(
                    TeamRecommendationExclusion(
                        team_id=team.id,
                        team_name=team.team_name,
                        reason=route.get("reason", "no_route"),
                        details=route.get("warnings", []),
                    )
                )
                continue
            candidates.append(
                TeamRecommendationCandidate(
                    team_id=team.id,
                    station_id=team.station_id,
                    team_name=team.team_name,
                    station_name=station["name"] if station else None,
                    station_address=team.station_address,
                    availability=team.availability,
                    origin_source=origin_source,
                    routing_origin=list(origin),
                    road_distance_m=route["distance_m"],
                    estimated_travel_time_s=route["estimated_time_s"],
                    route_id=route["route_id"],
                    route=route,
                    team_version=team.version,
                    warnings=route.get("warnings", []),
                )
            )

        candidates.sort(
            key=lambda item: (
                item.road_distance_m,
                item.station_id or "",
                item.team_id,
            )
        )
        return candidates, exclusions

    async def assign_team(
        self,
        request_id: str,
        payload: AssignmentCreate,
        actor: DemoActor,
        precomputed_route: dict | None = None,
    ) -> AssignmentResponse:
        if actor.role != "coordinator":
            raise ServiceError(
                403,
                "forbidden",
                "Only a simulated coordinator may assign rescue teams.",
                [{"field": "X-Demo-Role", "reason": "expected coordinator"}],
            )

        request = await self._requests.get_by_id(request_id)
        team = await self._rescuers.get_by_id(payload.team_id)
        if request is None:
            raise ServiceError(404, "request_not_found", "Rescue request is unavailable.")
        if team is None or team.availability != "available":
            raise ServiceError(409, "team_unavailable", "The selected station is unavailable.")
        origin = _team_point(team)
        if origin is None:
            raise ServiceError(409, "team_unreachable", "The selected station has no valid simulated position.")
        origin_source = "current_location" if team.current_location else "base_location"
        route = self._with_origin_metadata(
            self._evaluate_team_route(origin, request.location.point.coordinates),
            origin,
            origin_source,
        )
        if route["status"] != "route-found":
            raise ServiceError(409, "team_unreachable", "The selected station has no valid route to the incident.")
        return await self._commit_assignment(
            request_id,
            payload,
            precomputed_route=precomputed_route or route,
            expected_team_version=team.version,
        )

    async def _commit_assignment(
        self,
        request_id: str,
        payload: AssignmentCreate,
        precomputed_route: dict | None = None,
        expected_team_version: int | None = None,
    ) -> AssignmentResponse:

        assigned_at = datetime.now(UTC)
        mission_id = f"mission-{uuid4().hex}"

        async def persist_assignment(
            session: AsyncClientSession,
        ) -> tuple[Mission, RescueRequestResponse]:
            request = await self._requests.get_by_id(request_id, session=session)
            if request is None:
                raise ServiceError(
                    404, "request_not_found", "Rescue request is unavailable."
                )
            if request.version != payload.expected_request_version:
                raise ServiceError(
                    409,
                    "stale_request_version",
                    "Assignment was rejected because the expected request version is stale.",
                    [
                        {
                            "field": "expected_request_version",
                            "reason": f"current version is {request.version}",
                        }
                    ],
                )
            if request.status != "pending" or request.mission_id is not None:
                raise ServiceError(
                    409,
                    "duplicate_assignment",
                    "Rescue request already has an active assignment or is no longer pending.",
                )

            team = await self._rescuers.get_by_id(payload.team_id, session=session)
            if team is None or team.availability != "available":
                raise ServiceError(
                    409,
                    "team_unavailable",
                    "The selected rescue team is unavailable.",
                    [{"field": "team_id", "reason": "missing or not available"}],
                )

            if not precomputed_route or precomputed_route.get("status") != "route-found":
                raise ServiceError(409, "route_not_available", "Assignment requires a precomputed reachable station route.")

            mission = Mission(
                id=mission_id,
                request_id=request.id,
                team_id=team.id,
                assigned_rescuer_id=team.id,
                status="assigned",
                version=1,
                assigned_at=assigned_at,
                created_at=assigned_at,
                updated_at=assigned_at,
                request_summary={
                    "location": request.location.model_dump(mode="json"),
                    "headcount": request.headcount,
                    "vulnerabilities": request.vulnerabilities,
                    "medical_needs": request.medical_needs,
                    "medical_details": request.medical_details,
                    "reported_flood_level": request.reported_flood_level,
                    "reported_severity": request.reported_severity,
                    "situation_summary": request.situation_summary,
                    "fixture_notice": "Synthetic academic demonstration data.",
                },
                latest_route_result=precomputed_route,
                station_id=team.station_id,
                data_source="synthetic",
            )

            updated_request = await self._requests.mark_assigned_if_current(
                request_id=request.id,
                expected_version=payload.expected_request_version,
                team_id=team.id,
                station_id=team.station_id,
                mission_id=mission.id,
                assigned_at=assigned_at,
                session=session,
            )
            if updated_request is None:
                raise ServiceError(
                    409,
                    "assignment_conflict",
                    "Rescue request changed before assignment could be stored.",
                )

            reserved_team = await self._rescuers.reserve_if_available(
                team_id=team.id,
                request_id=request.id,
                mission_id=mission.id,
                assigned_at=assigned_at,
                session=session,
                expected_version=expected_team_version,
            )
            if reserved_team is None:
                raise ServiceError(
                    409,
                    "team_unavailable",
                    "The selected rescue team became unavailable.",
                )

            await self._assignments.create_mission(mission, session=session)
            return mission, RescueRequestResponse.model_validate(
                updated_request.model_dump()
            )

        try:
            mission, request_response = await self._assignments.run_in_transaction(
                persist_assignment
            )
        except DuplicateAssignmentError as exc:
            raise ServiceError(
                409,
                "duplicate_assignment",
                "Rescue request already has an active assignment.",
            ) from exc
        except PyMongoError as exc:
            raise ServiceError(
                503,
                "database_unavailable",
                "Assignment could not be stored because the database is unavailable.",
            ) from exc

        return AssignmentResponse(
            mission=MissionResponse.model_validate(
                {**mission.model_dump(), "status_history": []}
            ),
            request=request_response,
        )

    def _evaluate_team_route(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
    ) -> dict:
        try:
            route = self._routing.evaluate(
                RouteRequest(
                    origin={"type": "Point", "coordinates": origin},
                    destination={"type": "Point", "coordinates": destination},
                    scenario_id="scenario-controlled-ubelt-001",
                    algorithm="astar",
                    include_ml_penalty=False,
                    selection_mode="distance",
                )
            )
        except RoutingIntegrationError as exc:
            raise ServiceError(
                503,
                exc.code,
                exc.message,
                exc.details,
            ) from exc
        return route.model_dump(mode="json")

    @staticmethod
    def _with_origin_metadata(
        route: dict,
        origin: tuple[float, float],
        source: str,
    ) -> dict:
        return {
            **route,
            "routing_origin": list(origin),
            "origin_source": source,
        }


def _team_point(team: object) -> tuple[float, float] | None:
    location = getattr(team, "current_location", None) or getattr(team, "base_location", None)
    if not isinstance(location, dict):
        return None
    coordinates = location.get("coordinates")
    if (
        not isinstance(coordinates, list | tuple)
        or len(coordinates) != 2
        or not all(type(value) in {int, float} for value in coordinates)
    ):
        return None
    longitude, latitude = float(coordinates[0]), float(coordinates[1])
    if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
        return None
    if not isfinite(longitude) or not isfinite(latitude):
        return None
    return longitude, latitude
