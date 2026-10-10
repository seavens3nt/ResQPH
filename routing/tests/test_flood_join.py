"""Tests for the flood-scenario join."""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import pytest
from resqph_routing import config
from resqph_routing.flood_join import (
    _validate_record,
    build_sample_scenario,
    join_scenario_to_edges,
)
from shapely.geometry import LineString


# ---------------------------------------------------------------------------
# Small in-memory edge fixture
# ---------------------------------------------------------------------------
@pytest.fixture
def tiny_edges() -> gpd.GeoDataFrame:
    """Three edges, edge_id sorted alphabetically."""
    return gpd.GeoDataFrame(
        {
            "edge_id": ["ubelt-v1:1:2:0", "ubelt-v1:2:3:0", "ubelt-v1:3:4:0"],
            "from_node": ["1", "2", "3"],
            "to_node": ["2", "3", "4"],
            "length_m": [100.0, 150.0, 80.0],
            "travel_time_s": [20.0, 30.0, 15.0],
            "road_class": ["residential", "tertiary", "primary"],
            "flood_level": ["none"] * 3,
            "flood_depth_cm": [None] * 3,
            "passability": ["passable"] * 3,
            "observed_at": [None] * 3,
            "source_type": ["controlled"] * 3,
            "extraction_version": [config.EXTRACTION_VERSION] * 3,
        },
        geometry=[
            LineString([(120.99, 14.60), (120.991, 14.601)]),
            LineString([(120.991, 14.601), (120.992, 14.602)]),
            LineString([(120.992, 14.602), (120.993, 14.603)]),
        ],
        crs=config.WGS84_CRS,
    )


def _write_scenario(path: Path, records: list[dict]) -> Path:
    payload = {
        "type": "FeatureCollection",
        "name": "test-scenario",
        "scenario": {
            "scenario_id": "scenario-test-001",
            "scenario_timestamp": "2026-10-01T00:00:00Z",
            "source_type": "controlled",
            "study_area_id": config.STUDY_AREA_ID,
        },
        "features": [
            {
                "type": "Feature",
                "properties": rec,
                "geometry": {"type": "Point", "coordinates": [120.99, 14.60]},
            }
            for rec in records
        ],
    }
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# Record validation
# ---------------------------------------------------------------------------
def test_validate_record_accepts_valid():
    rec = {
        "scenario_id": "x",
        "edge_id": "e1",
        "flood_level": "low",
        "flood_depth_cm": 10,
        "passability": "passable",
        "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z",
        "reason": "test",
    }
    assert _validate_record(rec) is None


def test_validate_record_rejects_missing_fields():
    assert _validate_record({}) is not None


