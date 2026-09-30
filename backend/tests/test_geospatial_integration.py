from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.integrations.geospatial import (
    BASELINE_CONTRACT_REVISION,
    SUPPORTED_SCHEMA_VERSION,
    GeospatialFixtureConfig,
    load_geospatial_fixtures,
)
from app.schemas.geospatial import GeospatialFixtureBundle, GeospatialFixtureError

REPO_ROOT = Path(__file__).resolve().parents[2]
ROAD_SAMPLE = REPO_ROOT / "data" / "samples" / "road-edge.example.geojson"
FLOOD_SAMPLE = REPO_ROOT / "data" / "samples" / "flood-scenario.example.geojson"


def test_locked_baseline_samples_load_successfully() -> None:
    bundle = load_geospatial_fixtures()

    assert_geospatial_contract(bundle)
    assert bundle.contract_revision == BASELINE_CONTRACT_REVISION
    assert bundle.version_source == "baseline_compatibility"
    assert bundle.road_edges.schema_version is None
    assert bundle.flood_scenario.schema_version is None

    road = bundle.road_edges.features[0]
    flood = bundle.flood_scenario.features[0]
    assert road.properties.edge_id == "edge-demo-001"
    assert road.properties.observed_at == "2026-09-21T04:00:00Z"
    assert bundle.road_edges.fixture_notice == (
        "Synthetic contract fixture; not validated real-world road or flood data."
    )
    assert flood.properties.edge_id == "edge-demo-001"
    assert flood.properties.scenario_timestamp == "2026-09-22T00:00:00Z"
    assert bundle.flood_scenario.scenario.scenario_id == "scenario-controlled-001"
    assert bundle.flood_scenario.scenario.study_area_id == "ubelt-pilot-v1"
    assert bundle.flood_scenario.fixture_notice == (
        "Synthetic academic scenario; not live or historical flood evidence."
    )


def assert_geospatial_contract(bundle: GeospatialFixtureBundle) -> None:
    assert bundle.road_edges.type == "FeatureCollection"
    assert bundle.flood_scenario.type == "FeatureCollection"
    assert bundle.road_edges.features
    assert bundle.flood_scenario.features
    assert {edge.properties.edge_id for edge in bundle.road_edges.features}
    for edge in bundle.road_edges.features:
        assert edge.geometry.type == "LineString"
        assert len(edge.geometry.coordinates) >= 2
    for flood in bundle.flood_scenario.features:
        assert flood.geometry.type == "LineString"
        assert flood.properties.scenario_id == bundle.flood_scenario.scenario.scenario_id


def test_repository_relative_loading_works_from_different_cwd(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)

    bundle = load_geospatial_fixtures()

    assert bundle.road_edges.features[0].properties.edge_id == "edge-demo-001"


@pytest.mark.parametrize("missing_kind", ["road", "flood"])
def test_missing_fixture_file_has_stable_error_code(
    tmp_path: Path,
    missing_kind: str,
) -> None:
    config = GeospatialFixtureConfig.baseline_compatibility(
        road_path=tmp_path / "missing-road.geojson"
        if missing_kind == "road"
        else ROAD_SAMPLE,
        flood_path=tmp_path / "missing-flood.geojson"
        if missing_kind == "flood"
        else FLOOD_SAMPLE,
    )

    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(config)

    assert_error(exc_info.value, "fixture_missing", missing_kind)


def test_malformed_json_has_stable_error_code(tmp_path: Path) -> None:
    road_path = tmp_path / "road.geojson"
    road_path.write_text("{not-json", encoding="utf-8")
    config = GeospatialFixtureConfig.baseline_compatibility(
        road_path=road_path,
        flood_path=FLOOD_SAMPLE,
    )

    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(config)

    assert_error(exc_info.value, "malformed_json", "road")


def test_missing_required_property_is_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    del road["features"][0]["properties"]["edge_id"]

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(error, "invalid_properties", "road.features[0].properties.edge_id")


def test_invalid_geometry_type_is_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["features"][0]["geometry"]["type"] = "Point"

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(error, "invalid_geometry", "road.features[0].geometry.type")


@pytest.mark.parametrize(
    ("coordinates", "expected_detail"),
    [
        ([[120.994, 14.6035]], "expected at least two positions"),
        ([[120.994], [120.9946, 14.6042]], "expected [longitude, latitude]"),
    ],
)
def test_malformed_coordinate_structure_is_rejected(
    tmp_path: Path,
    coordinates: list[list[float]],
    expected_detail: str,
) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["features"][0]["geometry"]["coordinates"] = coordinates

    error = load_with_mutation(tmp_path, road, flood)

    assert error.code == "invalid_geometry"
    assert expected_detail in error.details[0].reason


