"""Tests for the deterministic cost engine."""

from resqph_routing.costs import compute_edge_cost


class TestBaseCost:
    def test_base_cost_only(self):
        result = compute_edge_cost("E1", base_cost=60.0)
        assert result.total_cost == 60.0
        assert not result.excluded
        assert result.flood_penalty == 0
        assert result.restricted_penalty == 0
        assert result.ml_penalty == 0

    def test_base_cost_with_no_flood(self):
        result = compute_edge_cost("E1", base_cost=100.0, flood_level="none")
        assert result.total_cost == 100.0


class TestFloodPenalties:
    def test_low_flood(self):
        result = compute_edge_cost("E1", base_cost=60.0, flood_level="low")
        assert result.flood_penalty == 30
        assert result.total_cost == 90.0

    def test_moderate_flood(self):
        result = compute_edge_cost("E1", base_cost=60.0, flood_level="moderate")
        assert result.flood_penalty == 90
        assert result.total_cost == 150.0

    def test_high_flood(self):
        result = compute_edge_cost("E1", base_cost=60.0, flood_level="high")
        assert result.flood_penalty == 240
        assert result.total_cost == 300.0
        assert len(result.warnings) > 0

    def test_severe_flood_excluded(self):
        result = compute_edge_cost("E1", base_cost=60.0, flood_level="severe")
        assert result.excluded
        assert result.total_cost is None
        assert "severe" in result.exclusion_reason


class TestPassability:
    def test_passable(self):
        result = compute_edge_cost("E1", base_cost=60.0, passability="passable")
        assert result.restricted_penalty == 0
        assert not result.excluded

    def test_restricted(self):
        result = compute_edge_cost("E1", base_cost=60.0, passability="restricted")
        assert result.restricted_penalty == 180
        assert result.total_cost == 240.0

    def test_impassable_excluded(self):
        result = compute_edge_cost("E1", base_cost=60.0, passability="impassable")
        assert result.excluded
        assert result.total_cost is None
        assert "impassable" in result.exclusion_reason

    def test_restricted_plus_flood(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, flood_level="moderate", passability="restricted"
        )
        assert result.flood_penalty == 90
        assert result.restricted_penalty == 180
        assert result.total_cost == 330.0


class TestObstaclePenalty:
    def test_obstacle(self):
        result = compute_edge_cost("E1", base_cost=60.0, has_obstacle=True)
        assert result.obstacle_penalty == 120
        assert result.total_cost == 180.0

    def test_no_obstacle(self):
        result = compute_edge_cost("E1", base_cost=60.0, has_obstacle=False)
        assert result.obstacle_penalty == 0


class TestUncertaintyPenalty:
    def test_stale_data(self):
        result = compute_edge_cost("E1", base_cost=60.0, is_stale_or_uncertain=True)
        assert result.uncertainty_penalty == 60
        assert result.total_cost == 120.0
        assert len(result.warnings) > 0

    def test_fresh_data(self):
        result = compute_edge_cost("E1", base_cost=60.0, is_stale_or_uncertain=False)
        assert result.uncertainty_penalty == 0


class TestMLPenalty:
    def test_ml_not_accepted(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=1.0, ml_accepted=False
        )
        assert result.ml_penalty == 0
        assert result.total_cost == 60.0

    def test_ml_accepted_full_probability(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=1.0, ml_accepted=True
        )
        assert result.ml_penalty == 60
        assert result.total_cost == 120.0

    def test_ml_accepted_half_probability(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=0.5, ml_accepted=True
        )
        assert result.ml_penalty == 30
        assert result.total_cost == 90.0

    def test_ml_accepted_zero_probability(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=0.0, ml_accepted=True
        )
        assert result.ml_penalty == 0
        assert result.total_cost == 60.0

    def test_ml_clamped_above_one(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=1.5, ml_accepted=True
        )
        assert result.ml_penalty == 60  # clamped to 1.0 * 60

    def test_ml_clamped_below_zero(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=-0.5, ml_accepted=True
        )
        assert result.ml_penalty == 0  # clamped to 0.0 * 60

    def test_ml_none_probability(self):
        result = compute_edge_cost(
            "E1", base_cost=60.0, ml_probability=None, ml_accepted=True
        )
        assert result.ml_penalty == 0

    def test_ml_cannot_restore_excluded_edge(self):
        result = compute_edge_cost(
            "E1",
            base_cost=60.0,
            flood_level="severe",
            ml_probability=0.0,
            ml_accepted=True,
        )
        assert result.excluded
        assert result.total_cost is None


class TestCombinedPenalties:
    def test_all_penalties_combined(self):
        result = compute_edge_cost(
            "E1",
            base_cost=60.0,
            flood_level="moderate",
            passability="restricted",
            has_obstacle=True,
            is_stale_or_uncertain=True,
            ml_probability=1.0,
            ml_accepted=True,
        )
        expected = 60 + 90 + 180 + 120 + 60 + 60  # 570
        assert result.total_cost == expected