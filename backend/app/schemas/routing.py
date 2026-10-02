"""Pydantic contracts for the backend routing API boundary."""

from __future__ import annotations

import math
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator

from app.integrations.geospatial import STUDY_AREA_BOUNDS

RouteStatus = Literal["route-found", "no-route"]
RoutingWarning = str
ACCEPTED_CONTROLLED_SCENARIO_IDS = frozenset({"scenario-controlled-ubelt-001"})


def accepted_controlled_scenario_ids() -> frozenset[str]:
    """Return scenario IDs locked by the Team Phase 2 API contract.

    Request validation must not read runtime fixture files. The adapter loads and
    validates those inputs and reports a stable dependency error if unavailable.
    """

    return ACCEPTED_CONTROLLED_SCENARIO_IDS


class GeoJsonPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Point"]
    coordinates: list[float] = Field(min_length=2, max_length=2)

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_coordinates(cls, value: Any) -> list[float]:
        return _validate_position(value, "coordinates")


class LineStringGeometry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["LineString"]
    coordinates: list[list[float]] = Field(min_length=2)

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_linestring_coordinates(cls, value: Any) -> list[list[float]]:
        if not isinstance(value, list) or len(value) < 2:
            raise ValueError("coordinates must contain at least two positions")
        return [
            _validate_position(position, f"coordinates[{index}]")
            for index, position in enumerate(value)
        ]


class RouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    origin: GeoJsonPoint
    destination: GeoJsonPoint
    scenario_id: str = Field(min_length=1)
    algorithm: Literal["astar"] = "astar"
    include_ml_penalty: StrictBool = False

    @field_validator("scenario_id")
    @classmethod
    def validate_scenario_id(cls, value: str) -> str:
        accepted = accepted_controlled_scenario_ids()
        if value not in accepted:
            raise ValueError(
                f"scenario_id must be one of {', '.join(sorted(accepted))}"
            )
        return value


class CostBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base: float = Field(ge=0.0)
    deterministic_risk: float = Field(ge=0.0)
    ml_risk: float = Field(ge=0.0)

    @field_validator("base", "deterministic_risk", "ml_risk", mode="before")
    @classmethod
    def validate_finite_cost(cls, value: Any) -> float:
        return _validate_finite_number(value, "cost")


class RouteFoundResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fixture_notice: str | None = None
    status: Literal["route-found"]
    route_id: str = Field(min_length=1)
    algorithm: Literal["astar"]
    geometry: LineStringGeometry
    distance_m: float = Field(gt=0.0)
    estimated_time_s: float = Field(gt=0.0)
    total_cost: float = Field(ge=0.0)
    edge_ids: list[str] = Field(min_length=1)
    cost_breakdown: CostBreakdown
    fallback_used: bool
    warnings: list[RoutingWarning] = Field(min_length=1)
    explanation: str = Field(min_length=1)
    scenario_timestamp: str = Field(min_length=1)
    model_version: str | None

    @field_validator("distance_m", "estimated_time_s", "total_cost", mode="before")
    @classmethod
    def validate_finite_measure(cls, value: Any) -> float:
        return _validate_finite_number(value, "measure")

    @field_validator("edge_ids")
    @classmethod
    def validate_edge_ids(cls, value: list[str]) -> list[str]:
        if any(not isinstance(edge_id, str) or not edge_id.strip() for edge_id in value):
            raise ValueError("edge_ids must contain nonempty stable identifiers")
        return value

    @field_validator("warnings")
    @classmethod
    def validate_warnings(cls, value: list[str]) -> list[str]:
        if any(not isinstance(warning, str) or not warning.strip() for warning in value):
            raise ValueError("warnings must contain nonempty strings")
        return value

    @field_validator("scenario_timestamp")
    @classmethod
    def validate_scenario_timestamp(cls, value: str) -> str:
        return _validate_utc_timestamp(value)


class NoRouteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fixture_notice: str | None = None
    status: Literal["no-route"]
    reason: str = Field(min_length=1)
    warnings: list[RoutingWarning] = Field(min_length=1)
    scenario_timestamp: str = Field(min_length=1)

    @field_validator("warnings")
    @classmethod
    def validate_warnings(cls, value: list[str]) -> list[str]:
        if any(not isinstance(warning, str) or not warning.strip() for warning in value):
            raise ValueError("warnings must contain nonempty strings")
        return value

    @field_validator("scenario_timestamp")
    @classmethod
    def validate_scenario_timestamp(cls, value: str) -> str:
        return _validate_utc_timestamp(value)


RouteEvaluateResponse = Annotated[
    RouteFoundResponse | NoRouteResponse,
    Field(discriminator="status"),
]


def _validate_position(value: Any, field_name: str) -> list[float]:
    if not isinstance(value, list | tuple) or len(value) != 2:
        raise ValueError(f"{field_name} must be [longitude, latitude]")
    longitude = _validate_finite_number(value[0], "longitude")
    latitude = _validate_finite_number(value[1], "latitude")
    if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
        raise ValueError("coordinates must use longitude-first WGS 84 ranges")
    if not (
        STUDY_AREA_BOUNDS["west"] <= longitude <= STUDY_AREA_BOUNDS["east"]
        and STUDY_AREA_BOUNDS["south"] <= latitude <= STUDY_AREA_BOUNDS["north"]
    ):
        raise ValueError("coordinates must be inside ubelt-pilot-v1")
    return [longitude, latitude]


def _validate_finite_number(value: Any, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be a finite number")  # noqa: TRY004
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    return numeric


def _validate_utc_timestamp(value: str) -> str:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("scenario_timestamp must be an ISO 8601 UTC timestamp ending in Z")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as exc:
        raise ValueError(
            "scenario_timestamp must be an ISO 8601 UTC timestamp ending in Z"
        ) from exc
    if parsed.utcoffset() is None or parsed.utcoffset().total_seconds() != 0:
        raise ValueError("scenario_timestamp must be an ISO 8601 UTC timestamp ending in Z")
    return value
