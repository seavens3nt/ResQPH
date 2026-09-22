from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.mission import MissionStatus

DemoRole = Literal["citizen", "volunteer", "rescuer", "coordinator"]
EventSource = Literal["online", "offline-sync"]


class MissionStatusEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_id: str
    mission_id: str
    prior_status: MissionStatus
    new_status: MissionStatus
    actor_id: str
    actor_role: DemoRole
    source: EventSource
    server_recorded_at: datetime
    client_recorded_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)
