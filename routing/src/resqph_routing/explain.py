"""Human-readable explanation and warning generation for ResQPH routing.

Derives explanations from actual edge decisions in the routing result.
"""

from __future__ import annotations

from resqph_routing.astar import NoRouteResult, RouteResult
from resqph_routing.costs import compute_edge_cost
from resqph_routing.graph import RoutingGraph


def explain_route(
    graph: RoutingGraph,
    result: RouteResult | NoRouteResult,
) -> list[str]:
    """Generate human-readable explanations for a routing result.

    Parameters
    ----------
    graph : RoutingGraph
        The routing graph used for the search.
    result : RouteResult | NoRouteResult
        The routing result to explain.

    Returns
    -------
    list[str]
        Ordered list of human-readable explanation strings.
    """
    explanations: list[str] = []

    if isinstance(result, NoRouteResult):
        explanations.append("No viable route could be found.")
        if graph.excluded_edges:
            for edge_id, reason in sorted(graph.excluded_edges.items()):
                explanations.append(f"Edge '{edge_id}' was excluded: {reason}.")
        explanations.extend(result.explanations)
        return explanations

    # Route found
    explanations.append(
        f"Route found with {len(result.route)} edge(s), total cost {result.cost}."
    )

    for i, edge_id in enumerate(result.route, 1):
        edge = graph.get_edge(edge_id)
        if edge is None:
            explanations.append(f"Step {i}: Edge '{edge_id}' (not found in graph)")
            continue

        # Find cost breakdown for this edge
        breakdown_entry = None
        for entry in result.cost_breakdown:
            if entry["edge_id"] == edge_id:
                breakdown_entry = entry
                break

        if breakdown_entry:
            parts = [f"base={breakdown_entry['base_cost']}"]
            if breakdown_entry.get("flood_penalty", 0) > 0:
                parts.append(f"flood+{breakdown_entry['flood_penalty']}")
            if breakdown_entry.get("restricted_penalty", 0) > 0:
                parts.append(f"restricted+{breakdown_entry['restricted_penalty']}")
            if breakdown_entry.get("obstacle_penalty", 0) > 0:
                parts.append(f"obstacle+{breakdown_entry['obstacle_penalty']}")
            if breakdown_entry.get("uncertainty_penalty", 0) > 0:
                parts.append(f"uncertainty+{breakdown_entry['uncertainty_penalty']}")
            if breakdown_entry.get("ml_penalty", 0) > 0:
                parts.append(f"ml+{breakdown_entry['ml_penalty']}")

            cost_str = ", ".join(parts)
            explanations.append(
                f"Step {i}: Edge '{edge_id}' "
                f"({edge.from_node} -> {edge.to_node}): {cost_str}"
            )
        else:
            explanations.append(
                f"Step {i}: Edge '{edge_id}' ({edge.from_node} -> {edge.to_node})"
            )

    chosen_edges = set(result.route)
    for edge_id, edge in sorted(graph.edge_index.items()):
        if edge_id in chosen_edges:
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
        penalty = (
            breakdown.flood_penalty
            + breakdown.restricted_penalty
            + breakdown.obstacle_penalty
            + breakdown.uncertainty_penalty
            + breakdown.ml_penalty
        )
        if penalty > 0:
            explanations.append(
                f"Alternative edge '{edge_id}' was not selected; "
                f"its evaluated edge cost was {breakdown.total_cost}."
            )

    # Explain excluded edges that affected routing
    if graph.excluded_edges:
        explanations.append("Excluded edges (not available for routing):")
        for edge_id, reason in sorted(graph.excluded_edges.items()):
            explanations.append(f"  - Edge '{edge_id}': {reason}")

    return explanations


def collect_warnings(result: RouteResult | NoRouteResult) -> list[str]:
    """Collect all warnings from a routing result.

    Parameters
    ----------
    result : RouteResult | NoRouteResult
        The routing result.

    Returns
    -------
    list[str]
        List of warning strings.
    """
    return list(result.warnings)


def format_explanation(result: RouteResult | NoRouteResult) -> str:
    """Format a complete explanation as a single multi-line string.

    Parameters
    ----------
    result : RouteResult | NoRouteResult
        The routing result.

    Returns
    -------
    str
        Multi-line explanation string.
    """
    lines: list[str] = []
    lines.append(f"Status: {result.status}")

    if isinstance(result, RouteResult):
        lines.append(f"Route: {' -> '.join(result.route)}")
        lines.append(f"Total Cost: {result.cost}")
    else:
        lines.append("Route: N/A")

    if result.warnings:
        lines.append("Warnings:")
        for w in result.warnings:
            lines.append(f"  - {w}")

    if result.explanations:
        lines.append("Explanations:")
        for e in result.explanations:
            lines.append(f"  - {e}")

    return "\n".join(lines)
