"""Load and validate contract-compatible geospatial fixtures.

The default paths point to the reviewed ``ubelt-v1`` fixtures merged through
Issue #32. Those GeoJSON files do not carry a top-level ``schema_version``, so
their extraction version is enforced through the stable ``edge_id`` prefix.
The older one-edge contract examples remain available only through explicit
baseline compatibility for regression tests.
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.schemas.geospatial import (
    FloodScenarioCollection,
    GeoJsonObject,
    GeospatialErrorDetail,
    GeospatialFixtureBundle,
    GeospatialFixtureError,
    RoadEdgeCollection,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ROAD_FIXTURE = (
    REPOSITORY_ROOT / "data" / "samples" / "ubelt-station-network.geojson"
)
DEFAULT_FLOOD_FIXTURE = (
    REPOSITORY_ROOT / "data" / "samples" / "ubelt-v1-flood-join.geojson"
)
BASELINE_ROAD_FIXTURE = (
    REPOSITORY_ROOT / "data" / "samples" / "road-edge.example.geojson"
)
BASELINE_FLOOD_FIXTURE = (
    REPOSITORY_ROOT / "data" / "samples" / "flood-scenario.example.geojson"
)

SUPPORTED_SCHEMA_VERSION = "resqph-geospatial-fixture-v1"
AUTHORITATIVE_CONTRACT_REVISION = "ubelt-v1"
BASELINE_CONTRACT_REVISION = "0559a25"
STUDY_AREA_ID = "ubelt-pilot-v1"

STUDY_AREA_BOUNDS = {
    "west": 120.982,
    "south": 14.596,
    "east": 121.004,
    "north": 14.621,
}
FLOOD_LEVELS = {"none", "low", "moderate", "high", "severe"}
PASSABILITY_VALUES = {"passable", "restricted", "impassable"}
ROAD_SOURCE_TYPES = {"controlled", "historical", "verified_report"}
FLOOD_SOURCE_TYPES = {"controlled", "historical"}


@dataclass(frozen=True)
class GeospatialFixtureConfig:
    """Repository-relative fixture paths plus explicit version behavior."""

    road_path: Path | str = DEFAULT_ROAD_FIXTURE
    flood_path: Path | str = DEFAULT_FLOOD_FIXTURE
    contract_revision: str = AUTHORITATIVE_CONTRACT_REVISION
    allow_unversioned_contract: bool = True

    @classmethod
    def baseline_compatibility(
        cls,
        *,
        road_path: Path | str = BASELINE_ROAD_FIXTURE,
        flood_path: Path | str = BASELINE_FLOOD_FIXTURE,
        contract_revision: str = BASELINE_CONTRACT_REVISION,
    ) -> GeospatialFixtureConfig:
        """Allow the locked 0559a25 samples' missing in-file schema version."""

        return cls(
            road_path=road_path,
            flood_path=flood_path,
            contract_revision=contract_revision,
            allow_unversioned_contract=True,
        )


def load_geospatial_fixtures(
    config: GeospatialFixtureConfig | None = None,
) -> GeospatialFixtureBundle:
    """Read, validate, and return road/flood fixtures without joining them."""

    effective_config = config or GeospatialFixtureConfig()
    road_path = _resolve_fixture_path(effective_config.road_path)
    flood_path = _resolve_fixture_path(effective_config.flood_path)

    road_payload = _read_json_fixture(road_path, "road")
    flood_payload = _read_json_fixture(flood_path, "flood")

    version_source = _validate_versions(road_payload, flood_payload, effective_config)

    road_edges = _validate_road_collection(road_payload, road_path)
    flood_scenario = _validate_flood_collection(flood_payload, flood_path)
    _validate_cross_fixture_contract(
        road_edges,
        flood_scenario,
        effective_config,
        version_source,
    )

    return GeospatialFixtureBundle(
        contract_revision=effective_config.contract_revision,
        version_source=version_source,
        road_path=str(road_path),
        flood_path=str(flood_path),
        road_edges=road_edges,
        flood_scenario=flood_scenario,
    )


