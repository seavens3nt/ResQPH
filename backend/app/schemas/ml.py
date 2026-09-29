"""
Pydantic schemas for the ML road-risk inference contract.

Mirrors the JSON shape documented in docs/ml/ML_FEASIBILITY.md:

    {
      "edge_id": "edge-001",
      "risk_probability": 0.74,
      "risk_level": "high",
      "model_name": "xgboost",
      "model_version": "xgb-ondoy-001",
      "generated_at": "2026-09-21T04:00:00Z"
    }

`RoadRiskRequest` fields follow the contract in
data/samples/ml-road-risk-contract.example.json.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "moderate", "high", "severe"]


class RoadRiskRequest(BaseModel):
    """
    Per-edge prediction request.

    Features follow the contract in docs/ml/ML_FEASIBILITY.md and
    data/samples/ml-road-risk-contract.example.json. Field constraints
    reject obviously invalid inputs before they reach the model.
    """

    edge_id: str = Field(..., min_length=1, max_length=128)
    road_class: str = Field(..., min_length=1, max_length=64)
    length_m: float = Field(..., ge=0.0)
    baseline_travel_time_s: float = Field(..., ge=0.0)

    # Historical / contextual inputs — optional for controlled scenarios
    historical_flood_frequency: float = Field(default=0.0, ge=0.0, le=1.0)
    max_prior_flood_depth_cm: float = Field(default=0.0, ge=0.0)
    distance_to_documented_waterway_m: float = Field(default=0.0, ge=0.0)
    elevation_context_m: float | None = None
    rainfall_band_before_outcome: str = "unknown"


class RoadRiskResponse(BaseModel):
    """
    Prediction response, keyed to the routing edge.

    `fallback_used` distinguishes the deterministic rule path from the
    model-loaded path. `ml_penalty_seconds` follows ML_FEASIBILITY.md:
    `round(clamp(risk_probability, 0, 1) * 60)`.
    """

    edge_id: str
    risk_probability: float = Field(..., ge=0.0, le=1.0)
    risk_level: RiskLevel
    model_name: str
    model_version: str
    generated_at: str
    fallback_used: bool
    ml_penalty_seconds: int = Field(
        ...,
        ge=0,
        le=60,
        description=(
            "Per-edge ML contribution to routing cost in seconds-equivalent "
            "units. Maximum 60 per ML_FEASIBILITY.md."
        ),
    )