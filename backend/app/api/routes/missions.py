from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.dependencies.demo_role import get_demo_actor
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.db.mongodb import get_database
from app.repositories.mission_status_events import MissionStatusEventRepository
from app.repositories.missions import MissionRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.missions import (
    DemoActor,
    ErrorEnvelope,
    MissionCancel,
    MissionResponse,
    MissionStatusEventCreate,
    MissionTrackingControl,
    MissionTrackingResponse,
    parse_status_filter,
)
from app.services.missions import MissionService, MissionServiceError

router = APIRouter(prefix="/missions", tags=["missions"])


def get_mission_service() -> MissionService:
    database = get_database()
    return MissionService(
        MissionRepository(database),
        MissionStatusEventRepository(database),
        RescueRequestRepository(database),
    )


@router.post("/{mission_id}/cancel", response_model=MissionResponse)
async def cancel_mission(
    mission_id: str,
    payload: MissionCancel,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionResponse | JSONResponse:
    try:
        return await service.cancel_mission(
            mission_id, payload.expected_mission_version, payload.reason, actor
        )
    except MissionServiceError as exc:
        return error_response(exc)


@router.get("", response_model=list[MissionResponse])
async def list_missions(
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
    assigned_to: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> list[MissionResponse] | JSONResponse:
    try:
        statuses = parse_status_filter(status)
        return await service.list_missions(actor, assigned_to, statuses)
    except ValueError as exc:
        return error_response(
            MissionServiceError(
                422,
                "invalid_status_filter",
                "Mission status filter contains an unsupported value.",
                [{"field": "status", "reason": f"unsupported status {exc.args[0]}"}],
            )
        )
    except MissionServiceError as exc:
        return error_response(exc)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: str,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionResponse | JSONResponse:
    try:
        return await service.get_mission(mission_id, actor)
    except MissionServiceError as exc:
        return error_response(exc)


@router.post("/{mission_id}/status-events", response_model=MissionResponse)
async def create_status_event(
    mission_id: str,
    payload: MissionStatusEventCreate,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionResponse | JSONResponse:
    try:
        return await service.create_status_event(mission_id, payload, actor)
    except MissionServiceError as exc:
        return error_response(exc)


@router.get("/{mission_id}/tracking", response_model=MissionTrackingResponse)
async def get_tracking(
    mission_id: str,
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionTrackingResponse | JSONResponse:
    try:
        check_rate_limit(
            request,
            actor_id=actor.user_id,
            action="tracking-read",
            limit=settings.tracking_rate_limit_per_minute,
        )
        return await service.get_tracking(mission_id, actor)
    except MissionServiceError as exc:
        return error_response(exc)


@router.post("/{mission_id}/tracking/control", response_model=MissionTrackingResponse)
async def control_tracking(
    mission_id: str,
    payload: MissionTrackingControl,
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionTrackingResponse | JSONResponse:
    try:
        check_rate_limit(
            request,
            actor_id=actor.user_id,
            action="tracking-control",
            limit=settings.simulation_control_rate_limit_per_minute,
        )
        return await service.control_tracking(mission_id, payload.action, actor)
    except MissionServiceError as exc:
        return error_response(exc)


def error_response(
    exc: MissionServiceError, request_id: str | None = None
) -> JSONResponse:
    envelope = ErrorEnvelope(
        error={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id or f"trace-{uuid4().hex}",
        }
    )
    return JSONResponse(
        status_code=exc.status_code, content=envelope.model_dump(mode="json")
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "reason": error["msg"],
        }
        for error in exc.errors()
    ]
    return error_response(
        MissionServiceError(
            422, "validation_error", "Request validation failed.", details
        ),
        request_id=request.headers.get("X-Request-Id"),
    )