def _resolve_fixture_path(path: Path | str) -> Path:
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = REPOSITORY_ROOT / candidate
    return candidate.resolve()


def _read_json_fixture(path: Path, fixture_kind: str) -> GeoJsonObject:
    if not path.is_file():
        raise GeospatialFixtureError(
            "fixture_missing",
            "Geospatial fixture file is missing.",
            [{"field": fixture_kind, "reason": str(path)}],
        )

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise GeospatialFixtureError(
            "malformed_json",
            "Geospatial fixture is not valid JSON.",
            [
                {
                    "field": fixture_kind,
                    "reason": f"{path}: line {exc.lineno} column {exc.colno}",
                }
            ],
        ) from exc
    except OSError as exc:
        raise GeospatialFixtureError(
            "fixture_missing",
            "Geospatial fixture file cannot be read.",
            [{"field": fixture_kind, "reason": str(exc)}],
        ) from exc

    if not isinstance(payload, dict):
        raise GeospatialFixtureError(
            "invalid_fixture_structure",
            "Geospatial fixture root must be a JSON object.",
            [{"field": fixture_kind, "reason": "expected GeoJSON FeatureCollection"}],
        )
    return payload


def _validate_versions(
    road_payload: GeoJsonObject,
    flood_payload: GeoJsonObject,
    config: GeospatialFixtureConfig,
) -> str:
    declared = {
        "road.schema_version": road_payload.get("schema_version"),
        "flood.schema_version": flood_payload.get("schema_version"),
    }
    present_versions = {field: value for field, value in declared.items() if value}

    incompatible = [
        {"field": field, "reason": f"expected {SUPPORTED_SCHEMA_VERSION}, got {value}"}
        for field, value in present_versions.items()
        if value != SUPPORTED_SCHEMA_VERSION
    ]
    if incompatible:
        raise GeospatialFixtureError(
            "incompatible_version",
            "Geospatial fixture declares an unsupported schema version.",
            incompatible,
        )

    if len(present_versions) == 2:
        if config.contract_revision != SUPPORTED_SCHEMA_VERSION:
            raise GeospatialFixtureError(
                "incompatible_version",
                "Configured contract revision does not match declared schema version.",
                [
                    {
                        "field": "config.contract_revision",
                        "reason": (
                            f"expected {SUPPORTED_SCHEMA_VERSION}, "
                            f"got {config.contract_revision}"
                        ),
                    }
                ],
            )
        return "declared"
    if present_versions:
        missing = [
            {"field": field, "reason": "missing schema_version"}
            for field, value in declared.items()
            if not value
        ]
        raise GeospatialFixtureError(
            "missing_version",
            "Both geospatial fixtures must declare schema_version.",
            missing,
        )

    if not config.allow_unversioned_contract:
        raise GeospatialFixtureError(
            "missing_version",
            "Unversioned fixtures require an explicit contract revision.",
            [
                {"field": "road.schema_version", "reason": "missing schema_version"},
                {"field": "flood.schema_version", "reason": "missing schema_version"},
            ],
        )

    if config.contract_revision == AUTHORITATIVE_CONTRACT_REVISION:
        return "edge_id_prefix"
    if config.contract_revision == BASELINE_CONTRACT_REVISION:
        return "baseline_compatibility"

    raise GeospatialFixtureError(
        "incompatible_version",
        "Unsupported configured unversioned contract revision.",
        [
            {
                "field": "config.contract_revision",
                "reason": (
                    f"expected {AUTHORITATIVE_CONTRACT_REVISION} or "
                    f"{BASELINE_CONTRACT_REVISION}, got {config.contract_revision}"
                ),
            }
        ],
    )


