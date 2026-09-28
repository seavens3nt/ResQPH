from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

MissionStatus = Literal["assigned", "en-route", "arrived", "completed", "cancelled"]


class Mission(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    request_id: str
    team_id: str
    status: MissionStatus = "assigned"
    version: int = Field(ge=1)
    assigned_at: datetime
    created_at: datetime
    updated_at: datetime
    assigned_rescuer_id: str | None = None
    request_summary: dict[str, Any] | None = None
    latest_route_result: dict[str, Any] | None = None
    data_source: str = "synthetic"
    sync_status: str = "synced"
    completed_at: datetime | None = None
    completion_summary: str | None = None
    rescuer_notes: str | None = None

    def is_assigned_to(self, rescuer_id: str) -> bool:
        return self.assigned_rescuer_id == rescuer_id or self.team_id == rescuer_id
