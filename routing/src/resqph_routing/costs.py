"""Deterministic cost engine for ResQPH flood-aware routing.

Implements the approved prototype rule table from ROUTING_CONTRACT.md.
All costs are in seconds-equivalent prototype units.

Cost formula:
    edge_cost = base_travel_cost
              + deterministic_flood_penalty
              + restricted_passability_penalty
              + obstacle_penalty
              + uncertainty_penalty
              + bounded_ml_penalty_when_accepted

Impassable edges are excluded (cost returns None).
ML cannot restore an excluded edge or lower a deterministic safety penalty.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Approved prototype rule table (seconds-equivalent cost units)
# ---------------------------------------------------------------------------

FLOOD_PENALTIES: dict[str, int] = {
    "none": 0,
    "low": 30,
    "moderate": 90,
    "high": 240,
    # "severe" is handled as exclusion
}

RESTRICTED_PASSABILITY_PENALTY: int = 180
OBSTACLE_PENALTY: int = 120
UNCERTAINTY_PENALTY: int = 60
ML_MAX_PENALTY: int = 60

# Flood levels that trigger exclusion
EXCLUDED_FLOOD_LEVELS: frozenset[str] = frozenset({"severe"})
EXCLUDED_PASSABILITY: frozenset[str] = frozenset({"impassable"})

# Flood levels that generate warnings
WARNING_FLOOD_LEVELS: frozenset[str] = frozenset({"high"})


@dataclass(frozen=True)
class EdgeCostBreakdown:
    """Immutable cost breakdown for a single edge."""

    edge_id: str
    base_cost: float
    flood_penalty: int = 0
    restricted_penalty: int = 0
    obstacle_penalty: int = 0
    uncertainty_penalty: int = 0
    ml_penalty: int = 0
    excluded: bool = False
    exclusion_reason: str | None = None
    warnings: list[str] = field(default_factory=list)

    @property
    def total_cost(self) -> float | None:
        """Total edge cost, or None if the edge is excluded."""
        if self.excluded:
            return None
        return (
            self.base_cost
            + self.flood_penalty
            + self.restricted_penalty
            + self.obstacle_penalty
            + self.uncertainty_penalty
            + self.ml_penalty
        )


def compute_edge_cost(
    edge_id: str,
    base_cost: float,
    flood_level: str = "none",
    passability: str = "passable",
    has_obstacle: bool = False,
    is_stale_or_uncertain: bool = False,
    ml_probability: float | None = None,
    ml_accepted: bool = False,
) -> EdgeCostBreakdown:
    """Compute the deterministic cost for a single edge.

    Parameters
    ----------
    edge_id : str
        Stable edge identifier.
    base_cost : float
        Base travel cost in seconds-equivalent units.
    flood_level : str
        One of: none, low, moderate, high, severe.
    passability : str
        One of: passable, restricted, impassable.
    has_obstacle : bool
        Whether a verified recent obstacle is present.
    is_stale_or_uncertain : bool
        Whether scenario data is stale, unknown, or uncertain.
    ml_probability : float | None
        ML risk probability in [0, 1]. Only used when ml_accepted is True.
    ml_accepted : bool
        Whether the ML model output has been accepted and is valid.

    Returns
    -------
    EdgeCostBreakdown
        Full cost breakdown. If excluded is True, total_cost is None.
    """
    warnings: list[str] = []

    # --- Exclusion checks (before any cost calculation) ---
    if passability in EXCLUDED_PASSABILITY:
        return EdgeCostBreakdown(
            edge_id=edge_id,
            base_cost=base_cost,
            excluded=True,
            exclusion_reason=f"passability is '{passability}'",
            warnings=warnings,
        )

    if flood_level in EXCLUDED_FLOOD_LEVELS:
        return EdgeCostBreakdown(
            edge_id=edge_id,
            base_cost=base_cost,
            excluded=True,
            exclusion_reason=f"flood_level is '{flood_level}'",
            warnings=warnings,
        )

    # --- Flood penalty ---
    flood_penalty = FLOOD_PENALTIES.get(flood_level, 0)
    if flood_level in WARNING_FLOOD_LEVELS:
        warnings.append(
            f"Edge {edge_id}: high flood level adds "
            f"+{FLOOD_PENALTIES['high']} cost units"
        )

    # --- Restricted passability penalty ---
    restricted_penalty = 0
    if passability == "restricted":
        restricted_penalty = RESTRICTED_PASSABILITY_PENALTY

    # --- Obstacle penalty ---
    obstacle_penalty = 0
    if has_obstacle:
        obstacle_penalty = OBSTACLE_PENALTY

    # --- Uncertainty penalty ---
    uncertainty_penalty = 0
    if is_stale_or_uncertain:
        uncertainty_penalty = UNCERTAINTY_PENALTY
        warnings.append(
            f"Edge {edge_id}: stale/uncertain data adds "
            f"+{UNCERTAINTY_PENALTY} cost units"
        )

    # --- Bounded ML penalty ---
    ml_penalty = 0
    if ml_accepted and ml_probability is not None:
        clamped = max(0.0, min(1.0, ml_probability))
        ml_penalty = round(clamped * ML_MAX_PENALTY)

    return EdgeCostBreakdown(
        edge_id=edge_id,
        base_cost=base_cost,
        flood_penalty=flood_penalty,
        restricted_penalty=restricted_penalty,
        obstacle_penalty=obstacle_penalty,
        uncertainty_penalty=uncertainty_penalty,
        ml_penalty=ml_penalty,
        excluded=False,
        exclusion_reason=None,
        warnings=warnings,
    )