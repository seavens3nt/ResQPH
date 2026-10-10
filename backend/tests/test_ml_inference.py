"""
Tests for the ML road-risk adapter.

Exercises the default fallback, artifact gates, and the approved-model path
without adding optional ML packages to the core backend environment.
"""
from __future__ import annotations

import hashlib
import json

import pytest
from app.core.config import settings
from app.integrations import ml_inference
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_ml_adapter() -> None:
    settings.ml_enabled = False
    settings.ml_artifact_path = ""
    settings.ml_metadata_path = ""
    settings.ml_artifact_sha256 = ""
    ml_inference.initialize()
    yield
    settings.ml_enabled = False
    settings.ml_artifact_path = ""
    settings.ml_metadata_path = ""
    settings.ml_artifact_sha256 = ""
    ml_inference.initialize()


SAMPLE_REQUEST = {
    "edge_id": "edge-test-001",
    "road_class": "residential",
    "length_m": 120.0,
    "baseline_travel_time_s": 30.0,
    "historical_flood_frequency": 0.4,
    "max_prior_flood_depth_cm": 25.0,
    "distance_to_documented_waterway_m": 300.0,
    "elevation_context_m": 2.5,
    "rainfall_band_before_outcome": "heavy",
}


def test_endpoint_returns_valid_contract_shape(client: TestClient) -> None:
    r = client.post("/api/v1/ml/road-risk", json=SAMPLE_REQUEST)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["edge_id"] == "edge-test-001"
    assert 0.0 <= body["risk_probability"] <= 1.0
    assert body["risk_level"] in {"low", "moderate", "high", "severe"}
    assert 0 <= body["ml_penalty_seconds"] <= 60
    assert isinstance(body["fallback_used"], bool)
    assert body["fallback_reason"] == "ml_disabled"
    assert "model_name" in body
    assert "model_version" in body
    assert "generated_at" in body


def test_invalid_input_rejected(client: TestClient) -> None:
    bad = dict(SAMPLE_REQUEST)
    bad["length_m"] = -5.0  # negative length
    r = client.post("/api/v1/ml/road-risk", json=bad)
    assert r.status_code == 422


def test_missing_required_field_rejected(client: TestClient) -> None:
    bad = dict(SAMPLE_REQUEST)
    del bad["edge_id"]
    r = client.post("/api/v1/ml/road-risk", json=bad)
    assert r.status_code == 422


def test_unknown_rainfall_band_rejected(client: TestClient) -> None:
    bad = dict(SAMPLE_REQUEST)
    bad["rainfall_band_before_outcome"] = "live-forecast"
    r = client.post("/api/v1/ml/road-risk", json=bad)
    assert r.status_code == 422


