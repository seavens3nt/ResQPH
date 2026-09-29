"""
Runtime ML adapter for road-risk inference.

Behaviour
---------
- If `settings.ml_enabled` is False, always returns the deterministic
  rule-based fallback. The endpoint is still functional; it just does not
  attempt to load a model.
- If enabled AND xgboost is installed AND the artifact exists, the model
  is loaded once at startup and used for predictions.
- Any failure during loading falls back cleanly. The rule-based fallback
  is the mandatory path (D-005); ML is optional.

The adapter does not import xgboost at module import time. That dependency
is only required when `ml_enabled=True` and a valid artifact is present.
"""
from __future__ import annotations

import datetime as _dt
import logging
import math
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model container (populated at startup via `initialize()`)
# ---------------------------------------------------------------------------
_model: Any | None = None
_model_version: str = "rule-fallback-001"


# ---------------------------------------------------------------------------
# Road class mapping (must match the training contract)
# ---------------------------------------------------------------------------
_ROAD_CLASS_TO_CODE = {
    "motorway": 1,
    "trunk": 2,
    "primary": 3,
    "secondary": 4,
    "tertiary": 5,
    "unclassified": 6,
    "residential": 7,
    "service": 8,
}


def _road_class_to_code(road_class: str) -> int:
    return _ROAD_CLASS_TO_CODE.get(road_class.lower().strip(), 6)


# ---------------------------------------------------------------------------
# Rule-based fallback (deterministic; documented placeholder)
# ---------------------------------------------------------------------------
def _rule_based_probability(payload: dict) -> float:
    """
    Deterministic fallback. Returns a bounded probability in [0, 1].

    Inputs are already validated by the Pydantic schema. Missing optional
    features default to the contract's conservative values.
    """
    length_n = min(payload.get("length_m", 0.0) / 200.0, 1.0)
    time_n = min(payload.get("baseline_travel_time_s", 30.0) / 120.0, 1.0)
    flood_freq = max(0.0, min(payload.get("historical_flood_frequency", 0.0), 1.0))
    depth_n = min(payload.get("max_prior_flood_depth_cm", 0.0) / 100.0, 1.0)
    waterway_n = max(
        0.0,
        min(
            1.0
            - payload.get("distance_to_documented_waterway_m", 1000.0) / 500.0,
            1.0,
        ),
    )

    elevation = payload.get("elevation_context_m")
    if elevation is None:
        elevation_n = 0.5
    else:
        # Metro Manila is a flat delta; 10 m is effectively high ground
        elevation_n = max(0.0, min(1.0 - elevation / 10.0, 1.0))

    rainfall_band = (payload.get("rainfall_band_before_outcome") or "").lower()
    rainfall_n = {
        "none": 0.0,
        "light": 0.2,
        "moderate": 0.5,
        "heavy": 0.8,
        "extreme": 1.0,
    }.get(rainfall_band, 0.3)

    score = (
        0.20 * length_n
        + 0.10 * time_n
        + 0.20 * flood_freq
        + 0.15 * depth_n
        + 0.15 * waterway_n
        + 0.10 * elevation_n
        + 0.10 * rainfall_n
    )
    return float(max(0.0, min(score, 1.0)))


# ---------------------------------------------------------------------------
# Probability → risk level + penalty
# ---------------------------------------------------------------------------
def _risk_level(probability: float) -> str:
    if probability < 0.25:
        return "low"
    if probability < 0.50:
        return "moderate"
    if probability < 0.75:
        return "high"
    return "severe"


def _ml_penalty(probability: float) -> int:
    """Per ML_FEASIBILITY.md: round(clamp(p, 0, 1) * 60)."""
    return round(max(0.0, min(probability, 1.0)) * 60)


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------
def initialize() -> None:
    """
    Attempt to load the ML artifact. Never raises — falls back on any error.
    Called once from the FastAPI lifespan handler.
    """
    global _model, _model_version

    if not settings.ml_enabled:
        logger.info("ML adapter disabled (ml_enabled=False). Using rule fallback.")
        _model = None
        _model_version = "rule-fallback-001"
        return

    artifact_path = Path(settings.ml_artifacts_dir) / settings.ml_classifier_filename

    try:
        import joblib  # local import — optional dep
        import xgboost  # noqa: F401 — local import to detect availability

        if not artifact_path.exists():
            raise FileNotFoundError(f"artifact not found: {artifact_path}")

        _model = joblib.load(artifact_path)
        _model_version = "xgb-ondoy-001"
        logger.info(
            "Loaded ML model from %s (version=%s)", artifact_path, _model_version
        )

    except ImportError as exc:
        logger.warning(
            "ML enabled but optional dependency missing (%s). "
            "Using rule-based fallback.",
            exc,
        )
        _model = None
        _model_version = "rule-fallback-001"

    except Exception as exc:  # noqa: BLE001 — broad on purpose: never fail startup
        logger.warning(
            "ML model load failed (%s). Using rule-based fallback.", exc
        )
        _model = None
        _model_version = "rule-fallback-001"


def shutdown() -> None:
    """Release the loaded model. Called from the FastAPI lifespan shutdown."""
    global _model
    _model = None


# ---------------------------------------------------------------------------
# Prediction entry point
# ---------------------------------------------------------------------------
def predict_road_risk(payload: dict) -> dict:
    """
    Score one edge. Returns the contract response dict.

    `payload` must be a dict matching `RoadRiskRequest`. The caller (the
    FastAPI route) is responsible for validation.
    """
    fallback_used = _model is None

    if _model is not None:
        try:
            features = [
                [
                    float(payload.get("length_m", 0.0)),
                    float(payload.get("baseline_travel_time_s", 30.0)),
                    float(payload.get("elevation_context_m") or 0.0),
                    float(payload.get("max_prior_flood_depth_cm", 0.0)),
                    float(payload.get("historical_flood_frequency", 0.0)),
                    _road_class_to_code(payload.get("road_class", "unclassified")),
                    float(
                        payload.get("distance_to_documented_waterway_m", 1000.0)
                    ),
                ]
            ]
            probability = float(_model.predict_proba(features)[0, 1])
        except Exception as exc:  # noqa: BLE001 — intentional fallback catch
            logger.warning(
                "ML prediction failed (%s); using rule fallback.", exc
            )
            probability = _rule_based_probability(payload)
            fallback_used = True
            model_name = "rule_fallback"
        else:
            model_name = "xgboost"
    else:
        probability = _rule_based_probability(payload)
        model_name = "rule_fallback"

    if not math.isfinite(probability):
        probability = _rule_based_probability(payload)
        fallback_used = True
        model_name = "rule_fallback"

    probability = max(0.0, min(probability, 1.0))

    return {
        "edge_id": payload["edge_id"],
        "risk_probability": probability,
        "risk_level": _risk_level(probability),
        "model_name": model_name,
        "model_version": _model_version,
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "fallback_used": fallback_used,
        "ml_penalty_seconds": _ml_penalty(probability),
    }