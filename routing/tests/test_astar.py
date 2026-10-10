"""Tests for the deterministic A* search engine.

Covers all five locked cases from routing-known-graph.example.json.
"""

import json
import pathlib

import pytest

from resqph_routing.astar import (
    NoRouteResult,
    RouteResult,
    calculate_path_cost,
    find_route,
)
from resqph_routing.costs import ML_FALLBACK_WARNING
from resqph_routing.graph import build_graph

# ---------------------------------------------------------------------------
# Fixture loading
# ---------------------------------------------------------------------------

FIXTURES_DIR = (
    pathlib.Path(__file__).resolve().parent.parent.parent / "data" / "samples"
)
KNOWN_GRAPH_PATH = FIXTURES_DIR / "routing-known-graph.example.json"


@pytest.fixture
def known_graph_data():
    with open(KNOWN_GRAPH_PATH) as f:
        return json.load(f)


def run_case(known_graph_data, case):
    """Run a single test case from the known graph fixture."""
    nodes = known_graph_data["nodes"]
    edges = known_graph_data["edges"]
    scenario = case.get("scenario", {})

    # Determine if ML is accepted for this case
    ml_accepted = any(
        "ml_probability" in v for v in scenario.values() if isinstance(v, dict)
    )

    graph = build_graph(nodes, edges, scenario=scenario, ml_accepted=ml_accepted)
    return find_route(graph, origin="A", destination="D")


def build_case_graph(known_graph_data, case):
    scenario = case.get("scenario", {})
    ml_accepted = any(
        "ml_probability" in value
        for value in scenario.values()
        if isinstance(value, dict)
    )
    return build_graph(
        known_graph_data["nodes"],
        known_graph_data["edges"],
        scenario=scenario,
        ml_accepted=ml_accepted,
    )


# ---------------------------------------------------------------------------
# Case 1: baseline
# ---------------------------------------------------------------------------


class TestBaseline:
    def test_baseline_route(self, known_graph_data):
        case = next(
            c for c in known_graph_data["expected_cases"] if c["case_id"] == "baseline"
        )
        result = run_case(known_graph_data, case)

        assert isinstance(result, RouteResult)
        assert result.status == "route-found"
        assert result.route == case["expected_route"]
        assert result.edge_ids == case["expected_route"]
        assert result.cost == case["expected_cost"]
        assert result.total_cost == case["expected_cost"]
        assert sum(result.aggregate_cost_breakdown.values()) == result.total_cost

    def test_baseline_deterministic(self, known_graph_data):
        """Running the same input twice must produce identical results."""
        case = next(
            c for c in known_graph_data["expected_cases"] if c["case_id"] == "baseline"
        )
        result1 = run_case(known_graph_data, case)
        result2 = run_case(known_graph_data, case)

        assert result1.route == result2.route
        assert result1.cost == result2.cost
        assert result1.cost_breakdown == result2.cost_breakdown


# ---------------------------------------------------------------------------
# Case 2: moderate-flood-reroute
# ---------------------------------------------------------------------------


class TestModerateFloodReroute:
    def test_reroute_around_flood(self, known_graph_data):
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "moderate-flood-reroute"
        )
        result = run_case(known_graph_data, case)

        assert isinstance(result, RouteResult)
        assert result.status == "route-found"
        assert result.route == case["expected_route"]
        assert result.cost == case["expected_cost"]

    def test_rejected_route_cost(self, known_graph_data):
        """The rejected route (AB+BD) should cost 210 with moderate flood."""
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "moderate-flood-reroute"
        )
        graph = build_case_graph(known_graph_data, case)

        assert calculate_path_cost(graph, ["AB", "BD"]) == case["rejected_route_cost"]


# ---------------------------------------------------------------------------
# Case 3: impassable-edge-exclusion
# ---------------------------------------------------------------------------


class TestImpassableExclusion:
    def test_impassable_excluded(self, known_graph_data):
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "impassable-edge-exclusion"
        )
        result = run_case(known_graph_data, case)

        assert isinstance(result, RouteResult)
        assert result.status == "route-found"
        assert result.route == case["expected_route"]
        assert result.cost == case["expected_cost"]
        # BD must not appear in the route
        assert "BD" not in result.route

    def test_impassable_never_in_result(self, known_graph_data):
        """Impassable edges must never appear in any route result."""
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "impassable-edge-exclusion"
        )
        result = run_case(known_graph_data, case)
        assert "BD" not in result.route