def test_fallback_probability_in_range(client: TestClient) -> None:
    """Multiple inputs must all yield in-range probabilities."""
    for elevation in [None, -1.0, 0.0, 5.0, 50.0]:
        payload = dict(SAMPLE_REQUEST)
        payload["elevation_context_m"] = elevation
        r = client.post("/api/v1/ml/road-risk", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert 0.0 <= body["risk_probability"] <= 1.0
        assert 0 <= body["ml_penalty_seconds"] <= 60


def test_penalty_matches_probability(client: TestClient) -> None:
    """Per ML_FEASIBILITY.md: penalty = round(clamp(p, 0, 1) * 60)."""
    r = client.post("/api/v1/ml/road-risk", json=SAMPLE_REQUEST)
    body = r.json()
    expected = round(body["risk_probability"] * 60)
    assert body["ml_penalty_seconds"] == expected


def _configure_artifact(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
    metadata: dict,
    *,
    configured_sha256: str | None = None,
):
    artifact = tmp_path / "model.pkl"
    artifact.write_bytes(b"controlled-test-artifact")
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    metadata["artifact_sha256"] = digest
    metadata_path = tmp_path / "model.metadata.json"
    metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

    monkeypatch.setattr(settings, "ml_enabled", True)
    monkeypatch.setattr(settings, "ml_artifact_path", str(artifact))
    monkeypatch.setattr(settings, "ml_metadata_path", str(metadata_path))
    monkeypatch.setattr(
        settings,
        "ml_artifact_sha256",
        configured_sha256 if configured_sha256 is not None else digest,
    )
    return artifact, digest


def test_checksum_mismatch_rejects_artifact_before_unpickling(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    metadata = {
        "runtime_compatible": True,
        "model_name": "xgboost",
        "model_version": "xgb-test-001",
        "target": ml_inference.RUNTIME_TARGET,
        "features": ml_inference.RUNTIME_MODEL_FEATURES,
    }
    _configure_artifact(
        tmp_path,
        monkeypatch,
        metadata,
        configured_sha256="0" * 64,
    )
    monkeypatch.setattr(
        ml_inference,
        "_load_serialized_model",
        lambda _: pytest.fail("checksum mismatch must be rejected before unpickling"),
    )

    ml_inference.initialize()
    result = ml_inference.predict_road_risk(SAMPLE_REQUEST)

    assert result["fallback_used"] is True
    assert result["fallback_reason"] == "checksum_mismatch"


def test_external_experiment_schema_is_not_runtime_compatible(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    metadata = {
        "runtime_compatible": False,
        "model_name": "xgboost",
        "model_version": "xgb-ondoy-exploratory-001",
        "target": "flooded_ondoy_2009",
        "features": [
            "road_length_m",
            "speed_kph",
            "elevation_m",
            "flood_depth_m",
            "flood_hazard_class",
            "road_class_code",
            "distance_to_evac_m",
        ],
    }
    _configure_artifact(tmp_path, monkeypatch, metadata)
    monkeypatch.setattr(
        ml_inference,
        "_load_serialized_model",
        lambda _: pytest.fail("incompatible metadata must prevent unpickling"),
    )

    ml_inference.initialize()
    result = ml_inference.predict_road_risk(SAMPLE_REQUEST)

    assert result["fallback_used"] is True
    assert result["fallback_reason"] == "metadata_contract_mismatch"
    assert result["model_name"] == "rule_fallback"


def test_compatible_artifact_can_activate_after_all_gates_pass(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    metadata = {
        "runtime_compatible": True,
        "model_name": "xgboost",
        "model_version": "xgb-ubelt-test-001",
        "target": ml_inference.RUNTIME_TARGET,
        "features": ml_inference.RUNTIME_MODEL_FEATURES,
    }
    _configure_artifact(tmp_path, monkeypatch, metadata)
    fake_model = object()
    monkeypatch.setattr(ml_inference, "_load_serialized_model", lambda _: fake_model)
    monkeypatch.setattr(
        ml_inference,
        "_predict_loaded_model",
        lambda model, row: 0.8 if model is fake_model else 0.0,
    )

    ml_inference.initialize()
    result = ml_inference.predict_road_risk(SAMPLE_REQUEST)

    assert result["fallback_used"] is False
    assert result["fallback_reason"] is None
    assert result["model_name"] == "xgboost"
    assert result["model_version"] == "xgb-ubelt-test-001"
    assert result["risk_probability"] == 0.8


def test_prediction_failure_reports_rule_fallback(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    metadata = {
        "runtime_compatible": True,
        "model_name": "xgboost",
        "model_version": "xgb-ubelt-test-001",
        "target": ml_inference.RUNTIME_TARGET,
        "features": ml_inference.RUNTIME_MODEL_FEATURES,
    }
    _configure_artifact(tmp_path, monkeypatch, metadata)
    monkeypatch.setattr(ml_inference, "_load_serialized_model", lambda _: object())

    def fail_prediction(model, row):
        raise ValueError("controlled test failure")

    monkeypatch.setattr(ml_inference, "_predict_loaded_model", fail_prediction)

    ml_inference.initialize()
    result = ml_inference.predict_road_risk(SAMPLE_REQUEST)

    assert result["fallback_used"] is True
    assert result["fallback_reason"] == "prediction_failed"
    assert result["model_name"] == "rule_fallback"
    assert result["model_version"] == "rule-fallback-001"
    assert ml_inference._model is None

    later_result = ml_inference.predict_road_risk(SAMPLE_REQUEST)
    assert later_result["fallback_reason"] == "prediction_failed"


def test_runtime_feature_row_has_stable_order_and_meaning() -> None:
    row = ml_inference._runtime_feature_row(SAMPLE_REQUEST)

    assert list(row) == ml_inference.RUNTIME_MODEL_FEATURES
    assert row["road_class_code"] == 7.0
    assert row["length_m"] == 120.0
    assert row["baseline_travel_time_s"] == 30.0
    assert row["max_prior_flood_depth_cm"] == 25.0
    assert row["rainfall_band_code"] == 3.0
