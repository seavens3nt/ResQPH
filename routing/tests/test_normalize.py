"""Tests for edge normalization."""
from __future__ import annotations

import re

import pytest

from resqph_routing import config
from resqph_routing.normalize import (
    CONTRACT_COLUMNS,
    _make_edge_id,
    _normalize_highway,
    _travel_time_seconds,
    normalize_edges,
    normalize_nodes,
    to_contract_frame,
)


def test_edge_id_format():
    assert _make_edge_id(1, 2, 0) == "ubelt-v1:1:2:0"
    assert _make_edge_id(999, 1000, 5) == "ubelt-v1:999:1000:5"


def test_normalize_highway_handles_strings():
    assert _normalize_highway("residential") == "residential"
    assert _normalize_highway("primary") == "primary"
    assert _normalize_highway("motorway_link") == "motorway"


def test_normalize_highway_handles_lists():
    assert _normalize_highway(["residential", "service"]) == "residential"
    assert _normalize_highway(["unknown", "tertiary"]) == "tertiary"


def test_normalize_highway_handles_none_and_unknown():
    assert _normalize_highway(None) == "unclassified"
    assert _normalize_highway("something_unknown") == "unclassified"


def test_travel_time_seconds_basic():
    # 100m at 36 km/h = 10 m/s → 10 s
    assert _travel_time_seconds(100.0, 36.0) == pytest.approx(10.0)
    # Zero speed is treated as infinite
    assert _travel_time_seconds(100.0, 0.0) == float("inf")


def test_normalize_edges_has_contract_columns(raw_graph):
    edges = normalize_edges(raw_graph)
    contract = to_contract_frame(edges)
    assert list(contract.columns) == CONTRACT_COLUMNS


def test_normalize_edges_produces_stable_ids(raw_graph):
    edges = normalize_edges(raw_graph)
    assert edges["edge_id"].is_unique
    pattern = re.compile(r"^ubelt-v1:\d+:\d+:\d+$")
    assert edges["edge_id"].str.match(pattern).all()


def test_normalize_edges_length_positive(raw_graph):
    edges = normalize_edges(raw_graph)
    assert (edges["length_m"] > 0).all()
    assert (edges["travel_time_s"] > 0).all()


def test_normalize_edges_road_class_values(raw_graph):
    edges = normalize_edges(raw_graph)
    valid_classes = set(config.NORMALIZED_ROAD_CLASS.values()) | {"unclassified"}
    assert set(edges["road_class"].unique()).issubset(valid_classes)


def test_normalize_edges_crs_is_wgs84(raw_graph):
    edges = normalize_edges(raw_graph)
    assert edges.crs is not None
    assert edges.crs.to_string().upper() == config.WGS84_CRS


def test_normalize_nodes_have_ids(raw_graph):
    nodes = normalize_nodes(raw_graph)
    assert "node_id" in nodes.columns
    assert nodes["node_id"].is_unique
    assert {"lat", "lon"}.issubset(nodes.columns)