"""Tests for the validation module."""
from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import LineString, Polygon

from resqph_routing import config
from resqph_routing.validate import (
    REQUIRED_NON_NULL_COLUMNS,
    validate_edges,
)


@pytest.fixture
def clean_edges() -> gpd.GeoDataFrame:
    """Edges that should pass every check."""
    return gpd.GeoDataFrame(
        {
            "edge_id": ["e1", "e2"],
            "from_node": ["1", "2"],
            "to_node": ["2", "3"],
            "length_m": [100.0, 150.0],
            "travel_time_s": [20.0, 30.0],
            "road_class": ["residential", "tertiary"],
            "flood_level": ["none", "low"],
            "flood_depth_cm": [None, 10.0],
            "passability": ["passable", "restricted"],
            "observed_at": [None, "2026-10-01T00:00:00Z"],
            "source_type": ["controlled", "controlled"],
            "extraction_version": [config.EXTRACTION_VERSION] * 2,
        },
        geometry=[
            LineString([(120.99, 14.60), (120.991, 14.601)]),
            LineString([(120.991, 14.601), (120.992, 14.602)]),
        ],
        crs=config.WGS84_CRS,
    )


@pytest.fixture
def study_poly() -> Polygon:
    return Polygon([
        (120.98, 14.59),
        (121.01, 14.59),
        (121.01, 14.62),
        (120.98, 14.62),
        (120.98, 14.59),
    ])


def test_validation_passes_on_clean_edges(clean_edges, study_poly):
    report = validate_edges(clean_edges, study_area_polygon=study_poly)
    assert report.passed
    assert report.invalid_geometries == 0
    assert report.duplicate_edge_ids == 0
    assert report.wrong_schema_version == 0
    assert report.edges_outside_study_area == 0


def test_validation_detects_duplicate_edge_ids(clean_edges, study_poly):
    dup = clean_edges.copy()
    dup.loc[1, "edge_id"] = dup.loc[0, "edge_id"]
    report = validate_edges(dup, study_area_polygon=study_poly)
    assert not report.passed
    assert report.duplicate_edge_ids == 1


def test_validation_detects_wrong_schema_version(clean_edges, study_poly):
    bad = clean_edges.copy()
    bad.loc[0, "extraction_version"] = "old-version-v0"
    report = validate_edges(bad, study_area_polygon=study_poly)
    assert not report.passed
    assert report.wrong_schema_version == 1


def test_validation_detects_nulls_in_required_columns(clean_edges, study_poly):
    bad = clean_edges.copy()
    bad.loc[0, "road_class"] = None
    report = validate_edges(bad, study_area_polygon=study_poly)
    assert not report.passed
    assert report.null_required_counts.get("road_class") == 1


def test_validation_detects_out_of_bounds(clean_edges):
    """Edges far outside a tiny study area must be flagged."""
    tiny_poly = Polygon([
        (120.98, 14.59),
        (120.9805, 14.59),
        (120.9805, 14.5905),
        (120.98, 14.5905),
        (120.98, 14.59),
    ])
    report = validate_edges(clean_edges, study_area_polygon=tiny_poly)
    assert not report.passed
    assert report.edges_outside_study_area == len(clean_edges)


def test_validation_without_polygon_skips_bounds_check(clean_edges):
    report = validate_edges(clean_edges)  # no polygon
    assert report.edges_outside_study_area == 0
    assert report.passed


def test_required_non_null_columns_constant():
    """The constant must not accidentally include nullable fields."""
    assert "flood_depth_cm" not in REQUIRED_NON_NULL_COLUMNS
    assert "observed_at" not in REQUIRED_NON_NULL_COLUMNS
    assert "edge_id" in REQUIRED_NON_NULL_COLUMNS
    assert "length_m" in REQUIRED_NON_NULL_COLUMNS