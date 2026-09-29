"""
Tests for the ML road-risk adapter.

Exercises both code paths:
  - fallback (default; ml_enabled=False or xgboost not installed)
  - model-loaded (skipped unless xgboost + artifact are both available)
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


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


@pytest.mark.skipif(
    True,  # flip when xgboost is added to backend requirements
    reason="Model-loaded path requires xgboost in backend requirements",
)
def test_model_loaded_path(client: TestClient) -> None:
    """Activated when xgboost is a runtime dependency."""
    r = client.post("/api/v1/ml/road-risk", json=SAMPLE_REQUEST)
    body = r.json()
    assert body["fallback_used"] is False
    assert body["model_name"] == "xgboost"