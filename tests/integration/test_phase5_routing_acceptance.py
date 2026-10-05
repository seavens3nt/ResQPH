"""Phase 5 Routing and ML Fallback Acceptance Regression.

Verifies the production API continues to return deterministic, bounded U-Belt
routes even when the ML subsystem is disabled, missing, corrupt, or incompatible.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from resqph_routing.costs import compute_edge_cost
from test_team_phase2_route_flow import (
    NO_ROUTE_REQUEST,
    ROUTE_REQUEST,
    headers,
    make_client,
)
from test_team_phase3_ml_route_fallback import RISK_REQUEST

from app.core.config import settings
from app.integrations import ml_inference
from app.integrations.geospatial import STUDY_AREA_BOUNDS

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "ml/external-experiments/ondoy-2009-metro-manila/artifacts"


@pytest.fixture(autouse=True)
def isolate_ml_state(monkeypatch: pytest.MonkeyPatch):
    """Restore adapter globals and settings even if an assertion fails."""
    for name in ("_model", "_model_name", "_model_version", "_fallback_reason"):
        monkeypatch.setattr(ml_inference, name, getattr(ml_inference, name))
    monkeypatch.setattr(settings, "ml_enabled", False)
    ml_inference.initialize()
    yield


class TestRoutingAcceptanceRegression:
    """Production-engine/API regression for bounded U-Belt inputs."""

    def test_controlled_route_found_with_deterministic_penalties(self) -> None:
        client = make_client()
        response = client.post(
            "/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers()
        )
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["status"] == "route-found"
        assert body["algorithm"] == "astar"
        assert "geometry" in body
        assert body["geometry"]["type"] == "LineString"
        assert len(body["geometry"]["coordinates"]) >= 2
        assert body["edge_ids"]
        repeated = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())
        assert repeated.status_code == 200
        assert repeated.json() == body
        assert body["edge_ids"] == [
            "ubelt-v1:1037130917:1037130787:0",
            "ubelt-v1:1037130787:68082882:0",
        ]
        scenario = json.loads((ROOT / "data/samples/ubelt-v1-flood-join.geojson").read_text())
        excluded = {
            feature["properties"]["edge_id"]
            for feature in scenario["features"]
            if feature["properties"]["passability"] == "impassable"
            or feature["properties"]["flood_level"] == "severe"
        }
        assert excluded
        assert excluded.isdisjoint(body["edge_ids"])
        for longitude, latitude in body["geometry"]["coordinates"]:
            assert STUDY_AREA_BOUNDS["west"] <= longitude <= STUDY_AREA_BOUNDS["east"]
            assert STUDY_AREA_BOUNDS["south"] <= latitude <= STUDY_AREA_BOUNDS["north"]
        # Moderate/restricted (90+180) plus high/restricted (240+180).
        assert body["cost_breakdown"]["deterministic_risk"] == 690
        assert body["total_cost"] == sum(body["cost_breakdown"].values())
        assert body["model_version"] is None

        # Deterministic penalties applied, no invented ML predictions
        assert body["fallback_used"] is True
        assert body["cost_breakdown"]["ml_risk"] == 0

        # Truthful warnings
        warnings_text = " ".join(body["warnings"])
        assert "live navigation" in warnings_text

    def test_geometry_free_no_route_for_disconnected_destination(self) -> None:
        client = make_client()
        response = client.post(
            "/api/v1/routes/evaluate", json=NO_ROUTE_REQUEST, headers=headers()
        )
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["status"] == "no-route"
        assert "geometry" not in body
        assert "edge_ids" not in body
        assert "route_id" not in body
        assert "total_cost" not in body
        assert body["reason"] == "controlled_impassability_disconnected_destination"
        warnings_text = " ".join(body["warnings"])
        assert (
            "No eligible route" in warnings_text
            or "impassable" in warnings_text.lower()
            or "disconnected" in warnings_text.lower()
        )


class TestMLFallbackTruthfulness:
    """Verify disabled/missing/corrupt/incompatible ML uses rule fallback."""

    def test_disabled_ml_uses_rule_fallback(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "ml_enabled", False)
        client = make_client()
        response = client.post(
            "/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers()
        )
        assert response.status_code == 200
        body = response.json()

        assert body["status"] == "route-found"
        assert body["fallback_used"] is True
        assert body["cost_breakdown"]["ml_risk"] == 0
        assert "live navigation" in " ".join(body["warnings"])


class TestMLInferenceGates:
    """Module-level verification of missing/corrupt/incompatible ML gates."""

    def test_missing_artifact_gate(self, monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
        monkeypatch.setattr(settings, "ml_enabled", True)
        monkeypatch.setattr(settings, "ml_artifact_path", str(tmp_path / "missing.pkl"))
        monkeypatch.setattr(settings, "ml_metadata_path", str(tmp_path / "missing.json"))
        monkeypatch.setattr(settings, "ml_artifact_sha256", "a" * 64)

        ml_inference.initialize()
        assert ml_inference._fallback_reason == "artifact_not_found"
        assert ml_inference._model is None


@pytest.mark.parametrize("endpoint", ["origin", "destination"])
@pytest.mark.parametrize(
    "coordinates",
    [
        [STUDY_AREA_BOUNDS["west"] - 0.001, 14.605],
        [STUDY_AREA_BOUNDS["east"] + 0.001, 14.605],
        [120.993, STUDY_AREA_BOUNDS["south"] - 0.001],
        [120.993, STUDY_AREA_BOUNDS["north"] + 0.001],
        [14.605, 120.993],
        [True, 14.605],
    ],
)
def test_invalid_points_are_rejected(endpoint, coordinates) -> None:
    request = {**ROUTE_REQUEST, endpoint: {"type": "Point", "coordinates": coordinates}}
    response = make_client().post("/api/v1/routes/evaluate", json=request, headers=headers())
    assert response.status_code == 422, response.text
    assert "geometry" not in response.json()


@pytest.mark.parametrize("level,penalty", [("none", 0), ("low", 30), ("moderate", 90), ("high", 240)])
def test_locked_penalties_are_additive(level, penalty) -> None:
    cost = compute_edge_cost(
        "controlled-edge", 20, flood_level=level, passability="restricted",
        has_obstacle=True, is_stale_or_uncertain=True,
    )
    assert cost.flood_penalty == penalty
    assert cost.restricted_penalty == 180
    assert cost.obstacle_penalty == 120
    assert cost.uncertainty_penalty == 60
    assert cost.ml_penalty == 0
    assert cost.total_cost == 20 + penalty + 180 + 120 + 60


@pytest.mark.parametrize("properties", [{"flood_level": "severe"}, {"passability": "impassable"}])
def test_ml_cannot_restore_excluded_edges(properties) -> None:
    cost = compute_edge_cost(
        "excluded-edge", 20, ml_probability=0, ml_accepted=True, **properties
    )
    assert cost.excluded is True
    assert cost.total_cost is None


@pytest.mark.parametrize(
    "mode,reason",
    [("disabled", "ml_disabled"), ("missing", "artifact_not_found"),
     ("corrupt", "checksum_mismatch"), ("incompatible", "metadata_contract_mismatch")],
)
def test_rejection_prevents_loading_and_preserves_api(
    mode: str, reason: str, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    client = make_client()
    baseline = client.post(
        "/api/v1/routes/evaluate",
        json={**ROUTE_REQUEST, "include_ml_penalty": False}, headers=headers(),
    )
    assert baseline.status_code == 200
    artifact = ARTIFACTS / "road_flood_classifier.pkl"
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    if mode == "missing":
        artifact = tmp_path / "missing.pkl"
    elif mode == "corrupt":
        artifact = tmp_path / "tampered.pkl"
        artifact.write_bytes(b"tampered model contents")
    monkeypatch.setattr(settings, "ml_enabled", mode != "disabled")
    monkeypatch.setattr(settings, "ml_artifact_path", str(artifact))
    monkeypatch.setattr(settings, "ml_metadata_path", str(ARTIFACTS / "flood_classifier_metadata.json"))
    monkeypatch.setattr(settings, "ml_artifact_sha256", digest)
    monkeypatch.setattr(
        ml_inference, "_load_serialized_model",
        lambda _: pytest.fail("Rejected models must not be deserialized"),
    )
    ml_inference.initialize()
    risk = ml_inference.predict_road_risk(RISK_REQUEST)
    assert risk["fallback_used"] is True
    assert risk["fallback_reason"] == reason
    assert risk["model_name"] == "rule_fallback"
    assert risk["model_version"] == "rule-fallback-001"
    assert 0 <= risk["risk_probability"] <= 1
    assert ml_inference._model is None
    result = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())
    assert result.status_code == 200
    assert result.json() == baseline.json()
    blocked = client.post("/api/v1/routes/evaluate", json=NO_ROUTE_REQUEST, headers=headers())
    assert blocked.status_code == 200
    assert blocked.json()["status"] == "no-route"
    assert {"geometry", "edge_ids"}.isdisjoint(blocked.json())
