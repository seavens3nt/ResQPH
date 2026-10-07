from datetime import datetime, timezone
from uuid import uuid4

from app.models.rescue_request import RequestStatus, RequestStatusHistory, RescueRequest
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.common import DemoActor, ServiceError
from app.schemas.rescue_requests import (
    RescueRequestCancel,
    RescueRequestCreate,
    RescueRequestListResponse,
    RescueRequestResponse,
)
from app.services.assignments import AssignmentService
from pymongo.errors import PyMongoError

_REQUEST_STATUSES: set[str] = {
    "pending",
    "assigned",
    "en-route",
    "arrived",
    "completed",
    "cancelled",
}


class RescueRequestService:
    def __init__(
        self,
        requests: RescueRequestRepository,
        assignments: AssignmentRepository,
        auto_assignment: AssignmentService | None = None,
    ) -> None:
        self._requests = requests
        self._assignments = assignments
        self._auto_assignment = auto_assignment

    async def create_request(
        self,
        payload: RescueRequestCreate,
        actor: DemoActor,
    ) -> RescueRequestResponse:
        self._require_role(actor, {"citizen"})
        recorded_at = utc_now()
        request = RescueRequest(
            id=f"request-{uuid4().hex}",
            citizen_id=actor.user_id,
            location=payload.location.model_dump(),
            headcount=payload.headcount,
            vulnerabilities=payload.vulnerabilities,
            medical_needs=payload.medical_needs,
            medical_details=payload.medical_details,
            reported_flood_level=payload.reported_flood_level,
            situation_summary=payload.situation_summary,
            status="pending",
            version=1,
            created_at=recorded_at,
            updated_at=recorded_at,
            status_history=[
                RequestStatusHistory(
                    status="pending",
                    occurred_at=recorded_at,
                    note="Synthetic rescue request accepted",
                )
            ],
        )
        try:
            created = await self._requests.create(request)
        except PyMongoError as exc:
            raise database_unavailable() from exc

        if self._auto_assignment is not None:
            try:
                assigned = await self._auto_assignment.auto_assign_best_team(
                    created.id,
                    created.version,
                )
            except ServiceError as exc:
                if exc.status_code >= 500:
                    return RescueRequestResponse.model_validate(created.model_dump())
                if exc.code not in {
                    "request_not_pending",
                    "stale_request_version",
                    "team_unavailable",
                    "team_unreachable",
                    "duplicate_assignment",
                    "assignment_conflict",
                }:
                    raise
            else:
                if assigned is not None:
                    return assigned.request

        return RescueRequestResponse.model_validate(created.model_dump())

    async def list_requests(
        self,
        *,
        actor: DemoActor,
        status_filter: str | None,
        limit: int,
        cursor: str | None,
    ) -> RescueRequestListResponse:
        status = parse_request_status(status_filter)
        if actor.role == "citizen":
            citizen_id = actor.user_id
        elif actor.role == "coordinator":
            citizen_id = None
        else:
            raise ServiceError(
                403,
                "forbidden",
                "Simulated role is not allowed to list rescue requests.",
                [{"field": "X-Demo-Role", "reason": "expected citizen or coordinator"}],
            )

        try:
            requests, next_cursor, total = await self._requests.list_visible(
                citizen_id=citizen_id,
                status=status,
                limit=limit,
                cursor=cursor,
            )
        except ValueError as exc:
            raise ServiceError(
                422,
                "invalid_cursor",
                "The rescue-request cursor is invalid.",
                [{"field": "cursor", "reason": str(exc)}],
            ) from exc
        except PyMongoError as exc:
            raise database_unavailable() from exc

        return RescueRequestListResponse(
            items=[
                RescueRequestResponse.model_validate(request.model_dump())
                for request in requests
            ],
            cursor=next_cursor,
            next_cursor=next_cursor,
            total=total,
        )

    async def get_request(
        self,
        request_id: str,
        actor: DemoActor,
    ) -> RescueRequestResponse:
        try:
            request = await self._requests.get_by_id(request_id)
        except PyMongoError as exc:
            raise database_unavailable() from exc
        if request is None:
            raise ServiceError(
                404, "request_not_found", "Rescue request is unavailable."
            )

        if actor.role == "citizen" and request.citizen_id == actor.user_id:
            return RescueRequestResponse.model_validate(request.model_dump())
        if actor.role == "coordinator":
            return RescueRequestResponse.model_validate(request.model_dump())
        if actor.role == "rescuer":
            try:
                can_view = await self._assignments.rescuer_has_request(
                    actor.user_id,
                    request.id,
                )
            except PyMongoError as exc:
                raise database_unavailable() from exc
            if can_view:
                return RescueRequestResponse.model_validate(request.model_dump())
        if actor.role == "citizen" or actor.role == "rescuer":
            raise ServiceError(
                404, "request_not_found", "Rescue request is unavailable."
            )
        raise ServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to retrieve rescue requests.",
        )

    async def cancel_request(
        self,
        request_id: str,
        payload: RescueRequestCancel,
        actor: DemoActor,
    ) -> RescueRequestResponse:
        try:
            request = await self._requests.get_by_id(request_id)
        except PyMongoError as exc:
            raise database_unavailable() from exc
        if request is None:
            raise ServiceError(
                404, "request_not_found", "Rescue request is unavailable."
            )

        is_owner = actor.role == "citizen" and request.citizen_id == actor.user_id
        if not is_owner and actor.role != "coordinator":
            if actor.role == "citizen":
                raise ServiceError(
                    404, "request_not_found", "Rescue request is unavailable."
                )
            raise ServiceError(
                403,
                "forbidden",
                "Only the owning citizen or a coordinator may cancel a pending request.",
            )

        if request.version != payload.version:
            raise ServiceError(
                409,
                "stale_request_version",
                "Rescue request was not cancelled because the expected version is stale.",
                [
                    {
                        "field": "version",
                        "reason": f"current version is {request.version}",
                    }
                ],
            )
        if request.status != "pending" or request.mission_id is not None:
            raise ServiceError(
                409,
                "request_not_pending",
                "Only a pending unassigned rescue request may be cancelled by this operation.",
            )

        try:
            updated = await self._requests.cancel_pending_if_current(
                request_id=request_id,
                expected_version=payload.version,
                reason=payload.reason,
                cancelled_at=utc_now(),
            )
        except PyMongoError as exc:
            raise database_unavailable() from exc
        if updated is None:
            raise ServiceError(
                409,
                "request_conflict",
                "Rescue request changed before cancellation could be stored.",
            )
        return RescueRequestResponse.model_validate(updated.model_dump())

    @staticmethod
    def _require_role(actor: DemoActor, roles: set[str]) -> None:
        if actor.role not in roles:
            raise ServiceError(
                403,
                "forbidden",
                "Simulated role is not allowed to perform this operation.",
                [
                    {
                        "field": "X-Demo-Role",
                        "reason": f"expected {' or '.join(sorted(roles))}",
                    }
                ],
            )


def parse_request_status(value: str | None) -> RequestStatus | None:
    if value is None or not value.strip():
        return None
    normalized = value.strip()
    if normalized not in _REQUEST_STATUSES:
        raise ServiceError(
            422,
            "invalid_status_filter",
            "Rescue-request status filter contains an unsupported value.",
            [{"field": "status", "reason": f"unsupported status {normalized}"}],
        )
    return normalized  # type: ignore[return-value]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def database_unavailable() -> ServiceError:
    return ServiceError(
        503,
        "database_unavailable",
        "The rescue-request database is unavailable.",
    )
