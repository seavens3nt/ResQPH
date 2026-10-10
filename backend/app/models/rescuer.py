from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TeamAvailability = Literal["available", "assigned", "en-route", "on-scene"]


class RescuerTeam(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    team_name: str
    unit_type: str
    member_count: int = Field(ge=1)
    has_medical_unit: bool
    availability: TeamAvailability = "available"
    version: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime
    assigned_request_id: str | None = None
    assigned_mission_id: str | None = None
    station_id: str | None = None
    station_address: str | None = None
    base_location: dict[str, object] | None = None
    current_location: dict[str, object] | None = None
    position_updated_at: datetime | None = None
    data_source: Literal["synthetic"] = "synthetic"
