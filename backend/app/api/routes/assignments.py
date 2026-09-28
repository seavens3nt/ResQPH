from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies.demo_role import get_demo_actor
from app.db.mongodb import get_database
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.schemas.assignments import AssignmentCreate, AssignmentResponse
from app.schemas.common import DemoActor, ErrorEnvelope
from app.services.assignments import AssignmentService

router = APIRouter(prefix="/rescue-requests", tags=["assignments"])
ERROR_RESPONSES = {
    403: {"model": ErrorEnvelope},
    404: {"model": ErrorEnvelope},
    409: {"model": ErrorEnvelope},
    422: {"model": ErrorEnvelope},
    503: {"model": ErrorEnvelope},
}


def get_assignment_service() -> AssignmentService:
    database = get_database()
    return AssignmentService(
        RescueRequestRepository(database),
        RescuerRepository(database),
        AssignmentRepository(database),
    )


@router.post(
    "/{request_id}/assignment",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERROR_RESPONSES,
)
async def assign_rescue_team(
    request_id: str,
    payload: AssignmentCreate,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    service: Annotated[AssignmentService, Depends(get_assignment_service)],
) -> AssignmentResponse:
    return await service.assign_team(request_id, payload, actor)