def _validate_cross_fixture_contract(
    road_edges: RoadEdgeCollection,
    flood_scenario: FloodScenarioCollection,
    config: GeospatialFixtureConfig,
    version_source: str,
) -> None:
    """Enforce stable versioned IDs and flood-to-road referential integrity."""
    road_ids = {feature.properties.edge_id for feature in road_edges.features}

    if version_source == "edge_id_prefix":
        pattern = re.compile(
            rf"^{re.escape(config.contract_revision)}:\d+:\d+:\d+$"
        )
        invalid_ids = sorted(edge_id for edge_id in road_ids if not pattern.fullmatch(edge_id))
        invalid_ids.extend(
            sorted(
                feature.properties.edge_id
                for feature in flood_scenario.features
                if not pattern.fullmatch(feature.properties.edge_id)
            )
        )
        if invalid_ids:
            raise GeospatialFixtureError(
                "incompatible_version",
                "Geospatial edge_id values do not match the configured extraction version.",
                [
                    {
                        "field": "edge_id",
                        "reason": (
                            f"expected {config.contract_revision}:<u>:<v>:<key>, "
                            f"got {edge_id}"
                        ),
                    }
                    for edge_id in invalid_ids
                ],
            )

    unknown_ids = sorted(
        {
            feature.properties.edge_id
            for feature in flood_scenario.features
            if feature.properties.edge_id not in road_ids
        }
    )
    if unknown_ids:
        raise GeospatialFixtureError(
            "unknown_edge_id",
            "Flood fixture references edge_id values absent from the road fixture.",
            [
                {
                    "field": "flood.features.properties.edge_id",
                    "reason": f"unknown road edge_id {edge_id}",
                }
                for edge_id in unknown_ids
            ],
        )


def _validate_road_collection(payload: GeoJsonObject, path: Path) -> RoadEdgeCollection:
    _validate_feature_collection_shape(payload, "road")
    _validate_unique_road_ids(payload)
    _validate_features(payload, "road", path)

    try:
        return RoadEdgeCollection.model_validate(payload)
    except ValidationError as exc:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Road fixture properties do not match the contract.",
            _validation_details("road", exc),
        ) from exc


def _validate_flood_collection(
    payload: GeoJsonObject,
    path: Path,
) -> FloodScenarioCollection:
    _validate_feature_collection_shape(payload, "flood")
    scenario = payload.get("scenario")
    if not isinstance(scenario, dict):
        raise GeospatialFixtureError(
            "invalid_fixture_structure",
            "Flood fixture must include scenario metadata.",
            [{"field": "flood.scenario", "reason": "expected object"}],
        )

    _validate_unique_flood_records(payload)
    _validate_features(payload, "flood", path)
    _validate_scenario_consistency(payload)

    try:
        return FloodScenarioCollection.model_validate(payload)
    except ValidationError as exc:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Flood fixture properties do not match the contract.",
            _validation_details("flood", exc),
        ) from exc


def _validate_feature_collection_shape(payload: GeoJsonObject, fixture_kind: str) -> None:
    details: list[dict[str, str]] = []
    if payload.get("type") != "FeatureCollection":
        details.append(
            {
                "field": f"{fixture_kind}.type",
                "reason": "expected FeatureCollection",
            }
        )
    if not isinstance(payload.get("features"), list):
        details.append(
            {"field": f"{fixture_kind}.features", "reason": "expected list"}
        )
    if details:
        raise GeospatialFixtureError(
            "invalid_fixture_structure",
            "Geospatial fixture is not a valid FeatureCollection.",
            details,
        )


