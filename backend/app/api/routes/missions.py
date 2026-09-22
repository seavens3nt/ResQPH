from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.db.mongodb import get_database
from app.repositories.mission_status_events import MissionStatusEventRepository
from app.repositories.missions import MissionRepository
from app.schemas.missions import (
    DemoActor,
    ErrorEnvelope,
    MissionResponse,
    MissionStatusEventCreate,
    parse_status_filter,
)
from app.services.missions import MissionService, MissionServiceError

router = APIRouter(prefix="/missions", tags=["missions"])
_ALLOWED_DEMO_ROLES = {"citizen", "volunteer", "rescuer", "coordinator"}


def get_demo_actor(
    x_demo_user_id: Annotated[str | None, Header(alias="X-Demo-User-Id")] = None,
    x_demo_role: Annotated[str | None, Header(alias="X-Demo-Role")] = None,
) -> DemoActor:
    role = x_demo_role if x_demo_role in _ALLOWED_DEMO_ROLES else "citizen"
    return DemoActor(user_id=(x_demo_user_id or "").strip(), role=role)  # type: ignore[arg-type]


def get_mission_service() -> MissionService:
    database = get_database()
    return MissionService(
        MissionRepository(database),
        MissionStatusEventRepository(database),
    )


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


def error_response(exc: MissionServiceError, request_id: str | None = None) -> JSONResponse:
    envelope = ErrorEnvelope(
        error={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id or f"trace-{uuid4().hex}",
        }
    )
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump(mode="json"))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "reason": error["msg"],
        }
        for error in exc.errors()
    ]
    return error_response(
        MissionServiceError(422, "validation_error", "Request validation failed.", details),
        request_id=request.headers.get("X-Request-Id"),
    )
