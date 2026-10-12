"""Offline independent-oracle tests for directed station distance routing."""
import math

import networkx as nx
import pytest

from resqph_routing.astar import (
    NoRouteResult,
    RouteResult,
    find_shortest_distance_route,
)
from resqph_routing.endpoints import (
    attach_endpoints,
    nearest_attachments,
    physical_coverage_graph,
)
from resqph_routing.graph import GraphValidationError, build_graph


def edge(eid, source, target, start, end, length=100, **extra):
    return {"edge_id": eid, "from": source, "to": target, "base_cost": length / 5,
            "length_m": length, "travel_time_s": length / 5,
            "geometry": {"type": "LineString", "coordinates": [start, end]}, **extra}


def graph(edges, scenario=None):
    nodes = sorted({e[key] for e in edges for key in ("from", "to")})
    return build_graph([{"node_id": node} for node in nodes], edges, scenario=scenario)


def route(edges, origin, destination, scenario=None):
    coverage = graph(edges)
    eligible = graph(edges, scenario)
    origins = nearest_attachments(origin, coverage, 75)
    destinations = nearest_attachments(destination, coverage, 75)
    augmented = attach_endpoints(eligible, origins, destinations)
    result = find_shortest_distance_route(augmented, "@origin", "@destination")
    # Independent library and queue implementation; production remains package A*.
    oracle = nx.MultiDiGraph()
    oracle.add_nodes_from(augmented.nodes)
    for record in augmented.edge_index.values():
        oracle.add_edge(record.from_node, record.to_node, weight=record.length_m)
    try:
        expected = nx.shortest_path_length(oracle, "@origin", "@destination", weight="weight")
    except nx.NetworkXNoPath:
        assert isinstance(result, NoRouteResult)
    else:
        assert isinstance(result, RouteResult)
        assert result.total_cost == pytest.approx(expected)
    return result, origins, destinations


@pytest.mark.parametrize("reverse,expected", [(False, None), (True, 60)])
def test_same_edge_respects_one_way_and_partial_lengths(reverse, expected):
    a, b = (120.99, 14.60), (120.991, 14.60)
    edges = [edge("AB", "A", "B", a, b)]
    if reverse:
        edges.append(edge("BA", "B", "A", b, a))
    forward, _, _ = route(edges, (120.9902, 14.60), (120.9908, 14.60))
    assert forward.total_cost == pytest.approx(60)
    backward, _, _ = route(edges, (120.9908, 14.60), (120.9902, 14.60))
    if expected is None:
        assert isinstance(backward, NoRouteResult)
    else:
        assert backward.total_cost == pytest.approx(expected)


def test_blocked_nearest_road_does_not_jump_to_parallel_open_road():
    edges = [edge("AB", "A", "B", (120.99, 14.60), (120.991, 14.60)),
             edge("CD", "C", "D", (120.99, 14.6001), (120.991, 14.6001))]
    result, origins, _ = route(edges, (120.9902, 14.60), (120.9908, 14.60),
                               {"AB": {"passability": "impassable"}})
    assert {snap.edge_id for snap in origins} == {"AB"}
    assert isinstance(result, NoRouteResult)


def test_nearby_parallel_origins_remain_on_distinct_segments():
    edges = [edge("AB", "A", "B", (120.99, 14.60), (120.991, 14.60)),
             edge("CD", "C", "D", (120.99, 14.6001), (120.991, 14.6001))]
    coverage = graph(edges)
    assert {s.edge_id for s in nearest_attachments((120.9902, 14.60), coverage, 75)} == {"AB"}
    assert {s.edge_id for s in nearest_attachments((120.9902, 14.6001), coverage, 75)} == {"CD"}
    assert nearest_attachments((120.9902, 14.61), coverage, 75) == []


def test_directed_detour_and_blocked_edge_change_winner_not_straight_line():
    a, b, c, d = (120.99, 14.60), (120.991, 14.60), (120.991, 14.601), (120.99, 14.601)
    edges = [edge("AB", "A", "B", a, b), edge("BC", "B", "C", b, c),
             edge("CD", "C", "D", c, d), edge("DA", "D", "A", d, a),
             edge("BA", "B", "A", b, a)]
    near = (120.9908, 14.60)
    far = (120.99, 14.6008)
    target = (120.9901, 14.60)
    near_open, _, _ = route(edges, near, target)
    far_open, _, _ = route(edges, far, target)
    assert near_open.total_cost < far_open.total_cost
    near_blocked, _, _ = route(edges, near, target, {"BA": {"passability": "impassable"}})
    far_blocked, _, _ = route(edges, far, target, {"BA": {"passability": "impassable"}})
    assert near_blocked.total_cost > far_blocked.total_cost


@pytest.mark.parametrize("length", [None, -1, math.inf, math.nan, True, "100"])
def test_distance_never_falls_back_to_time_or_invalid_lengths(length):
    data = edge("AB", "A", "B", (120.99, 14.60), (120.991, 14.60))
    data["length_m"] = length
    g = graph([data])
    with pytest.raises(GraphValidationError):
        find_shortest_distance_route(g, "A", "B")


def test_exact_intersection_endpoints_do_not_insert_zero_cost_arcs():
    a, b, c = (120.99, 14.60), (120.991, 14.60), (120.992, 14.60)
    result, _, _ = route([edge("AB", "A", "B", a, b), edge("BC", "B", "C", b, c)],
                         a, b)
    assert result.total_cost == pytest.approx(100)

    result, _, _ = route([edge("AB", "A", "B", a, b), edge("BC", "B", "C", b, c)],
                         b, c)
    assert result.total_cost == pytest.approx(100)


def test_curved_edge_partial_geometry_retains_intermediate_corner():
    a, b, c = (120.99, 14.60), (120.991, 14.60), (120.991, 14.601)
    data = edge("AC", "A", "C", a, c, length=200)
    data["geometry"]["coordinates"] = [a, b, c]
    origin, destination = (120.9905, 14.60), (120.991, 14.6005)
    result, origins, destinations = route([data], origin, destination)
    assert result.total_cost == pytest.approx(100)
    augmented = attach_endpoints(graph([data]), origins, destinations)
    piece = augmented.get_edge(result.edge_ids[0])
    assert piece.geometry["coordinates"] == [list(origin), list(b), list(destination)]


def test_base_impassability_is_geometry_coverage_not_a_farther_road_fallback():
    blocked = edge("AB", "A", "B", (120.99, 14.60), (120.991, 14.60), passability="impassable")
    open_road = edge("CD", "C", "D", (120.99, 14.6001), (120.991, 14.6001))
    roads = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {**data, "from_node": data["from"], "to_node": data["to"]},
         "geometry": data["geometry"]} for data in (blocked, open_road)]}
    coverage = physical_coverage_graph(roads)
    origins = nearest_attachments((120.9902, 14.60), coverage, 75)
    destinations = nearest_attachments((120.9908, 14.60), coverage, 75)
    assert {snap.edge_id for snap in origins} == {"AB"}
    augmented = attach_endpoints(graph([blocked, open_road]), origins, destinations)
    assert isinstance(find_shortest_distance_route(augmented, "@origin", "@destination"), NoRouteResult)
