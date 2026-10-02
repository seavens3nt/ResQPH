"""
Shared pytest fixtures for the routing tests.

Adds routing/src to sys.path so tests can import resqph_routing without
installing the package first.
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import networkx as nx
import pytest
from shapely.geometry import LineString

_HERE = Path(__file__).resolve()
_ROUTING_ROOT = _HERE.parents[1]
_SRC = _ROUTING_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from resqph_routing import config


@pytest.fixture
def study_area_polygon():
    """U-Belt polygon as a shapely geometry."""
    from resqph_routing.extract import load_study_area_polygon

    return load_study_area_polygon()


@pytest.fixture
def committed_edges() -> gpd.GeoDataFrame:
    """Load the committed small joined fixture from data/samples/."""
    preview = config.SAMPLE_GRAPH_PREVIEW
    if not preview.exists():
        pytest.skip(
            f"Committed fixture not built yet: {preview}. "
            "Run: python routing/scripts/build_ubelt_graph.py"
        )
    return gpd.read_file(preview)


@pytest.fixture
def raw_graph():
    """Small deterministic OSM-like graph for offline normalization tests."""
    graph = nx.MultiDiGraph()
    graph.graph["crs"] = config.WGS84_CRS
    graph.add_node(1, x=120.9900, y=14.6000)
    graph.add_node(2, x=120.9910, y=14.6010)
    graph.add_node(3, x=120.9920, y=14.6020)
    graph.add_edge(
        1,
        2,
        key=0,
        highway="residential",
        osmid=101,
        geometry=LineString([(120.9900, 14.6000), (120.9910, 14.6010)]),
    )
    graph.add_edge(
        2,
        3,
        key=0,
        highway="primary",
        osmid=102,
        geometry=LineString([(120.9910, 14.6010), (120.9920, 14.6020)]),
    )
    return graph
