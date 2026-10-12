"""Nearest-road attachments with directed, proportional partial-edge travel.

Snap offsets are coverage diagnostics, never passable travel connectors. Only
coincident directed representations of the nearest physical segment are used;
an unreachable segment cannot be replaced by a more convenient distant road.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, replace
from itertools import pairwise

from resqph_routing.graph import (
    EdgeRecord,
    GraphValidationError,
    RoutingGraph,
    build_graph_from_geojson,
)

Point = tuple[float, float]


def physical_coverage_graph(roads: dict) -> RoutingGraph:
    """Geometry-only coverage, including roads blocked in their base attributes.

    Use this graph for attachments only. Travel always uses the separately
    built eligible graph, so a blocked nearest road stays unreachable.
    """
    payload = {**roads, "features": [
        {**feature, "properties": {**feature["properties"],
                                   "passability": "passable", "flood_level": "none"}}
        for feature in roads["features"]
    ]}
    return build_graph_from_geojson(payload)


@dataclass(frozen=True)
class RoadAttachment:
    edge_id: str
    point: Point
    offset_m: float
    fraction: float
    segment: int


def meters(left: Point, right: Point) -> float:
    scale = math.cos(math.radians((left[1] + right[1]) / 2))
    return math.hypot((right[0] - left[0]) * 111320 * scale,
                      (right[1] - left[1]) * 110540)


def nearest_attachments(point: Point, coverage: RoutingGraph, limit_m: float) -> list[RoadAttachment]:
    candidates: list[RoadAttachment] = []
    for edge in coverage.edge_index.values():
        if not isinstance(edge.geometry, dict):
            continue
        positions = [tuple(p[:2]) for p in edge.geometry.get("coordinates", [])]
        lengths = [meters(a, b) for a, b in pairwise(positions)]
        total = sum(lengths)
        if total <= 0:
            continue
        cumulative = 0.0
        for index, (a, b) in enumerate(pairwise(positions)):
            scale = math.cos(math.radians(point[1]))
            dx, dy = (b[0] - a[0]) * scale, b[1] - a[1]
            norm = dx * dx + dy * dy
            t = max(0.0, min(1.0, (((point[0] - a[0]) * scale * dx +
                                  (point[1] - a[1]) * dy) / norm))) if norm else 0.0
            snapped = (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))
            candidates.append(RoadAttachment(edge.edge_id, snapped, meters(point, snapped),
                                             (cumulative + t * lengths[index]) / total, index))
            cumulative += lengths[index]
    if not candidates:
        return []
    first = min(candidates, key=lambda s: (s.offset_m, s.edge_id, s.fraction))
    if first.offset_m > limit_m:
        return []
    # Centimetre tolerance only joins coincident projections, not parallel lanes.
    nearest = [s for s in candidates if abs(s.offset_m - first.offset_m) <= 0.01
               and meters(s.point, first.point) <= 0.01]
    unique = {s.edge_id: s for s in sorted(nearest, key=lambda s: (s.edge_id, s.offset_m))}
    return [unique[k] for k in sorted(unique)]


def _line_piece(edge: EdgeRecord, start: RoadAttachment | None,
                end: RoadAttachment | None) -> dict:
    positions = edge.geometry["coordinates"]
    left = start.segment + 1 if start else 0
    right = end.segment + 1 if end else len(positions)
    points = ([list(start.point)] if start else []) + [list(p[:2]) for p in positions[left:right]]
    if end:
        points.append(list(end.point))
    return {"type": "LineString", "coordinates": points}


def attach_endpoints(graph: RoutingGraph, origins: list[RoadAttachment],
                     destinations: list[RoadAttachment]) -> RoutingGraph:
    """Add request-local directed edge pieces, reusing the package's A* search."""
    result = RoutingGraph(adjacency={k: list(v) for k, v in graph.adjacency.items()},
                          edge_index=dict(graph.edge_index), nodes=set(graph.nodes),
                          excluded_edges=dict(graph.excluded_edges),
                          ml_fallback_used=graph.ml_fallback_used)
    result.nodes.update({"@origin", "@destination"})
    result.adjacency.setdefault("@origin", [])
    result.adjacency.setdefault("@destination", [])

    def add(edge: EdgeRecord, source: str, target: str, fraction: float,
            start: RoadAttachment | None, end: RoadAttachment | None, suffix: str) -> None:
        # At an existing vertex the other incident edges supply the legal
        # attachment. Never add zero-length edges to the positive-cost engine.
        if fraction <= 0:
            return
        if (isinstance(edge.length_m, bool) or not isinstance(edge.length_m, int | float)
                or not math.isfinite(edge.length_m) or edge.length_m < 0):
            raise GraphValidationError(f"edge {edge.edge_id} needs a finite nonnegative road length")
        piece = replace(edge, edge_id=f"{edge.edge_id}@{suffix}", from_node=source,
                        to_node=target, length_m=edge.length_m * fraction,
                        base_cost=edge.base_cost * fraction,
                        travel_time_s=edge.travel_time_s * fraction if edge.travel_time_s is not None else None,
                        geometry=_line_piece(edge, start, end))
        result.edge_index[piece.edge_id] = piece
        result.adjacency[source].append(piece)

    for origin in origins:
        edge = graph.get_edge(origin.edge_id)
        if edge is not None:
            add(edge, "@origin", edge.to_node, 1 - origin.fraction, origin, None, "origin")
    for destination in destinations:
        edge = graph.get_edge(destination.edge_id)
        if edge is not None:
            add(edge, edge.from_node, "@destination", destination.fraction, None, destination, "destination")
    for origin in origins:
        for destination in destinations:
            if origin.edge_id == destination.edge_id and destination.fraction >= origin.fraction:
                edge = graph.get_edge(origin.edge_id)
                if edge is not None:
                    add(edge, "@origin", "@destination", destination.fraction - origin.fraction,
                        origin, destination, "direct")
    for neighbors in result.adjacency.values():
        neighbors.sort(key=lambda edge: edge.edge_id)
    return result
