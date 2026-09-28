from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RequestStatus = Literal[
    "pending", "assigned", "en-route", "arrived", "completed", "cancelled"
]
FloodLevel = Literal["none", "low", "moderate", "high", "unknown"]
Vulnerability = Literal["infant", "senior", "mobility", "pregnant", "other"]


class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]


class RequestLocation(BaseModel):
    address: str
    point: GeoPoint
    landmark: str | None = None
    description: str | None = None


class RequestStatusHistory(BaseModel):
    status: RequestStatus
    occurred_at: datetime
    note: str | None = None


class RescueRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    citizen_id: str
    location: RequestLocation
    headcount: int = Field(ge=1, le=100)
    vulnerabilities: list[Vulnerability] = Field(default_factory=list)
    medical_needs: bool
    medical_details: str | None = None
    reported_flood_level: FloodLevel
    situation_summary: str | None = None
    status: RequestStatus = "pending"
    version: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime
    assigned_team_id: str | None = None
    mission_id: str | None = None
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    status_history: list[RequestStatusHistory] = Field(default_factory=list)
    data_source: Literal["synthetic"] = "synthetic"
