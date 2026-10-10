"""Deterministic A* search for ResQPH flood-aware routing.

Implements A* with stable tie handling to guarantee deterministic
route reconstruction for identical inputs.

Tie-breaking order: (total_cost, insertion counter) to ensure stable ordering.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Any

from resqph_routing.costs import ML_FALLBACK_WARNING, compute_edge_cost
from resqph_routing.graph import RoutingGraph


@dataclass(frozen=True)
class RouteResult:
    """Domain result for a successful route."""

    status: str = "route-found"
    route: list[str] = field(default_factory=list)  # ordered edge_ids
    cost: float = 0.0
    cost_breakdown: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    explanations: list[str] = field(default_factory=list)
    fallback_used: bool = False

    @property
    def edge_ids(self) -> list[str]:
        """Expose the ordered path name used by the locked API contract."""
        return list(self.route)

    @property
    def total_cost(self) -> float:
        """Expose the total-cost name used by the locked API contract."""
        return self.cost

    @property
    def aggregate_cost_breakdown(self) -> dict[str, float]:
        """Aggregate per-edge costs for the backend response adapter."""
        base = sum(item["base_cost"] for item in self.cost_breakdown)
        ml_risk = sum(item["ml_penalty"] for item in self.cost_breakdown)
        deterministic_risk = sum(
            item["flood_penalty"]
            + item["restricted_penalty"]
            + item["obstacle_penalty"]
            + item["uncertainty_penalty"]
            for item in self.cost_breakdown
        )
        return {
            "base": base,
            "deterministic_risk": deterministic_risk,
            "ml_risk": ml_risk,
        }


@dataclass(frozen=True)
class NoRouteResult:
    """Domain result when no route exists."""

    status: str = "no-route"
    route: list[str] = field(default_factory=list)
    cost: float | None = None
    warnings: list[str] = field(default_factory=list)
    explanations: list[str] = field(default_factory=list)
    fallback_used: bool = False
    reason: str = "controlled_impassability_disconnected_destination"


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
    return _search(graph, origin, destination, weight_mode="cost")


def find_shortest_distance_route(
    graph: RoutingGraph,
    origin: str,
    destination: str,
) -> RouteResult | NoRouteResult:
    """Find the shortest admissible route by road length."""
    return _search(graph, origin, destination, weight_mode="distance")


def _search(
    graph: RoutingGraph,
    origin: str,
    destination: str,
    *,
    weight_mode: str,
) -> RouteResult | NoRouteResult:
    if not graph.has_node(origin) or not graph.has_node(destination):
        return NoRouteResult(
            warnings=_graph_warnings(graph),
            explanations=[
                (f"Origin '{origin}' or destination '{destination}' "
                "not found in graph.")
            ],
            fallback_used=graph.ml_fallback_used,
            reason="origin_or_destination_not_in_graph",
        )

    if origin == destination:
        return RouteResult(
            route=[],
            cost=0.0,
            warnings=_graph_warnings(graph),
            explanations=["Origin and destination are the same node."],
            fallback_used=graph.ml_fallback_used,
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

            if breakdown.total_cost is None:
                continue
            edge_cost = (
                edge.length_m
                if weight_mode == "distance" and edge.length_m is not None
                else breakdown.total_cost
            )

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
        warnings=_unique(
            [
                "No eligible route exists under the selected controlled scenario.",
                *_graph_warnings(graph),
            ]
        ),
        explanations=[
            f"No route found from '{origin}' to '{destination}'.{excluded_info}"
        ],
        fallback_used=graph.ml_fallback_used,
    )


def _build_route_result(
    graph: RoutingGraph,
    path_edge_ids: list[str],
    total_cost: float,
) -> RouteResult:
    """Build a RouteResult with cost breakdowns and warnings."""
    cost_breakdown: list[dict[str, Any]] = []
    warnings: list[str] = _graph_warnings(graph)
    explanations: list[str] = []
    fallback_used = graph.ml_fallback_used

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
        fallback_used = fallback_used or breakdown.fallback_used

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
        warnings=_unique(warnings),
        explanations=explanations,
        fallback_used=fallback_used,
    )


def calculate_path_cost(graph: RoutingGraph, edge_ids: list[str]) -> float:
    """Calculate and validate the actual cost of one ordered edge path."""

    total = 0.0
    previous_to: str | None = None
    for edge_id in edge_ids:
        edge = graph.get_edge(edge_id)
        if edge is None:
            raise ValueError(f"edge {edge_id} is missing or excluded")
        if previous_to is not None and edge.from_node != previous_to:
            raise ValueError(f"edge {edge_id} is not contiguous with the preceding edge")
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
        if breakdown.total_cost is None:
            raise ValueError(f"edge {edge_id} is excluded")
        total += breakdown.total_cost
        previous_to = edge.to_node
    return total


def _graph_warnings(graph: RoutingGraph) -> list[str]:
    return [ML_FALLBACK_WARNING] if graph.ml_fallback_used else []


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
