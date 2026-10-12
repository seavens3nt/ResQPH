"""ResQPH deterministic flood-aware routing engine.

Pure routing package with no dependencies on FastAPI, MongoDB,
React, or runtime ML artifacts.
"""

from resqph_routing.astar import (
    NoRouteResult,
    RouteResult,
    calculate_path_cost,
    find_route,
    find_shortest_distance_route,
)
from resqph_routing.costs import (
    EdgeCostBreakdown,
    RoutingInputError,
    compute_edge_cost,
)
from resqph_routing.explain import collect_warnings, explain_route, format_explanation
from resqph_routing.graph import (
    EdgeRecord,
    GraphValidationError,
    RoutingGraph,
    build_graph,
    build_graph_from_geojson,
)

__all__ = [
    "EdgeCostBreakdown",
    "EdgeRecord",
    "GraphValidationError",
    "NoRouteResult",
    "RouteResult",
    "RoutingGraph",
    "RoutingInputError",
    "build_graph",
    "build_graph_from_geojson",
    "calculate_path_cost",
    "collect_warnings",
    "compute_edge_cost",
    "explain_route",
    "find_route",
    "find_shortest_distance_route",
    "format_explanation",
]
