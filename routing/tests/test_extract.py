"""Tests for the study-area loader and graph stats helpers."""
from __future__ import annotations

import pytest

from resqph_routing import config
from resqph_routing.extract import (
    extract_osm_graph,
    graph_stats,
    load_study_area_polygon,
)


def test_study_area_polygon_loads():
    polygon = load_study_area_polygon()
    assert polygon.geom_type == "Polygon"
    assert not polygon.is_empty
    assert polygon.is_valid


def test_study_area_polygon_bounds_match_config():
    polygon = load_study_area_polygon()
    minx, miny, maxx, maxy = polygon.bounds

    west, south, east, north = config.STUDY_AREA_BOUNDS
    assert minx == pytest.approx(west, abs=1e-6)
    assert miny == pytest.approx(south, abs=1e-6)
    assert maxx == pytest.approx(east, abs=1e-6)
    assert maxy == pytest.approx(north, abs=1e-6)


def test_graph_stats_on_committed_edges(committed_edges):
    """The committed fixture is a GeoDataFrame, not a graph — build a small
    graph from it to exercise graph_stats without network access."""
    import networkx as nx

    graph = nx.MultiDiGraph()
    for _, row in committed_edges.iterrows():
        graph.add_edge(
            row["from_node"], row["to_node"], key=0, edge_id=row["edge_id"]
        )

    stats = graph_stats(graph)
    assert stats["nodes"] > 0
    assert stats["edges"] == len(committed_edges)
    assert stats["self_loops"] == 0
    assert "weakly_connected_components" in stats


def test_extract_uses_cache_without_network(monkeypatch, tmp_path, raw_graph):
    """An existing cache must be loaded without calling Overpass."""
    cache_path = tmp_path / "cached.graphml"
    cache_path.touch()
    monkeypatch.setattr(config, "RAW_OSM_CACHE", cache_path)

    import osmnx as ox

    monkeypatch.setattr(ox, "load_graphml", lambda path: raw_graph)
    monkeypatch.setattr(
        ox,
        "graph_from_polygon",
        lambda *args, **kwargs: pytest.fail("network extraction was attempted"),
    )

    graph = extract_osm_graph(force=False)
    assert graph is raw_graph