def _validate_features(payload: GeoJsonObject, fixture_kind: str, path: Path) -> None:
    for index, feature in enumerate(payload["features"]):
        field = f"{fixture_kind}.features[{index}]"
        if not isinstance(feature, dict):
            raise GeospatialFixtureError(
                "invalid_fixture_structure",
                "GeoJSON feature must be an object.",
                [{"field": field, "reason": f"{path}: expected object"}],
            )
        if feature.get("type") != "Feature":
            raise GeospatialFixtureError(
                "invalid_fixture_structure",
                "GeoJSON feature type must be Feature.",
                [{"field": f"{field}.type", "reason": "expected Feature"}],
            )
        properties = feature.get("properties")
        if not isinstance(properties, dict):
            raise GeospatialFixtureError(
                "invalid_properties",
                "GeoJSON feature properties must be an object.",
                [{"field": f"{field}.properties", "reason": "expected object"}],
            )
        _validate_required_properties(properties, fixture_kind, field)
        _validate_enum_properties(properties, fixture_kind, field)
        _validate_numeric_properties(properties, fixture_kind, field)
        _validate_timestamp_properties(properties, fixture_kind, field)
        _validate_geometry(feature.get("geometry"), field)


def _validate_required_properties(
    properties: dict[str, Any],
    fixture_kind: str,
    field: str,
) -> None:
    required = (
        [
            "edge_id",
            "from_node",
            "to_node",
            "length_m",
            "road_class",
            "flood_level",
            "passability",
            "observed_at",
            "source_type",
        ]
        if fixture_kind == "road"
        else [
            "scenario_id",
            "edge_id",
            "flood_level",
            "flood_depth_cm",
            "passability",
            "source_type",
            "scenario_timestamp",
            "reason",
        ]
    )
    missing = [
        {"field": f"{field}.properties.{name}", "reason": "required property missing"}
        for name in required
        if name not in properties
    ]
    if missing:
        raise GeospatialFixtureError(
            "invalid_properties",
            "GeoJSON feature is missing required properties.",
            missing,
        )

    blank_fields = [
        key
        for key in ("edge_id", "from_node", "to_node", "road_class", "scenario_id")
        if key in properties and not _non_blank_string(properties[key])
    ]
    if (
        fixture_kind == "flood"
        and "reason" in properties
        and not _non_blank_string(properties["reason"])
    ):
        blank_fields.append("reason")
    if blank_fields:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Stable identifiers and required text fields must be nonempty strings.",
            [
                {"field": f"{field}.properties.{name}", "reason": "expected nonempty string"}
                for name in blank_fields
            ],
        )


def _validate_enum_properties(
    properties: dict[str, Any],
    fixture_kind: str,
    field: str,
) -> None:
    source_values = ROAD_SOURCE_TYPES if fixture_kind == "road" else FLOOD_SOURCE_TYPES
    checks = {
        "flood_level": FLOOD_LEVELS,
        "passability": PASSABILITY_VALUES,
        "source_type": source_values,
    }
    invalid = [
        {
            "field": f"{field}.properties.{name}",
            "reason": f"expected one of {sorted(values)}",
        }
        for name, values in checks.items()
        if properties.get(name) not in values
    ]
    if invalid:
        raise GeospatialFixtureError(
            "invalid_properties",
            "GeoJSON feature has unsupported enum values.",
            invalid,
        )


def _validate_numeric_properties(
    properties: dict[str, Any],
    fixture_kind: str,
    field: str,
) -> None:
    if fixture_kind == "road":
        checks = ["length_m"]
        if properties.get("travel_time_s") is not None:
            checks.append("travel_time_s")
        if properties.get("flood_depth_cm") is not None:
            checks.append("flood_depth_cm")
    else:
        checks = (
            ["flood_depth_cm"]
            if properties.get("flood_depth_cm") is not None
            else []
        )

    invalid: list[dict[str, str]] = []
    for name in checks:
        value = properties.get(name)
        validator = (
            _coercible_finite_number
            if fixture_kind == "road" and name == "flood_depth_cm"
            else _finite_number
        )
        if not validator(value):
            invalid.append(
                {"field": f"{field}.properties.{name}", "reason": "expected finite number"}
            )
            continue
        requires_positive = fixture_kind == "road" and name in {
            "length_m",
            "travel_time_s",
        }
        if (requires_positive and float(value) <= 0) or (
            not requires_positive and float(value) < 0
        ):
            invalid.append(
                {
                    "field": f"{field}.properties.{name}",
                    "reason": (
                        "expected positive number"
                        if fixture_kind == "road"
                        else "expected non-negative number"
                    ),
                }
            )
    if invalid:
        raise GeospatialFixtureError(
            "invalid_properties",
            "GeoJSON feature numeric properties are invalid.",
            invalid,
        )


