from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies.demo_role import get_demo_actor
from app.db.mongodb import get_database
from app.models.rescuer import RescuerTeam
from app.schemas.common import DemoActor, ServiceError

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[RescuerTeam])
async def list_teams(
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
) -> list[RescuerTeam]:
    if actor.role != "coordinator":
        raise ServiceError(
            403, "forbidden", "Only a coordinator may list team availability."
        )
    return [
        RescuerTeam.model_validate(doc)
        async for doc in get_database()["rescuers"].find({}).sort("id", 1)
    ]
