"""Evidence-gated road-risk inference adapter.

The deterministic rule score is always available. A serialized model is
loaded only when every runtime gate passes: explicit enablement, configured
paths, SHA-256 verification, and an exact target/feature-schema match. The
external Ondoy experiment intentionally fails the runtime-schema gate because
it is preserved as academic evidence, not as a U-Belt runtime artifact.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import logging
import math
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

RULE_MODEL_NAME = "rule_fallback"
RULE_MODEL_VERSION = "rule-fallback-001"
RUNTIME_TARGET = "high_risk_edge"
RUNTIME_MODEL_FEATURES = [
    "road_class_code",
    "length_m",
    "baseline_travel_time_s",
    "historical_flood_frequency",
    "max_prior_flood_depth_cm",
    "distance_to_documented_waterway_m",
    "elevation_context_m",
    "rainfall_band_code",
]

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
_RAINFALL_BAND_TO_CODE = {
    "none": 0,
    "light": 1,
    "moderate": 2,
    "heavy": 3,
    "extreme": 4,
    "unknown": -1,
}

_model: Any | None = None
_model_name = RULE_MODEL_NAME
_model_version = RULE_MODEL_VERSION
_fallback_reason = "ml_disabled"


def _road_class_to_code(road_class: str) -> int:
    return _ROAD_CLASS_TO_CODE.get(road_class.lower().strip(), 6)


def _rainfall_band_to_code(rainfall_band: str) -> int:
    return _RAINFALL_BAND_TO_CODE.get(rainfall_band.lower().strip(), -1)


def _rule_based_probability(payload: dict[str, Any]) -> float:
    """Return the bounded deterministic fallback score."""
    length_n = min(payload.get("length_m", 0.0) / 200.0, 1.0)
    time_n = min(payload.get("baseline_travel_time_s", 30.0) / 120.0, 1.0)
    flood_freq = max(
        0.0,
        min(payload.get("historical_flood_frequency", 0.0), 1.0),
    )
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
    elevation_n = (
        0.5
        if elevation is None
        else max(0.0, min(1.0 - float(elevation) / 10.0, 1.0))
    )
    rainfall_n = {
        "none": 0.0,
        "light": 0.2,
        "moderate": 0.5,
        "heavy": 0.8,
        "extreme": 1.0,
    }.get(str(payload.get("rainfall_band_before_outcome", "unknown")).lower(), 0.3)

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


def _risk_level(probability: float) -> str:
    if probability < 0.25:
        return "low"
    if probability < 0.50:
        return "moderate"
    if probability < 0.75:
        return "high"
    return "severe"


def _ml_penalty(probability: float) -> int:
    return round(max(0.0, min(probability, 1.0)) * 60)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as artifact:
        for chunk in iter(lambda: artifact.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _runtime_feature_row(payload: dict[str, Any]) -> dict[str, float]:
    elevation = payload.get("elevation_context_m")
    return {
        "road_class_code": float(
            _road_class_to_code(str(payload.get("road_class", "unclassified")))
        ),
        "length_m": float(payload.get("length_m", 0.0)),
        "baseline_travel_time_s": float(
            payload.get("baseline_travel_time_s", 30.0)
        ),
        "historical_flood_frequency": float(
            payload.get("historical_flood_frequency", 0.0)
        ),
        "max_prior_flood_depth_cm": float(
            payload.get("max_prior_flood_depth_cm", 0.0)
        ),
        "distance_to_documented_waterway_m": float(
            payload.get("distance_to_documented_waterway_m", 1000.0)
        ),
        "elevation_context_m": 0.0 if elevation is None else float(elevation),
        "rainfall_band_code": float(
            _rainfall_band_to_code(
                str(payload.get("rainfall_band_before_outcome", "unknown"))
            )
        ),
    }


def _load_serialized_model(path: Path) -> Any:
    import joblib
    import xgboost  # noqa: F401

    return joblib.load(path)


def _predict_loaded_model(model: Any, row: dict[str, float]) -> float:
    import pandas as pd

    frame = pd.DataFrame([row], columns=RUNTIME_MODEL_FEATURES)
    return float(model.predict_proba(frame)[0, 1])


def _use_fallback(reason: str) -> None:
    global _model, _model_name, _model_version, _fallback_reason
    _model = None
    _model_name = RULE_MODEL_NAME
    _model_version = RULE_MODEL_VERSION
    _fallback_reason = reason


def initialize() -> None:
    """Load an approved runtime artifact, or retain the safe fallback."""
    global _model, _model_name, _model_version, _fallback_reason

    if not settings.ml_enabled:
        _use_fallback("ml_disabled")
        return

    if not (
        settings.ml_artifact_path
        and settings.ml_metadata_path
        and settings.ml_artifact_sha256
    ):
        logger.warning("ML enabled without complete artifact configuration.")
        _use_fallback("artifact_configuration_missing")
        return

    artifact_path = Path(settings.ml_artifact_path)
    metadata_path = Path(settings.ml_metadata_path)
    if not artifact_path.is_file():
        _use_fallback("artifact_not_found")
        return
    if not metadata_path.is_file():
        _use_fallback("metadata_not_found")
        return

    expected_sha256 = settings.ml_artifact_sha256.lower().strip()
    if len(expected_sha256) != 64 or _sha256(artifact_path) != expected_sha256:
        logger.warning("ML artifact checksum verification failed.")
        _use_fallback("checksum_mismatch")
        return

    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _use_fallback("metadata_invalid")
        return

    metadata_valid = (
        metadata.get("runtime_compatible") is True
        and metadata.get("model_name") == "xgboost"
        and metadata.get("target") == RUNTIME_TARGET
        and metadata.get("features") == RUNTIME_MODEL_FEATURES
        and metadata.get("artifact_sha256") == expected_sha256
        and isinstance(metadata.get("model_version"), str)
        and bool(metadata.get("model_version"))
    )
    if not metadata_valid:
        logger.warning("ML artifact metadata does not match the runtime contract.")
        _use_fallback("metadata_contract_mismatch")
        return

    try:
        model = _load_serialized_model(artifact_path)
    except ImportError:
        _use_fallback("optional_dependency_missing")
        return
    except Exception:
        logger.exception("ML artifact load failed; using the rule fallback.")
        _use_fallback("artifact_load_failed")
        return

    _model = model
    _model_name = "xgboost"
    _model_version = metadata["model_version"]
    _fallback_reason = ""


def shutdown() -> None:
    _use_fallback("adapter_shutdown")


def predict_road_risk(payload: dict[str, Any]) -> dict[str, Any]:
    """Score one edge while preserving the fallback on every model failure."""
    fallback_used = _model is None
    fallback_reason = _fallback_reason if fallback_used else None
    model_name = _model_name
    model_version = _model_version

    if _model is None:
        probability = _rule_based_probability(payload)
    else:
        try:
            probability = _predict_loaded_model(
                _model,
                _runtime_feature_row(payload),
            )
        except Exception:
            logger.exception("ML prediction failed; using the rule fallback.")
            probability = _rule_based_probability(payload)
            fallback_used = True
            model_name = RULE_MODEL_NAME
            model_version = RULE_MODEL_VERSION
            fallback_reason = "prediction_failed"
            _use_fallback(fallback_reason)

    if not math.isfinite(probability):
        probability = _rule_based_probability(payload)
        fallback_used = True
        model_name = RULE_MODEL_NAME
        model_version = RULE_MODEL_VERSION
        fallback_reason = "non_finite_prediction"
        _use_fallback(fallback_reason)

    probability = max(0.0, min(probability, 1.0))
    return {
        "edge_id": payload["edge_id"],
        "risk_probability": probability,
        "risk_level": _risk_level(probability),
        "model_name": model_name,
        "model_version": model_version,
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "fallback_used": fallback_used,
        "fallback_reason": fallback_reason,
        "ml_penalty_seconds": _ml_penalty(probability),
    }
