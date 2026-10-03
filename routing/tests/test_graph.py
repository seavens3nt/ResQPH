"""Tests for the directed graph builder."""


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


class TestBuildGraph:
    def test_builds_all_nodes(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        assert graph.has_node("A")
        assert graph.has_node("B")
        assert graph.has_node("C")
        assert graph.has_node("D")

    def test_builds_all_edges(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        assert len(graph.edge_index) == 5
        assert graph.get_edge("AB") is not None
        assert graph.get_edge("BD") is not None

    def test_adjacency_from_a(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        neighbors = graph.neighbors("A")
        edge_ids = {e.edge_id for e in neighbors}
        assert edge_ids == {"AB", "AC"}

    def test_adjacency_from_b(self):
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES)
        neighbors = graph.neighbors("B")
        edge_ids = {e.edge_id for e in neighbors}
        assert edge_ids == {"BD", "BC"}


class TestExclusion:
    def test_impassable_edge_excluded(self):
        scenario = {"BD": {"flood_level": "severe", "passability": "impassable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        assert "BD" in graph.excluded_edges
        assert graph.get_edge("BD") is None
        # B should only have BC
        neighbors = graph.neighbors("B")
        edge_ids = {e.edge_id for e in neighbors}
        assert edge_ids == {"BC"}

    def test_severe_flood_excluded(self):
        scenario = {"BD": {"flood_level": "severe", "passability": "passable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        assert "BD" in graph.excluded_edges

    def test_impassable_passability_excluded(self):
        scenario = {"BD": {"flood_level": "none", "passability": "impassable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        assert "BD" in graph.excluded_edges


class TestScenarioOverrides:
    def test_flood_level_override(self):
        scenario = {"BD": {"flood_level": "moderate", "passability": "passable"}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        edge = graph.get_edge("BD")
        assert edge is not None
        assert edge.flood_level == "moderate"

    def test_ml_probability_from_scenario(self):
        scenario = {"BD": {"ml_probability": 1.0}}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario)
        edge = graph.get_edge("BD")
        assert edge.ml_probability == 1.0

    def test_ml_probability_from_ml_results(self):
        ml_results = {"BD": 0.8}
        graph = build_graph(SAMPLE_NODES, SAMPLE_EDGES, ml_results=ml_results)
        edge = graph.get_edge("BD")
        assert edge.ml_probability == 0.8

    def test_scenario_overrides_ml_results(self):
        scenario = {"BD": {"ml_probability": 1.0}}
        ml_results = {"BD": 0.5}
        graph = build_graph(
            SAMPLE_NODES, SAMPLE_EDGES, scenario=scenario, ml_results=ml_results
        )
        edge = graph.get_edge("BD")
        assert edge.ml_probability == 1.0