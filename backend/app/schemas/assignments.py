from pydantic import BaseModel, Field

from app.schemas.missions import MissionResponse
from app.schemas.rescue_requests import RescueRequestResponse


class AssignmentCreate(BaseModel):
    team_id: str = Field(min_length=1, max_length=128)
    expected_request_version: int = Field(ge=1)


class AssignmentResponse(BaseModel):
    mission: MissionResponse
    request: RescueRequestResponse
