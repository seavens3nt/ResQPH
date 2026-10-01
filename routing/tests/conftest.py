"""
Shared pytest fixtures for the routing tests.

Adds routing/src to sys.path so tests can import resqph_routing without
installing the package first.
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import pytest

_HERE = Path(__file__).resolve()
_ROUTING_ROOT = _HERE.parents[1]
_SRC = _ROUTING_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from resqph_routing import config  # noqa: E402


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
    """Load the cached raw OSM graph. Skips if not built."""
    from resqph_routing.normalize import load_raw_graph

    if not config.RAW_OSM_CACHE.exists():
        pytest.skip(
            f"Raw graph cache not built yet: {config.RAW_OSM_CACHE}. "
            "Run: python routing/scripts/build_ubelt_graph.py"
        )
    return load_raw_graph()