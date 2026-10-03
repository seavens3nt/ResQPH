"""ResQPH deterministic flood-aware routing engine.

Pure routing package with no dependencies on FastAPI, MongoDB,
React, or runtime ML artifacts.
"""

from resqph_routing.astar import NoRouteResult, RouteResult, find_route
from resqph_routing.costs import EdgeCostBreakdown, compute_edge_cost
from resqph_routing.explain import collect_warnings, explain_route, format_explanation
from resqph_routing.graph import EdgeRecord, RoutingGraph, build_graph

__all__ = [
    "EdgeCostBreakdown",
    "EdgeRecord",
    "NoRouteResult",
    "RouteResult",
    "RoutingGraph",
    "build_graph",
    "collect_warnings",
    "compute_edge_cost",
    "explain_route",
    "find_route",
    "format_explanation",
]