def test_validate_record_rejects_bad_flood_level():
    rec = {
        "scenario_id": "x", "edge_id": "e1",
        "flood_level": "catastrophic", "flood_depth_cm": 10,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    assert _validate_record(rec) is not None


def test_validate_record_rejects_negative_depth():
    rec = {
        "scenario_id": "x", "edge_id": "e1",
        "flood_level": "low", "flood_depth_cm": -5,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    assert _validate_record(rec) is not None


@pytest.mark.parametrize("depth", [float("nan"), float("inf"), True])
def test_validate_record_rejects_non_finite_or_boolean_depth(depth):
    rec = {
        "scenario_id": "x", "edge_id": "e1",
        "flood_level": "low", "flood_depth_cm": depth,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    assert _validate_record(rec) is not None


# ---------------------------------------------------------------------------
# Join behaviour
# ---------------------------------------------------------------------------
def test_join_matches_valid_edges(tiny_edges, tmp_path):
    rec = {
        "scenario_id": "scenario-test-001", "edge_id": "ubelt-v1:1:2:0",
        "flood_level": "moderate", "flood_depth_cm": 30,
        "passability": "restricted", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    scenario_path = _write_scenario(tmp_path / "sc.json", [rec])

    joined, report = join_scenario_to_edges(tiny_edges, scenario_path)

    assert report.matched == 1
    assert report.unmatched == 2
    assert report.rejected_unknown_edge_id == 0

    row = joined.loc[joined["edge_id"] == "ubelt-v1:1:2:0"].iloc[0]
    assert row["flood_level"] == "moderate"
    assert row["passability"] == "restricted"
    assert row["flood_depth_cm"] == 30


def test_join_rejects_unknown_edge_id(tiny_edges, tmp_path):
    rec = {
        "scenario_id": "scenario-test-001", "edge_id": "ubelt-v1:999:999:0",
        "flood_level": "low", "flood_depth_cm": 10,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    scenario_path = _write_scenario(tmp_path / "sc.json", [rec])

    _, report = join_scenario_to_edges(tiny_edges, scenario_path)
    assert report.matched == 0
    assert report.rejected_unknown_edge_id == 1


def test_join_rejects_duplicate_edge_id(tiny_edges, tmp_path):
    rec = {
        "scenario_id": "scenario-test-001", "edge_id": "ubelt-v1:1:2:0",
        "flood_level": "low", "flood_depth_cm": 10,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    scenario_path = _write_scenario(tmp_path / "sc.json", [rec, rec])

    _, report = join_scenario_to_edges(tiny_edges, scenario_path)
    assert report.matched == 1
    assert report.rejected_duplicate_edge_id == 1


def test_join_unmatched_edges_keep_defaults(tiny_edges, tmp_path):
    rec = {
        "scenario_id": "scenario-test-001", "edge_id": "ubelt-v1:1:2:0",
        "flood_level": "high", "flood_depth_cm": 80,
        "passability": "restricted", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    scenario_path = _write_scenario(tmp_path / "sc.json", [rec])
    joined, _ = join_scenario_to_edges(tiny_edges, scenario_path)

    unmatched = joined.loc[joined["edge_id"] == "ubelt-v1:2:3:0"].iloc[0]
    assert unmatched["flood_level"] == "none"
    assert unmatched["passability"] == "passable"
    assert unmatched["observed_at"] is None


def test_join_missing_scenario_raises(tiny_edges, tmp_path):
    with pytest.raises(FileNotFoundError):
        join_scenario_to_edges(tiny_edges, tmp_path / "nope.json")


def test_join_study_area_mismatch_raises(tiny_edges, tmp_path):
    payload = {
        "type": "FeatureCollection",
        "name": "bad",
        "scenario": {
            "scenario_id": "x",
            "scenario_timestamp": "2026-10-01T00:00:00Z",
            "source_type": "controlled",
            "study_area_id": "somewhere-else-v1",
        },
        "features": [],
    }
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError, match="study_area_id"):
        join_scenario_to_edges(tiny_edges, path)


def test_join_invalid_metadata_timestamp_raises(tiny_edges, tmp_path):
    payload = {
        "type": "FeatureCollection",
        "name": "bad",
        "scenario": {
            "scenario_id": "x",
            "scenario_timestamp": "2026-10-01T00:00:00",
            "source_type": "controlled",
            "study_area_id": config.STUDY_AREA_ID,
        },
        "features": [],
    }
    path = tmp_path / "bad-timestamp.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError, match="timezone"):
        join_scenario_to_edges(tiny_edges, path)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("scenario_id", "different-scenario"),
        ("scenario_timestamp", "2026-10-02T00:00:00Z"),
        ("source_type", "historical"),
    ],
)
def test_join_rejects_record_metadata_mismatch(tiny_edges, tmp_path, field, value):
    rec = {
        "scenario_id": "scenario-test-001", "edge_id": "ubelt-v1:1:2:0",
        "flood_level": "low", "flood_depth_cm": 10,
        "passability": "passable", "source_type": "controlled",
        "scenario_timestamp": "2026-10-01T00:00:00Z", "reason": "test",
    }
    rec[field] = value
    scenario_path = _write_scenario(tmp_path / "sc.json", [rec])

    _, report = join_scenario_to_edges(tiny_edges, scenario_path)

    assert report.matched == 0
    assert report.rejected_invalid_record == 1


# ---------------------------------------------------------------------------
# Sample scenario builder
# ---------------------------------------------------------------------------
def test_build_sample_scenario_shape(tiny_edges):
    scenario = build_sample_scenario(tiny_edges, count=3)
    assert scenario["type"] == "FeatureCollection"
    assert "scenario" in scenario
    assert len(scenario["features"]) == 3


def test_build_sample_scenario_deterministic(tiny_edges):
    a = build_sample_scenario(tiny_edges, count=3)
    b = build_sample_scenario(tiny_edges, count=3)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def test_build_sample_scenario_references_real_edges(tiny_edges):
    scenario = build_sample_scenario(tiny_edges, count=3)
    known = set(tiny_edges["edge_id"])
    for feature in scenario["features"]:
        assert feature["properties"]["edge_id"] in known


def test_build_sample_scenario_rejects_zero_count(tiny_edges):
    with pytest.raises(ValueError):
        build_sample_scenario(tiny_edges, count=0)


def test_build_sample_scenario_rejects_count_larger_than_graph(tiny_edges):
    with pytest.raises(ValueError, match="cannot exceed"):
        build_sample_scenario(tiny_edges, count=4)
