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

import math
from dataclasses import dataclass, field
from typing import Any

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
SUPPORTED_FLOOD_LEVELS: frozenset[str] = frozenset(
    {"none", "low", "moderate", "high", "severe"}
)
SUPPORTED_PASSABILITY: frozenset[str] = frozenset(
    {"passable", "restricted", "impassable"}
)
ML_FALLBACK_WARNING = "Runtime ML is disabled; deterministic rules were used."


class RoutingInputError(ValueError):
    """Raised when a routing record violates the locked input contract."""


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
    fallback_used: bool = False
    fallback_reason: str | None = None

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
    ml_probability: Any | None = None,
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
    _validate_edge_inputs(
        edge_id,
        base_cost,
        flood_level,
        passability,
        has_obstacle,
        is_stale_or_uncertain,
        ml_accepted,
    )
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
    fallback_used = False
    fallback_reason: str | None = None
    if not ml_accepted:
        fallback_used = True
        fallback_reason = "ml_not_accepted"
    elif not _is_finite_number(ml_probability):
        fallback_used = True
        fallback_reason = "ml_probability_missing_or_invalid"
    else:
        clamped = max(0.0, min(1.0, float(ml_probability)))
        ml_penalty = round(clamped * ML_MAX_PENALTY)

    if fallback_used:
        warnings.append(ML_FALLBACK_WARNING)

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
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
    )


def _validate_edge_inputs(
    edge_id: str,
    base_cost: float,
    flood_level: str,
    passability: str,
    has_obstacle: bool,
    is_stale_or_uncertain: bool,
    ml_accepted: bool,
) -> None:
    if not isinstance(edge_id, str) or not edge_id.strip():
        raise RoutingInputError("edge_id must be a nonempty string")
    if not _is_finite_number(base_cost) or float(base_cost) <= 0:
        raise RoutingInputError("base_cost must be a positive finite number")
    if not isinstance(flood_level, str) or flood_level not in SUPPORTED_FLOOD_LEVELS:
        raise RoutingInputError(
            f"flood_level must be one of {sorted(SUPPORTED_FLOOD_LEVELS)}"
        )
    if not isinstance(passability, str) or passability not in SUPPORTED_PASSABILITY:
        raise RoutingInputError(
            f"passability must be one of {sorted(SUPPORTED_PASSABILITY)}"
        )
    for field_name, value in (
        ("has_obstacle", has_obstacle),
        ("is_stale_or_uncertain", is_stale_or_uncertain),
        ("ml_accepted", ml_accepted),
    ):
        if not isinstance(value, bool):
            raise RoutingInputError(f"{field_name} must be a boolean")


def _is_finite_number(value: Any) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, int | float)
        and math.isfinite(float(value))
    )