# ---------------------------------------------------------------------------
# Case 4: no-route
# ---------------------------------------------------------------------------


class TestNoRoute:
    def test_no_route(self, known_graph_data):
        case = next(
            c for c in known_graph_data["expected_cases"] if c["case_id"] == "no-route"
        )
        result = run_case(known_graph_data, case)

        assert isinstance(result, NoRouteResult)
        assert result.status == "no-route"
        assert result.route == []
        assert result.cost is None
        assert result.reason == "controlled_impassability_disconnected_destination"
        assert "No eligible route" in result.warnings[0]

    def test_no_route_has_explanation(self, known_graph_data):
        case = next(
            c for c in known_graph_data["expected_cases"] if c["case_id"] == "no-route"
        )
        result = run_case(known_graph_data, case)
        assert len(result.explanations) > 0


# ---------------------------------------------------------------------------
# Case 5: bounded-ml-penalty
# ---------------------------------------------------------------------------


class TestBoundedMLPenalty:
    def test_bounded_ml_reroute(self, known_graph_data):
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "bounded-ml-penalty"
        )
        result = run_case(known_graph_data, case)

        assert isinstance(result, RouteResult)
        assert result.status == "route-found"
        assert result.route == case["expected_route"]
        assert result.cost == case["expected_cost"]

    def test_ml_penalty_bounded(self, known_graph_data):
        """ML penalty should be capped at 60 units."""
        case = next(
            c
            for c in known_graph_data["expected_cases"]
            if c["case_id"] == "bounded-ml-penalty"
        )
        graph = build_case_graph(known_graph_data, case)

        assert calculate_path_cost(graph, ["AB", "BD"]) == case["rejected_route_cost"]

    def test_ml_fallback_without_ml(self, known_graph_data):
        """When ML is missing/disabled, rule fallback should work."""
        nodes = known_graph_data["nodes"]
        edges = known_graph_data["edges"]
        # No scenario, no ML
        graph = build_graph(nodes, edges, scenario={}, ml_accepted=False)
        result = find_route(graph, origin="A", destination="D")

        assert isinstance(result, RouteResult)
        assert result.route == ["AB", "BD"]
        assert result.cost == 120
        assert result.fallback_used
        assert ML_FALLBACK_WARNING in result.warnings

    def test_invalid_ml_falls_back_without_crashing(self, known_graph_data):
        graph = build_graph(
            known_graph_data["nodes"],
            known_graph_data["edges"],
            ml_results={"BD": "not-a-probability"},
            ml_accepted=True,
        )

        result = find_route(graph, origin="A", destination="D")

        assert isinstance(result, RouteResult)
        assert result.route == ["AB", "BD"]
        assert result.cost == 120
        assert result.fallback_used
        assert ML_FALLBACK_WARNING in result.warnings


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


class TestDeterminism:
    def test_identical_inputs_identical_outputs(self, known_graph_data):
        """All five cases must produce identical results on repeated runs."""
        for case in known_graph_data["expected_cases"]:
            result1 = run_case(known_graph_data, case)
            result2 = run_case(known_graph_data, case)

            assert result1.status == result2.status
            assert result1.route == result2.route
            assert result1.cost == result2.cost
            if isinstance(result1, RouteResult) and isinstance(result2, RouteResult):
                assert result1.cost_breakdown == result2.cost_breakdown
                assert result1.warnings == result2.warnings

    def test_equal_cost_tie_is_stable_across_input_order(self, known_graph_data):
        edges = [
            {"edge_id": "AZ", "from": "A", "to": "Z", "base_cost": 60},
            {"edge_id": "ZD", "from": "Z", "to": "D", "base_cost": 60},
            {"edge_id": "AB", "from": "A", "to": "B", "base_cost": 60},
            {"edge_id": "BD", "from": "B", "to": "D", "base_cost": 60},
        ]
        nodes = [
            {"node_id": "A"},
            {"node_id": "B"},
            {"node_id": "Z"},
            {"node_id": "D"},
        ]

        forward = find_route(build_graph(nodes, edges), "A", "D")
        reversed_result = find_route(build_graph(nodes, list(reversed(edges))), "A", "D")

        assert forward.route == ["AB", "BD"]
        assert reversed_result.route == forward.route
