"""Deterministic A* search for ResQPH flood-aware routing.

Implements A* with stable tie handling to guarantee deterministic
route reconstruction for identical inputs.

Tie-breaking order: (total_cost, insertion counter) to ensure stable ordering.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Any

from resqph_routing.costs import compute_edge_cost
from resqph_routing.graph import RoutingGraph


@dataclass
class RouteResult:
    """Domain result for a successful route."""

    status: str = "route-found"
    route: list[str] = field(default_factory=list)  # ordered edge_ids
    cost: float = 0.0
    cost_breakdown: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    explanations: list[str] = field(default_factory=list)


@dataclass
class NoRouteResult:
    """Domain result when no route exists."""

    status: str = "no-route"
    route: list[str] = field(default_factory=list)
    cost: float | None = None
    warnings: list[str] = field(default_factory=list)
    explanations: list[str] = field(default_factory=list)


def _heuristic(graph: RoutingGraph, node_id: str, goal_id: str) -> float:
    """Admissible heuristic: zero (equivalent to Dijkstra).

    Using zero heuristic guarantees correctness and determinism.
    For a prototype with small known graphs, this is acceptable.
    """
    return 0.0


def find_route(
    graph: RoutingGraph,
    origin: str,
    destination: str,
) -> RouteResult | NoRouteResult:
    """Find the lowest-cost route from origin to destination.

    Uses deterministic A* with stable tie-breaking.
    Impassable edges are already excluded from the graph.

    Parameters
    ----------
    graph : RoutingGraph
        The directed routing graph (impassable edges already removed).
    origin : str
        Starting node_id.
    destination : str
        Target node_id.

    Returns
    -------
    RouteResult | NoRouteResult
        Route-found with ordered edge_ids and cost breakdown,
        or no-route if destination is unreachable.
    """
    if not graph.has_node(origin) or not graph.has_node(destination):
        return NoRouteResult(
            explanations=[
                (f"Origin '{origin}' or destination '{destination}' "
                "not found in graph.")
            ]
        )

    if origin == destination:
        return RouteResult(
            route=[],
            cost=0.0,
            explanations=["Origin and destination are the same node."],
        )

    # Priority queue entries: (f_cost, tie_counter, node_id, path_edge_ids, g_cost)
    # tie_counter ensures deterministic ordering when f_cost is equal
    counter = 0  # monotonically increasing for stable tie-breaking
    open_set: list[tuple[float, int, str, list[str], float]] = []
    heapq.heappush(open_set, (0.0, counter, origin, [], 0.0))
    counter += 1

    # Best known cost to reach each node
    best_cost: dict[str, float] = {origin: 0.0}

    while open_set:
        _f_cost, _tie, current_node, path_edges, g_cost = heapq.heappop(open_set)

        # Goal reached
        if current_node == destination:
            return _build_route_result(graph, path_edges, g_cost)

        # Skip if we've already found a better path to this node
        if g_cost > best_cost.get(current_node, float("inf")):
            continue

        # Explore neighbors
        for edge in graph.neighbors(current_node):
            # Compute edge cost
            breakdown = compute_edge_cost(
                edge_id=edge.edge_id,
                base_cost=edge.base_cost,
                flood_level=edge.flood_level,
                passability=edge.passability,
                has_obstacle=edge.has_obstacle,
                is_stale_or_uncertain=edge.is_stale_or_uncertain,
                ml_probability=edge.ml_probability,
                ml_accepted=edge.ml_accepted,
            )

            # Skip excluded edges (defensive; graph already filters them)
            if breakdown.excluded:
                continue

            edge_cost = breakdown.total_cost
            if edge_cost is None:
                continue

            new_g = g_cost + edge_cost
            neighbor = edge.to_node

            # Only proceed if this is a strictly better path.
            # Strict < keeps the first-found path on ties -> deterministic.
            if new_g < best_cost.get(neighbor, float("inf")):
                best_cost[neighbor] = new_g
                new_path = path_edges + [edge.edge_id]

                h = _heuristic(graph, neighbor, destination)
                f = new_g + h
                heapq.heappush(open_set, (f, counter, neighbor, new_path, new_g))
                counter += 1

    # No route found
    excluded_info = ""
    if graph.excluded_edges:
        excluded_list = ", ".join(
            f"{eid} ({reason})" for eid, reason in sorted(graph.excluded_edges.items())
        )
        excluded_info = f" Excluded edges: {excluded_list}."

    return NoRouteResult(
        explanations=[
            f"No route found from '{origin}' to '{destination}'.{excluded_info}"
        ]
    )


def _build_route_result(
    graph: RoutingGraph,
    path_edge_ids: list[str],
    total_cost: float,
) -> RouteResult:
    """Build a RouteResult with cost breakdowns and warnings."""
    cost_breakdown: list[dict[str, Any]] = []
    warnings: list[str] = []
    explanations: list[str] = []

    for edge_id in path_edge_ids:
        edge = graph.get_edge(edge_id)
        if edge is None:
            continue

        breakdown = compute_edge_cost(
            edge_id=edge.edge_id,
            base_cost=edge.base_cost,
            flood_level=edge.flood_level,
            passability=edge.passability,
            has_obstacle=edge.has_obstacle,
            is_stale_or_uncertain=edge.is_stale_or_uncertain,
            ml_probability=edge.ml_probability,
            ml_accepted=edge.ml_accepted,
        )

        cost_breakdown.append(
            {
                "edge_id": edge_id,
                "base_cost": breakdown.base_cost,
                "flood_penalty": breakdown.flood_penalty,
                "restricted_penalty": breakdown.restricted_penalty,
                "obstacle_penalty": breakdown.obstacle_penalty,
                "uncertainty_penalty": breakdown.uncertainty_penalty,
                "ml_penalty": breakdown.ml_penalty,
                "total_cost": breakdown.total_cost,
            }
        )

        warnings.extend(breakdown.warnings)

        # Build explanation for this edge
        parts = [f"base={breakdown.base_cost}"]
        if breakdown.flood_penalty > 0:
            parts.append(f"flood+{breakdown.flood_penalty}")
        if breakdown.restricted_penalty > 0:
            parts.append(f"restricted+{breakdown.restricted_penalty}")
        if breakdown.obstacle_penalty > 0:
            parts.append(f"obstacle+{breakdown.obstacle_penalty}")
        if breakdown.uncertainty_penalty > 0:
            parts.append(f"uncertainty+{breakdown.uncertainty_penalty}")
        if breakdown.ml_penalty > 0:
            parts.append(f"ml+{breakdown.ml_penalty}")
        explanations.append(
            f"Edge {edge_id}: {', '.join(parts)} = {breakdown.total_cost}"
        )

    explanations.append(f"Total route cost: {total_cost}")

    return RouteResult(
        status="route-found",
        route=path_edge_ids,
        cost=total_cost,
        cost_breakdown=cost_breakdown,
        warnings=warnings,
        explanations=explanations,
    )