from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, status

from app.api.dependencies.demo_role import get_demo_actor
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.db.mongodb import get_database
from app.repositories.assignments import AssignmentRepository
from app.repositories.dispatch_jobs import DispatchJobRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.common import DemoActor, ErrorEnvelope, ServiceError
from app.schemas.rescue_requests import (
    RescueRequestCancel,
    RescueRequestCreate,
    RescueRequestListResponse,
    RescueRequestResponse,
)
from app.services.rescue_requests import RescueRequestService

router = APIRouter(prefix="/rescue-requests", tags=["rescue requests"])
ERROR_RESPONSES = {
    403: {"model": ErrorEnvelope},
    404: {"model": ErrorEnvelope},
    409: {"model": ErrorEnvelope},
    422: {"model": ErrorEnvelope},
    503: {"model": ErrorEnvelope},
}


def get_rescue_request_service() -> RescueRequestService:
    database = get_database()
    requests = RescueRequestRepository(database)
    assignments = AssignmentRepository(database)
    return RescueRequestService(requests, assignments, DispatchJobRepository(database))


@router.post(
    "",
    response_model=RescueRequestResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERROR_RESPONSES,
)
async def create_rescue_request(
    payload: RescueRequestCreate,
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key", min_length=16, max_length=128)] = None,
) -> RescueRequestResponse:
    if actor.account_id and not idempotency_key:
        raise ServiceError(422, "idempotency_key_required", "A submission idempotency key is required.", [{"field": "Idempotency-Key", "reason": "missing or blank header"}])
    check_rate_limit(
        request,
        actor_id=actor.user_id,
        action="report-submission",
        limit=settings.report_rate_limit_per_minute,
    )
    return await service.create_request(payload, actor, idempotency_key)


@router.get(
    "",
    response_model=RescueRequestListResponse,
    responses=ERROR_RESPONSES,
)
async def list_rescue_requests(
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: Annotated[str | None, Query()] = None,
) -> RescueRequestListResponse:
    return await service.list_requests(
        actor=actor,
        status_filter=status_filter,
        limit=limit,
        cursor=cursor,
    )


@router.get(
    "/{request_id}",
    response_model=RescueRequestResponse,
    responses=ERROR_RESPONSES,
)
async def get_rescue_request(
    request_id: str,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
) -> RescueRequestResponse:
    return await service.get_request(request_id, actor)


@router.post(
    "/{request_id}/cancel",
    response_model=RescueRequestResponse,
    responses=ERROR_RESPONSES,
)
async def cancel_rescue_request(
    request_id: str,
    payload: RescueRequestCancel,
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
) -> RescueRequestResponse:
    check_rate_limit(
        request,
        actor_id=actor.user_id,
        action="request-cancel",
        limit=settings.simulation_control_rate_limit_per_minute,
    )
    return await service.cancel_request(request_id, payload, actor)
