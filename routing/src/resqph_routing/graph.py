"""Directed in-memory graph builder for ResQPH routing.

Builds a directed graph from locked contract edge records.
Impassable or severe-flood edges are excluded at build time
so the A* search never evaluates them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from resqph_routing.costs import EXCLUDED_FLOOD_LEVELS, EXCLUDED_PASSABILITY


@dataclass
class EdgeRecord:
    """A single directed edge in the routing graph."""

    edge_id: str
    from_node: str
    to_node: str
    base_cost: float
    flood_level: str = "none"
    passability: str = "passable"
    has_obstacle: bool = False
    is_stale_or_uncertain: bool = False
    ml_probability: float | None = None
    ml_accepted: bool = False
    geometry: Any | None = None
    length_m: float | None = None
    travel_time_s: float | None = None
    road_class: str | None = None
    observed_at: str | None = None
    source_type: str | None = None


@dataclass
class RoutingGraph:
    """Directed in-memory graph with stable edge_id values.

    Impassable/severe edges are excluded during construction.
    """

    # node_id -> list of EdgeRecord (outgoing edges)
    adjacency: dict[str, list[EdgeRecord]] = field(default_factory=dict)
    # edge_id -> EdgeRecord (for lookup)
    edge_index: dict[str, EdgeRecord] = field(default_factory=dict)
    # Set of excluded edge_ids with reasons
    excluded_edges: dict[str, str] = field(default_factory=dict)
    # All node ids
    nodes: set[str] = field(default_factory=set)

    def neighbors(self, node_id: str) -> list[EdgeRecord]:
        """Return outgoing edges from a node (only passable edges)."""
        return self.adjacency.get(node_id, [])

    def get_edge(self, edge_id: str) -> EdgeRecord | None:
        """Look up an edge by its stable edge_id."""
        return self.edge_index.get(edge_id)

    def has_node(self, node_id: str) -> bool:
        return node_id in self.nodes


def build_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    scenario: dict[str, Any] | None = None,
    ml_results: dict[str, float] | None = None,
    ml_accepted: bool = False,
) -> RoutingGraph:
    """Build a directed RoutingGraph from contract records.

    Parameters
    ----------
    nodes : list[dict]
        Node records with 'node_id' and optional 'coordinates'.
    edges : list[dict]
        Edge records with 'edge_id', 'from', 'to', 'base_cost',
        and optional scenario attributes.
    scenario : dict | None
        Per-edge scenario overrides keyed by edge_id.
        Example: {"BD": {"flood_level": "moderate", "passability": "passable"}}
    ml_results : dict | None
        Per-edge ML risk probabilities keyed by edge_id.
        Example: {"BD": 1.0}
    ml_accepted : bool
        Whether the ML model output is accepted and valid.

    Returns
    -------
    RoutingGraph
        Directed graph with impassable/severe edges excluded.
    """
    if scenario is None:
        scenario = {}
    if ml_results is None:
        ml_results = {}

    graph = RoutingGraph()

    # Register all nodes
    for node in nodes:
        node_id = node["node_id"]
        graph.nodes.add(node_id)
        if node_id not in graph.adjacency:
            graph.adjacency[node_id] = []

    # Process edges
    for edge_data in edges:
        edge_id = edge_data["edge_id"]
        from_node = edge_data["from"]
        to_node = edge_data["to"]
        base_cost = edge_data["base_cost"]

        # Apply scenario overrides
        edge_scenario = scenario.get(edge_id, {})
        flood_level = edge_scenario.get(
            "flood_level", edge_data.get("flood_level", "none")
        )
        passability = edge_scenario.get(
            "passability", edge_data.get("passability", "passable")
        )
        has_obstacle = edge_scenario.get(
            "has_obstacle", edge_data.get("has_obstacle", False)
        )
        is_stale = edge_scenario.get(
            "is_stale_or_uncertain", edge_data.get("is_stale_or_uncertain", False)
        )

        # ML probability: scenario override > ml_results > edge_data
        ml_prob = edge_scenario.get("ml_probability")
        if ml_prob is None:
            ml_prob = ml_results.get(edge_id)
        if ml_prob is None:
            ml_prob = edge_data.get("ml_probability")

        # Check exclusion before adding to graph
        if passability in EXCLUDED_PASSABILITY:
            graph.excluded_edges[edge_id] = f"passability is '{passability}'"
            continue
        if flood_level in EXCLUDED_FLOOD_LEVELS:
            graph.excluded_edges[edge_id] = f"flood_level is '{flood_level}'"
            continue

        record = EdgeRecord(
            edge_id=edge_id,
            from_node=from_node,
            to_node=to_node,
            base_cost=base_cost,
            flood_level=flood_level,
            passability=passability,
            has_obstacle=has_obstacle,
            is_stale_or_uncertain=is_stale,
            ml_probability=ml_prob,
            ml_accepted=ml_accepted,
            geometry=edge_data.get("geometry"),
            length_m=edge_data.get("length_m"),
            travel_time_s=edge_data.get("travel_time_s"),
            road_class=edge_data.get("road_class"),
            observed_at=edge_data.get("observed_at"),
            source_type=edge_data.get("source_type"),
        )

        graph.edge_index[edge_id] = record
        graph.adjacency.setdefault(from_node, []).append(record)
        # Ensure to_node exists in adjacency
        graph.adjacency.setdefault(to_node, [])

    return graph