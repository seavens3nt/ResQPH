"""Typed schemas for the backend geospatial fixture loader."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

FloodLevel = Literal["none", "low", "moderate", "high", "severe"]
Passability = Literal["passable", "restricted", "impassable"]
SourceType = Literal["controlled", "historical", "verified_report"]


class GeospatialErrorDetail(BaseModel):
    field: str
    reason: str


class GeospatialFixtureError(Exception):
    """Raised when a geospatial fixture cannot be loaded or validated."""

    def __init__(
        self,
        code: str,
        message: str,
        details: list[GeospatialErrorDetail | dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = [
            detail
            if isinstance(detail, GeospatialErrorDetail)
            else GeospatialErrorDetail(**detail)
            for detail in (details or [])
        ]


class LineStringGeometry(BaseModel):
    type: Literal["LineString"]
    coordinates: list[list[float]]


class RoadEdgeProperties(BaseModel):
    model_config = ConfigDict(extra="allow")

    edge_id: str = Field(min_length=1)
    from_node: str = Field(min_length=1)
    to_node: str = Field(min_length=1)
    length_m: float = Field(ge=0.0)
    travel_time_s: float | None = Field(default=None, ge=0.0)
    road_class: str = Field(min_length=1)
    flood_level: FloodLevel
    passability: Passability
    observed_at: str = Field(min_length=1)
    source_type: SourceType


class FloodScenarioMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")

    scenario_id: str = Field(min_length=1)
    scenario_timestamp: str = Field(min_length=1)
    source_type: Literal["controlled", "historical"]
    study_area_id: str = Field(min_length=1)


class FloodScenarioProperties(BaseModel):
    model_config = ConfigDict(extra="allow")

    scenario_id: str = Field(min_length=1)
    edge_id: str = Field(min_length=1)
    flood_level: FloodLevel
    flood_depth_cm: float | None = Field(ge=0.0)
    passability: Passability
    source_type: Literal["controlled", "historical"]
    scenario_timestamp: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class RoadEdgeFeature(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["Feature"]
    properties: RoadEdgeProperties
    geometry: LineStringGeometry


class FloodScenarioFeature(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["Feature"]
    properties: FloodScenarioProperties
    geometry: LineStringGeometry


class RoadEdgeCollection(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["FeatureCollection"]
    name: str | None = None
    fixture_notice: str | None = None
    schema_version: str | None = None
    features: list[RoadEdgeFeature]


class FloodScenarioCollection(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["FeatureCollection"]
    name: str | None = None
    fixture_notice: str | None = None
    schema_version: str | None = None
    scenario: FloodScenarioMetadata
    features: list[FloodScenarioFeature]


class GeospatialFixtureBundle(BaseModel):
    """Validated road and flood fixtures kept separate for later adapters."""

    contract_revision: str
    version_source: Literal["declared", "baseline_compatibility"]
    road_path: str
    flood_path: str
    road_edges: RoadEdgeCollection
    flood_scenario: FloodScenarioCollection


GeoJsonObject = dict[str, Any]
