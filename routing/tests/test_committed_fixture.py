"""
End-to-end checks on the committed small fixture.

These tests run without network access and without building the full
graph — they consume the files that the build script committed under
data/samples/.
"""
from __future__ import annotations

import hashlib
import json
import math

import geopandas as gpd
from resqph_routing import config
from resqph_routing.flood_join import load_scenario
from shapely.prepared import prep


def test_preview_fixture_exists(committed_edges):
    assert len(committed_edges) == 30
    assert committed_edges.crs is not None
    assert committed_edges.crs.to_string().upper() == config.WGS84_CRS


def test_preview_fixture_has_contract_columns(committed_edges):
    expected = {
        "edge_id", "from_node", "to_node", "length_m", "travel_time_s",
        "road_class", "flood_level", "flood_depth_cm", "passability",
        "observed_at", "source_type", "geometry",
    }
    assert expected == set(committed_edges.columns)


def test_preview_fixture_no_nulls_in_required_columns(committed_edges):
    required = [
        "edge_id", "from_node", "to_node", "length_m", "travel_time_s",
        "road_class", "flood_level", "passability", "source_type",
    ]
    assert not committed_edges[required].isna().any().any()


def test_preview_fixture_values_follow_contract(committed_edges):
    assert all(
        math.isfinite(value) and value > 0
        for value in committed_edges["length_m"]
    )
    assert all(
        math.isfinite(value) and value > 0
        for value in committed_edges["travel_time_s"]
    )
    assert set(committed_edges["flood_level"]).issubset(config.FLOOD_LEVELS)
    assert set(committed_edges["passability"]).issubset(
        config.PASSABILITY_VALUES
    )
    assert set(committed_edges["source_type"]).issubset(config.SOURCE_TYPES)


def test_preview_fixture_stays_inside_study_area(
    committed_edges,
    study_area_polygon,
):
    edges_m = committed_edges.to_crs(config.PROJECTED_CRS)
    buffered_area = (
        gpd.GeoSeries([study_area_polygon], crs=config.WGS84_CRS)
        .to_crs(config.PROJECTED_CRS)
        .iloc[0]
        .buffer(50)
    )
    prepared = prep(buffered_area)
    assert all(prepared.covers(geometry) for geometry in edges_m.geometry)


def test_preview_fixture_edge_ids_unique(committed_edges):
    assert committed_edges["edge_id"].is_unique


def test_preview_fixture_edge_ids_follow_format(committed_edges):
    pattern = r"^ubelt-v1:\d+:\d+:\d+$"
    assert committed_edges["edge_id"].str.match(pattern).all()


def test_scenario_fixture_loads():
    scenario = load_scenario(config.SAMPLE_FLOOD_FIXTURE)
    assert scenario["type"] == "FeatureCollection"
    assert scenario["scenario"]["scenario_id"] == "scenario-controlled-ubelt-001"
    assert scenario["scenario"]["study_area_id"] == config.STUDY_AREA_ID
    assert len(scenario["features"]) == 10


def test_scenario_fixture_records_reference_real_edges(committed_edges):
    scenario = load_scenario(config.SAMPLE_FLOOD_FIXTURE)
    known = set(committed_edges["edge_id"])
    for feature in scenario["features"]:
        assert feature["properties"]["edge_id"] in known


def test_scenario_fixture_records_match_declared_metadata():
    scenario = load_scenario(config.SAMPLE_FLOOD_FIXTURE)
    metadata = scenario["scenario"]
    for feature in scenario["features"]:
        properties = feature["properties"]
        assert properties["scenario_id"] == metadata["scenario_id"]
        assert properties["scenario_timestamp"] == metadata["scenario_timestamp"]
        assert properties["source_type"] == metadata["source_type"]


def test_scenario_fixture_is_deterministic():
    """Re-loading the committed scenario must return identical bytes content."""
    path = config.SAMPLE_FLOOD_FIXTURE
    a = json.loads(path.read_text(encoding="utf-8"))
    b = json.loads(path.read_text(encoding="utf-8"))
    assert a == b


def test_committed_fixture_checksums():
    expected = {
        config.SAMPLE_GRAPH_PREVIEW: (
            "b9c0c52f6d49515a763a2e674b3284bc0f6bdbd865ec0f8c8e0ad1f249ebce59"
        ),
        config.SAMPLE_FLOOD_FIXTURE: (
            "1db1866b51fb474e018f59d79ffba71bae3fbbc4f07ab06d4c0aa006eb703df4"
        ),
    }
    for path, checksum in expected.items():
        assert hashlib.sha256(path.read_bytes()).hexdigest() == checksum