@pytest.mark.parametrize(
    ("coordinate", "expected_reason"),
    [
        ([14.6035, 120.994], "expected [longitude, latitude]"),
        ([121.5, 14.6035], "expected coordinates inside ubelt-pilot-v1"),
        ([float("inf"), 14.6035], "expected finite numeric longitude/latitude"),
        ([True, 14.6035], "expected finite numeric longitude/latitude"),
    ],
)
def test_invalid_coordinates_are_rejected(
    tmp_path: Path,
    coordinate: list[Any],
    expected_reason: str,
) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["features"][0]["geometry"]["coordinates"][0] = coordinate

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(error, "invalid_geometry", "road.features[0].geometry.coordinates[0]")
    assert error.details[0].reason == expected_reason


def test_duplicate_road_edge_ids_are_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["features"].append(json.loads(json.dumps(road["features"][0])))

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(error, "duplicate_id", "road.features[1].properties.edge_id")
    assert "edge-demo-001" in error.details[0].reason


def test_duplicate_flood_scenario_edge_records_are_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    flood["features"].append(json.loads(json.dumps(flood["features"][0])))

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(error, "duplicate_id", "flood.features[1].properties.edge_id")
    assert "scenario-controlled-001" in error.details[0].reason
    assert "edge-demo-001" in error.details[0].reason


def test_missing_version_requires_explicit_baseline_compatibility(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road_path, flood_path = dump_pair(tmp_path, road, flood)
    config = GeospatialFixtureConfig(road_path=road_path, flood_path=flood_path)

    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(config)

    assert_error(exc_info.value, "missing_version", "road.schema_version")
    assert_error(exc_info.value, "missing_version", "flood.schema_version")


def test_declared_supported_schema_version_loads(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["schema_version"] = SUPPORTED_SCHEMA_VERSION
    flood["schema_version"] = SUPPORTED_SCHEMA_VERSION
    road_path, flood_path = dump_pair(tmp_path, road, flood)

    bundle = load_geospatial_fixtures(
        GeospatialFixtureConfig(road_path=road_path, flood_path=flood_path)
    )

    assert bundle.version_source == "declared"
    assert bundle.contract_revision == SUPPORTED_SCHEMA_VERSION


def test_unsupported_configured_baseline_revision_is_rejected() -> None:
    config = GeospatialFixtureConfig.baseline_compatibility(
        contract_revision="unsupported-baseline"
    )

    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(config)

    assert_error(exc_info.value, "incompatible_version", "config.contract_revision")


def test_incompatible_declared_schema_version_is_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    road["schema_version"] = "future-v999"
    flood["schema_version"] = SUPPORTED_SCHEMA_VERSION
    road_path, flood_path = dump_pair(tmp_path, road, flood)

    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(
            GeospatialFixtureConfig(road_path=road_path, flood_path=flood_path)
        )

    assert_error(exc_info.value, "incompatible_version", "road.schema_version")
    assert "future-v999" in exc_info.value.details[0].reason


def test_inconsistent_flood_scenario_metadata_is_rejected(tmp_path: Path) -> None:
    road, flood = write_mutated_samples(tmp_path)
    flood["features"][0]["properties"]["scenario_timestamp"] = "2026-09-23T00:00:00Z"

    error = load_with_mutation(tmp_path, road, flood)

    assert_error(
        error,
        "invalid_properties",
        "flood.features[0].properties.scenario_timestamp",
    )


def write_mutated_samples(tmp_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    road = json.loads(ROAD_SAMPLE.read_text(encoding="utf-8"))
    flood = json.loads(FLOOD_SAMPLE.read_text(encoding="utf-8"))
    dump_pair(tmp_path, road, flood)
    return road, flood


def dump_pair(
    tmp_path: Path,
    road: dict[str, Any],
    flood: dict[str, Any],
) -> tuple[Path, Path]:
    road_path = tmp_path / "road.geojson"
    flood_path = tmp_path / "flood.geojson"
    road_path.write_text(json.dumps(road), encoding="utf-8")
    flood_path.write_text(json.dumps(flood), encoding="utf-8")
    return road_path, flood_path


def load_with_mutation(
    tmp_path: Path,
    road: dict[str, Any],
    flood: dict[str, Any],
) -> GeospatialFixtureError:
    road_path, flood_path = dump_pair(tmp_path, road, flood)
    config = GeospatialFixtureConfig.baseline_compatibility(
        road_path=road_path,
        flood_path=flood_path,
    )
    with pytest.raises(GeospatialFixtureError) as exc_info:
        load_geospatial_fixtures(config)
    return exc_info.value


def assert_error(
    error: GeospatialFixtureError,
    code: str,
    field_fragment: str,
) -> None:
    assert error.code == code
    assert any(field_fragment in detail.field for detail in error.details)