def _validate_timestamp_properties(
    properties: dict[str, Any],
    fixture_kind: str,
    field: str,
) -> None:
    timestamp_field = "observed_at" if fixture_kind == "road" else "scenario_timestamp"
    value = properties.get(timestamp_field)
    if fixture_kind == "road" and value is None:
        return
    if not _non_blank_string(value) or not _is_iso_timestamp(value):
        raise GeospatialFixtureError(
            "invalid_properties",
            "Timestamp properties must be ISO-8601 strings.",
            [
                {
                    "field": f"{field}.properties.{timestamp_field}",
                    "reason": "expected ISO-8601 timestamp",
                }
            ],
        )


def _validate_geometry(geometry: Any, field: str) -> None:
    if not isinstance(geometry, dict):
        raise GeospatialFixtureError(
            "invalid_geometry",
            "GeoJSON feature geometry must be an object.",
            [{"field": f"{field}.geometry", "reason": "expected object"}],
        )
    if geometry.get("type") != "LineString":
        raise GeospatialFixtureError(
            "invalid_geometry",
            "Only LineString geometry is supported for road/flood fixtures.",
            [{"field": f"{field}.geometry.type", "reason": "expected LineString"}],
        )
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise GeospatialFixtureError(
            "invalid_geometry",
            "LineString geometry must contain at least two positions.",
            [
                {
                    "field": f"{field}.geometry.coordinates",
                    "reason": "expected at least two positions",
                }
            ],
        )

    for index, position in enumerate(coordinates):
        _validate_position(position, f"{field}.geometry.coordinates[{index}]")


def _validate_position(position: Any, field: str) -> None:
    if not isinstance(position, list | tuple) or len(position) < 2:
        raise GeospatialFixtureError(
            "invalid_geometry",
            "GeoJSON positions must include longitude and latitude.",
            [{"field": field, "reason": "expected [longitude, latitude]"}],
        )
    longitude, latitude = position[0], position[1]
    if not _finite_number(longitude) or not _finite_number(latitude):
        raise GeospatialFixtureError(
            "invalid_geometry",
            "GeoJSON coordinates must be finite numbers.",
            [{"field": field, "reason": "expected finite numeric longitude/latitude"}],
        )

    lon = float(longitude)
    lat = float(latitude)
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise GeospatialFixtureError(
            "invalid_geometry",
            "GeoJSON coordinates must use longitude-first WGS 84 ranges.",
            [{"field": field, "reason": "expected [longitude, latitude]"}],
        )
    if not (
        STUDY_AREA_BOUNDS["west"] <= lon <= STUDY_AREA_BOUNDS["east"]
        and STUDY_AREA_BOUNDS["south"] <= lat <= STUDY_AREA_BOUNDS["north"]
    ):
        raise GeospatialFixtureError(
            "invalid_geometry",
            "GeoJSON coordinates must fall inside the approved study-area bounds.",
            [
                {
                    "field": field,
                    "reason": f"expected coordinates inside {STUDY_AREA_ID}",
                }
            ],
        )


