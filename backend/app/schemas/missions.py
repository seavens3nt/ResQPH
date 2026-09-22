from datetime import datetime, timezone
from html import escape
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.models.mission import MissionStatus
from app.models.mission_status_event import DemoRole, EventSource

WritableMissionStatus = Literal["assigned", "en-route", "arrived", "completed"]


class DemoActor(BaseModel):
    user_id: str
    role: DemoRole


class ErrorDetail(BaseModel):
    field: str
    reason: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class MissionStatusEventCreate(BaseModel):
    event_id: str = Field(min_length=1, max_length=128)
    new_status: WritableMissionStatus
    expected_mission_version: int = Field(ge=1)
    client_recorded_at: datetime | None = None
    source: EventSource = "online"
    note: str | None = Field(default=None, max_length=500)

    @field_validator("event_id")
    @classmethod
    def event_id_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("event_id must not be blank")
        return stripped

    @field_validator("note")
    @classmethod
    def sanitize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        sanitized = escape(value.strip(), quote=True)
        return sanitized or None


class MissionStatusEventResponse(BaseModel):
    event_id: str
    mission_id: str
    prior_status: MissionStatus
    new_status: MissionStatus
    actor_id: str
    actor_role: DemoRole
    source: EventSource
    server_recorded_at: datetime
    client_recorded_at: datetime | None = None
    note: str | None = None

    @field_serializer("server_recorded_at", "client_recorded_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return serialize_utc(value)


class MissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    request_id: str
    team_id: str
    assigned_rescuer_id: str | None = None
    status: MissionStatus
    version: int
    assigned_at: datetime
    created_at: datetime
    updated_at: datetime
    request_summary: dict[str, Any] | None = None
    latest_route_result: dict[str, Any] | None = None
    data_source: str = "synthetic"
    sync_status: str = "synced"
    completed_at: datetime | None = None
    status_history: list[MissionStatusEventResponse] = Field(default_factory=list)

    @field_serializer("assigned_at", "created_at", "updated_at", "completed_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return serialize_utc(value)


def parse_status_filter(status_filter: str | None) -> list[MissionStatus] | None:
    if status_filter is None or not status_filter.strip():
        return None

    allowed: set[MissionStatus] = {"assigned", "en-route", "arrived", "completed", "cancelled"}
    statuses: list[MissionStatus] = []
    for raw_status in status_filter.split(","):
        status = raw_status.strip()
        if status not in allowed:
            raise ValueError(status)
        statuses.append(status)  # type: ignore[arg-type]
    return statuses


def serialize_utc(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
