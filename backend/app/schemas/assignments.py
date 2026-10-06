from app.schemas.missions import MissionResponse
from app.schemas.rescue_requests import RescueRequestResponse
from pydantic import BaseModel, Field


class AssignmentCreate(BaseModel):
    team_id: str = Field(min_length=1, max_length=128)
    expected_request_version: int = Field(ge=1)


class AssignmentResponse(BaseModel):
    mission: MissionResponse
    request: RescueRequestResponse


class TeamRecommendationCandidate(BaseModel):
    team_id: str
    station_id: str | None = None
    team_name: str
    station_name: str | None = None
    station_address: str | None = None
    availability: str
    road_distance_m: float
    estimated_travel_time_s: float
    route_id: str
    route: dict
    warnings: list[str] = Field(default_factory=list)


class TeamRecommendationExclusion(BaseModel):
    team_id: str
    team_name: str
    reason: str
    details: list[str] = Field(default_factory=list)


class TeamRecommendationResponse(BaseModel):
    request_id: str
    scenario_id: str
    selection_mode: str
    fixture_notice: str
    candidates: list[TeamRecommendationCandidate]
    exclusions: list[TeamRecommendationExclusion] = Field(default_factory=list)