def _validate_unique_road_ids(payload: GeoJsonObject) -> None:
    seen: dict[str, int] = {}
    for index, feature in enumerate(payload.get("features", [])):
        properties = feature.get("properties") if isinstance(feature, dict) else None
        edge_id = properties.get("edge_id") if isinstance(properties, dict) else None
        if not _non_blank_string(edge_id):
            continue
        if edge_id in seen:
            raise GeospatialFixtureError(
                "duplicate_id",
                "Road fixture contains duplicate edge_id values.",
                [
                    {
                        "field": f"road.features[{index}].properties.edge_id",
                        "reason": f"duplicates road.features[{seen[edge_id]}] value {edge_id}",
                    }
                ],
            )
        seen[edge_id] = index


def _validate_unique_flood_records(payload: GeoJsonObject) -> None:
    seen: dict[tuple[str, str], int] = {}
    for index, feature in enumerate(payload.get("features", [])):
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict):
            continue
        scenario_id = properties.get("scenario_id")
        edge_id = properties.get("edge_id")
        if not (_non_blank_string(scenario_id) and _non_blank_string(edge_id)):
            continue
        key = (str(scenario_id), str(edge_id))
        if key in seen:
            raise GeospatialFixtureError(
                "duplicate_id",
                "Flood fixture contains duplicate scenario/edge records.",
                [
                    {
                        "field": f"flood.features[{index}].properties.edge_id",
                        "reason": (
                            f"duplicates flood.features[{seen[key]}] "
                            f"scenario_id={scenario_id} edge_id={edge_id}"
                        ),
                    }
                ],
            )
        seen[key] = index


def _validate_scenario_consistency(payload: GeoJsonObject) -> None:
    scenario = payload["scenario"]
    required = ["scenario_id", "scenario_timestamp", "source_type", "study_area_id"]
    missing = [
        {"field": f"flood.scenario.{field}", "reason": "required property missing"}
        for field in required
        if field not in scenario
    ]
    if missing:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Flood scenario metadata is missing required properties.",
            missing,
        )
    if scenario.get("study_area_id") != STUDY_AREA_ID:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Flood scenario uses an unsupported study area.",
            [
                {
                    "field": "flood.scenario.study_area_id",
                    "reason": f"expected {STUDY_AREA_ID}",
                }
            ],
        )
    if scenario.get("source_type") not in FLOOD_SOURCE_TYPES:
        raise GeospatialFixtureError(
            "invalid_properties",
            "Flood scenario source_type is unsupported.",
            [
                {
                    "field": "flood.scenario.source_type",
                    "reason": f"expected one of {sorted(FLOOD_SOURCE_TYPES)}",
                }
            ],
        )
    if not _is_iso_timestamp(scenario.get("scenario_timestamp")):
        raise GeospatialFixtureError(
            "invalid_properties",
            "Flood scenario timestamp must be ISO-8601.",
            [
                {
                    "field": "flood.scenario.scenario_timestamp",
                    "reason": "expected ISO-8601 timestamp",
                }
            ],
        )

    for index, feature in enumerate(payload["features"]):
        properties = feature["properties"]
        for name in ("scenario_id", "scenario_timestamp", "source_type"):
            if properties.get(name) != scenario.get(name):
                raise GeospatialFixtureError(
                    "invalid_properties",
                    "Flood feature metadata must match root scenario metadata.",
                    [
                        {
                            "field": f"flood.features[{index}].properties.{name}",
                            "reason": f"expected {scenario.get(name)}",
                        }
                    ],
                )


def _validation_details(
    fixture_kind: str,
    exc: ValidationError,
) -> list[GeospatialErrorDetail]:
    return [
        GeospatialErrorDetail(
            field=f"{fixture_kind}." + ".".join(str(part) for part in error["loc"]),
            reason=str(error["msg"]),
        )
        for error in exc.errors()
    ]


def _non_blank_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _finite_number(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, int | float) and math.isfinite(value)


def _coercible_finite_number(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        return False
    try:
        return math.isfinite(float(value))
    except ValueError:
        return False


def _is_iso_timestamp(value: Any) -> bool:
    if not _non_blank_string(value):
        return False
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return False
    return parsed.tzinfo is not None
