"""Tests for the explanation and warning generation."""

from resqph_routing.astar import find_route
from resqph_routing.explain import (
    collect_warnings,
    explain_route,
    format_explanation,
)
from resqph_routing.graph import build_graph

SAMPLE_NODES = [
    {"node_id": "A", "coordinates": [120.9900, 14.6040]},
    {"node_id": "B", "coordinates": [120.9910, 14.6045]},
    {"node_id": "C", "coordinates": [120.9905, 14.6050]},
    {"node_id": "D", "coordinates": [120.9915, 14.6055]},
]

SAMPLE_EDGES = [
    {"edge_id": "AB", "from": "A", "to": "B", "base_cost": 60},
    {"edge_id": "BD", "from": "B", "to": "D", "base_cost": 60},
    {"edge_id": "AC", "from": "A", "to": "C", "base_cost": 80},
    {"edge_id": "CD", "from": "C", "to": "D", "base_cost": 80},
    {"edge_id": "BC", "from": "B", "to": "C", "base_cost": 50},
]


class TestExplainRouteFound:
    def test_explain_baseline(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        result = find_route(graph, origin="A", destination="D")
        explanations = explain_route(graph, result)

        assert len(explanations) > 0
        assert any("Route found" in e for e in explanations)

    def test_explanations_match_chosen_edges(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        result = find_route(graph, origin="A", destination="D")
        explanations = explain_route(graph, result)

        # Should mention AB and BD
        combined = " ".join(explanations)
        assert "AB" in combined
        assert "BD" in combined

    def test_explanations_mention_excluded_edges(self):
        scenario = {"BD": {"flood_level": "severe", "passability": "impassable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        result = find_route(graph, origin="A", destination="D")
        explanations = explain_route(graph, result)

        combined = " ".join(explanations)
        assert "BD" in combined
        assert "excluded" in combined.lower()


class TestExplainNoRoute:
    def test_explain_no_route(self):
        scenario = {
            "BD": {"flood_level": "severe", "passability": "impassable"},
            "CD": {"flood_level": "severe", "passability": "impassable"},
        }
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        result = find_route(graph, origin="A", destination="D")
        explanations = explain_route(graph, result)

        assert len(explanations) > 0
        combined = " ".join(explanations)
        assert "no" in combined.lower()


class TestWarnings:
    def test_high_flood_warning(self):
        scenario = {"BD": {"flood_level": "high", "passability": "passable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        result = find_route(graph, origin="A", destination="D")
        warnings = collect_warnings(result)

        # High flood should generate a warning
        assert isinstance(warnings, list)

    def test_no_warnings_for_baseline(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        result = find_route(graph, origin="A", destination="D")
        warnings = collect_warnings(result)
        assert isinstance(warnings, list)


class TestFormatExplanation:
    def test_format_route_found(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        result = find_route(graph, origin="A", destination="D")
        formatted = format_explanation(result)

        assert "route-found" in formatted
        assert "AB" in formatted
        assert "BD" in formatted

    def test_format_no_route(self):
        scenario = {
            "BD": {"flood_level": "severe", "passability": "impassable"},
            "CD": {"flood_level": "severe", "passability": "impassable"},
        }
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        result = find_route(graph, origin="A", destination="D")
        formatted = format_explanation(result)

        assert "no-route" in formatted