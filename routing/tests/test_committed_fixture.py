"""
End-to-end checks on the committed small fixture.

These tests run without network access and without building the full
graph — they consume the files that the build script committed under
data/samples/.
"""
from __future__ import annotations

import json

from resqph_routing import config
from resqph_routing.flood_join import load_scenario


def test_preview_fixture_exists(committed_edges):
    assert len(committed_edges) > 0
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


def test_scenario_fixture_is_deterministic():
    """Re-loading the committed scenario must return identical bytes content."""
    path = config.SAMPLE_FLOOD_FIXTURE
    a = json.loads(path.read_text(encoding="utf-8"))
    b = json.loads(path.read_text(encoding="utf-8"))
    assert a == b