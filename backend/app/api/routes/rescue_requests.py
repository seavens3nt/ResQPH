from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies.demo_role import get_demo_actor
from app.db.mongodb import get_database
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.common import DemoActor, ErrorEnvelope
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
    return RescueRequestService(
        RescueRequestRepository(database),
        AssignmentRepository(database),
    )


@router.post(
    "",
    response_model=RescueRequestResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERROR_RESPONSES,
)
async def create_rescue_request(
    payload: RescueRequestCreate,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
) -> RescueRequestResponse:
    return await service.create_request(payload, actor)


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
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[RescueRequestService, Depends(get_rescue_request_service)],
) -> RescueRequestResponse:
    return await service.cancel_request(request_id, payload, actor)
