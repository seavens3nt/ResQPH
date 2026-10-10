from datetime import UTC, datetime
from uuid import uuid4

from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.errors import PyMongoError

from app.models.mission import Mission
from app.repositories.assignments import AssignmentRepository, DuplicateAssignmentError
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.schemas.assignments import AssignmentCreate, AssignmentResponse
from app.schemas.common import DemoActor, ServiceError
from app.schemas.missions import MissionResponse
from app.schemas.rescue_requests import RescueRequestResponse


class AssignmentService:
    def __init__(
        self,
        requests: RescueRequestRepository,
        rescuers: RescuerRepository,
        assignments: AssignmentRepository,
    ) -> None:
        self._requests = requests
        self._rescuers = rescuers
        self._assignments = assignments

    async def assign_team(
        self,
        request_id: str,
        payload: AssignmentCreate,
        actor: DemoActor,
    ) -> AssignmentResponse:
        if actor.role != "coordinator":
            raise ServiceError(
                403,
                "forbidden",
                "Only a simulated coordinator may assign rescue teams.",
                [{"field": "X-Demo-Role", "reason": "expected coordinator"}],
            )

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
                    "situation_summary": request.situation_summary,
                    "fixture_notice": "Synthetic academic demonstration data.",
                },
                data_source="synthetic",
            )

            updated_request = await self._requests.mark_assigned_if_current(
                request_id=request.id,
                expected_version=payload.expected_request_version,
                team_id=team.id,
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
