from datetime import datetime
from html import escape

from app.core.study_area import STUDY_AREA_ID, point_is_inside_study_area
from app.models.rescue_request import FloodLevel, RequestStatus, Vulnerability
from app.schemas.common import serialize_utc
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_serializer,
    field_validator,
    model_validator,
)


def sanitize_text(value: str | None) -> str | None:
    if value is None:
        return None
    sanitized = escape(value.strip(), quote=True)
    return sanitized or None


class GeoPointInput(BaseModel):
    type: str
    coordinates: tuple[float, float]

    @model_validator(mode="after")
    def validate_geojson_point(self) -> "GeoPointInput":
        if self.type != "Point":
            raise ValueError("location point type must be Point")
        longitude, latitude = self.coordinates
        if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            raise ValueError("coordinates must be valid longitude and latitude")
        if not point_is_inside_study_area(longitude, latitude):
            raise ValueError(f"coordinates must be inside {STUDY_AREA_ID}")
        return self


class RequestLocationInput(BaseModel):
    address: str = Field(min_length=5, max_length=200)
    point: GeoPointInput
    landmark: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("address")
    @classmethod
    def sanitize_required_text(cls, value: str) -> str:
        sanitized = sanitize_text(value)
        if sanitized is None or len(sanitized) < 5:
            raise ValueError(
                "address must contain at least 5 non-whitespace characters"
            )
        return sanitized

    @field_validator("landmark", "description")
    @classmethod
    def sanitize_optional_text(cls, value: str | None) -> str | None:
        return sanitize_text(value)


class RescueRequestCreate(BaseModel):
    location: RequestLocationInput
    headcount: int = Field(ge=1, le=100)
    vulnerabilities: list[Vulnerability] = Field(default_factory=list, max_length=5)
    medical_needs: bool
    medical_details: str | None = Field(default=None, max_length=500)
    reported_flood_level: FloodLevel
    situation_summary: str | None = Field(default=None, max_length=1000)

    @field_validator("vulnerabilities")
    @classmethod
    def vulnerabilities_must_be_unique(
        cls,
        values: list[Vulnerability],
    ) -> list[Vulnerability]:
        if len(values) != len(set(values)):
            raise ValueError("vulnerabilities must not contain duplicates")
        return values

    @field_validator("medical_details", "situation_summary")
    @classmethod
    def sanitize_optional_text(cls, value: str | None) -> str | None:
        return sanitize_text(value)


class RescueRequestCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
    version: int = Field(ge=1)

    @field_validator("reason")
    @classmethod
    def sanitize_reason(cls, value: str) -> str:
        sanitized = sanitize_text(value)
        if sanitized is None or len(sanitized) < 3:
            raise ValueError("reason must contain at least 3 non-whitespace characters")
        return sanitized


class GeoPointResponse(BaseModel):
    type: str
    coordinates: tuple[float, float]


class RequestLocationResponse(BaseModel):
    address: str
    point: GeoPointResponse
    landmark: str | None = None
    description: str | None = None


class RequestStatusHistoryResponse(BaseModel):
    status: RequestStatus
    occurred_at: datetime
    note: str | None = None

    @field_serializer("occurred_at")
    def serialize_datetime(self, value: datetime) -> str:
        return serialize_utc(value) or ""


class RescueRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    citizen_id: str
    location: RequestLocationResponse
    headcount: int
    vulnerabilities: list[Vulnerability]
    medical_needs: bool
    medical_details: str | None = None
    reported_flood_level: FloodLevel
    situation_summary: str | None = None
    status: RequestStatus
    version: int
    created_at: datetime
    updated_at: datetime
    assigned_team_id: str | None = None
    mission_id: str | None = None
    status_history: list[RequestStatusHistoryResponse] = Field(default_factory=list)

    @computed_field
    @property
    def submitted_at(self) -> str:
        """Compatibility alias used by the coordinator queue."""
        return serialize_utc(self.created_at) or ""

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, value: datetime) -> str:
        return serialize_utc(value) or ""


class RescueRequestListResponse(BaseModel):
    items: list[RescueRequestResponse]
    cursor: str | None = None
    next_cursor: str | None = None
    total: int
