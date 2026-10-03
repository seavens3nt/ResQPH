"""Directed in-memory graph builder for ResQPH routing.

Builds a directed graph from locked contract edge records.
Impassable or severe-flood edges are excluded at build time
so the A* search never evaluates them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from resqph_routing.costs import compute_edge_cost


class GraphValidationError(ValueError):
    """Raised when graph or scenario records violate the locked contract."""


@dataclass(frozen=True)
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
    ml_fallback_used: bool = False

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
    scenario = _require_mapping(scenario, "scenario")
    ml_results = _require_mapping(ml_results, "ml_results")

    graph = RoutingGraph()

    # Register all nodes
    for node in nodes:
        if not isinstance(node, dict):
            raise GraphValidationError("each node must be an object")
        node_id = node.get("node_id")
        if not isinstance(node_id, str) or not node_id.strip():
            raise GraphValidationError("node_id must be a nonempty string")
        if node_id in graph.nodes:
            raise GraphValidationError(f"duplicate node_id: {node_id}")
        graph.nodes.add(node_id)
        graph.adjacency[node_id] = []

    normalized_edges = [_normalize_edge_record(edge) for edge in edges]
    edge_ids = [edge["edge_id"] for edge in normalized_edges]
    if len(edge_ids) != len(set(edge_ids)):
        duplicates = sorted({edge_id for edge_id in edge_ids if edge_ids.count(edge_id) > 1})
        raise GraphValidationError(f"duplicate edge_id values: {', '.join(duplicates)}")

    unknown_scenario_ids = sorted(set(scenario) - set(edge_ids))
    if unknown_scenario_ids:
        raise GraphValidationError(
            "scenario references unknown edge_id values: "
            + ", ".join(unknown_scenario_ids)
        )
    unknown_ml_ids = sorted(set(ml_results) - set(edge_ids))
    if unknown_ml_ids:
        raise GraphValidationError(
            "ml_results references unknown edge_id values: " + ", ".join(unknown_ml_ids)
        )

    # Process edges
    for edge_data in sorted(normalized_edges, key=lambda item: item["edge_id"]):
        edge_id = edge_data["edge_id"]
        from_node = edge_data["from_node"]
        to_node = edge_data["to_node"]
        base_cost = edge_data["base_cost"]

        if from_node not in graph.nodes or to_node not in graph.nodes:
            raise GraphValidationError(
                f"edge {edge_id} references an unknown from_node or to_node"
            )

        # Apply scenario overrides
        edge_scenario = scenario.get(edge_id, {})
        if not isinstance(edge_scenario, dict):
            raise GraphValidationError(
                f"scenario entry for edge {edge_id} must be an object"
            )
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
        if "ml_probability" in edge_scenario:
            ml_prob = edge_scenario["ml_probability"]
        elif edge_id in ml_results:
            ml_prob = ml_results[edge_id]
        else:
            ml_prob = edge_data.get("ml_probability")

        breakdown = compute_edge_cost(
            edge_id=edge_id,
            base_cost=base_cost,
            flood_level=flood_level,
            passability=passability,
            has_obstacle=has_obstacle,
            is_stale_or_uncertain=is_stale,
            ml_probability=ml_prob,
            ml_accepted=ml_accepted,
        )
        if breakdown.fallback_used:
            graph.ml_fallback_used = True

        # Check exclusion before adding to graph
        if breakdown.excluded:
            graph.excluded_edges[edge_id] = breakdown.exclusion_reason or "excluded"
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

    for outgoing in graph.adjacency.values():
        outgoing.sort(key=lambda edge: edge.edge_id)

    return graph


def build_graph_from_geojson(
    road_collection: dict[str, Any],
    flood_collection: dict[str, Any] | None = None,
    ml_results: dict[str, float] | None = None,
    ml_accepted: bool = False,
) -> RoutingGraph:
    """Build a graph directly from the accepted U-Belt GeoJSON contracts."""

    road_features = _feature_collection(road_collection, "road_collection")
    flood_features = (
        _feature_collection(flood_collection, "flood_collection")
        if flood_collection is not None
        else []
    )

    edges: list[dict[str, Any]] = []
    node_ids: set[str] = set()
    for feature in road_features:
        properties = _feature_properties(feature, "road feature")
        edge = dict(properties)
        edge["geometry"] = feature.get("geometry")
        edges.append(edge)
        for field_name in ("from_node", "to_node"):
            value = properties.get(field_name)
            if isinstance(value, str) and value.strip():
                node_ids.add(value)

    scenario: dict[str, dict[str, Any]] = {}
    for feature in flood_features:
        properties = _feature_properties(feature, "flood feature")
        edge_id = properties.get("edge_id")
        if not isinstance(edge_id, str) or not edge_id.strip():
            raise GraphValidationError("flood feature edge_id must be a nonempty string")
        if edge_id in scenario:
            raise GraphValidationError(f"duplicate flood record for edge_id: {edge_id}")
        scenario[edge_id] = properties

    nodes = [{"node_id": node_id} for node_id in sorted(node_ids)]
    return build_graph(
        nodes,
        edges,
        scenario=scenario,
        ml_results=ml_results,
        ml_accepted=ml_accepted,
    )


def _normalize_edge_record(edge: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(edge, dict):
        raise GraphValidationError("each edge must be an object")
    properties = edge.get("properties") if edge.get("type") == "Feature" else edge
    if not isinstance(properties, dict):
        raise GraphValidationError("edge properties must be an object")

    edge_id = properties.get("edge_id")
    from_node = properties.get("from_node", properties.get("from"))
    to_node = properties.get("to_node", properties.get("to"))
    base_cost = properties.get("base_cost", properties.get("travel_time_s"))
    if base_cost is None:
        base_cost = properties.get("length_m")
    if not isinstance(edge_id, str) or not edge_id.strip():
        raise GraphValidationError("edge_id must be a nonempty string")
    if not isinstance(from_node, str) or not from_node.strip():
        raise GraphValidationError(f"edge {edge_id} from_node must be a nonempty string")
    if not isinstance(to_node, str) or not to_node.strip():
        raise GraphValidationError(f"edge {edge_id} to_node must be a nonempty string")

    normalized = dict(properties)
    normalized.update(
        {
            "edge_id": edge_id,
            "from_node": from_node,
            "to_node": to_node,
            "base_cost": base_cost,
        }
    )
    if edge.get("type") == "Feature":
        normalized["geometry"] = edge.get("geometry")
    return normalized


def _require_mapping(value: dict[str, Any] | None, field_name: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise GraphValidationError(f"{field_name} must be an object keyed by edge_id")
    if any(not isinstance(key, str) or not key.strip() for key in value):
        raise GraphValidationError(f"{field_name} keys must be nonempty edge_id strings")
    return value


def _feature_collection(value: Any, field_name: str) -> list[dict[str, Any]]:
    if not isinstance(value, dict) or value.get("type") != "FeatureCollection":
        raise GraphValidationError(f"{field_name} must be a GeoJSON FeatureCollection")
    features = value.get("features")
    if not isinstance(features, list):
        raise GraphValidationError(f"{field_name}.features must be a list")
    if any(not isinstance(feature, dict) for feature in features):
        raise GraphValidationError(f"{field_name}.features must contain objects")
    return features


def _feature_properties(feature: dict[str, Any], label: str) -> dict[str, Any]:
    if feature.get("type") != "Feature" or not isinstance(feature.get("properties"), dict):
        raise GraphValidationError(f"{label} must contain object properties")
    return feature["properties"]
