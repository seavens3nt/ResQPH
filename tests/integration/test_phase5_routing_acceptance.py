"""Phase 5 Routing and ML Fallback Acceptance Regression.

Verifies the production API continues to return deterministic, bounded U-Belt
routes even when the ML subsystem is disabled, missing, corrupt, or incompatible.
"""
from __future__ import annotations

import hashlib

import pytest
from test_team_phase2_route_flow import (
    NO_ROUTE_REQUEST,
    ROUTE_REQUEST,
    headers,
    make_client,
)

from app.core.config import settings
from app.integrations import ml_inference


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

    def test_checksum_mismatch_gate(self, monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
        artifact = tmp_path / "model.pkl"
        artifact.write_bytes(b"data")
        meta = tmp_path / "meta.json"
        meta.write_text("{}")

        monkeypatch.setattr(settings, "ml_enabled", True)
        monkeypatch.setattr(settings, "ml_artifact_path", str(artifact))
        monkeypatch.setattr(settings, "ml_metadata_path", str(meta))
        monkeypatch.setattr(settings, "ml_artifact_sha256", "wrong_checksum")

        ml_inference.initialize()
        assert ml_inference._fallback_reason == "checksum_mismatch"
        assert ml_inference._model is None

    def test_incompatible_metadata_gate(self, monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
        artifact = tmp_path / "model.pkl"
        artifact.write_bytes(b"dummy model")
        sha = hashlib.sha256(b"dummy model").hexdigest()

        meta = tmp_path / "meta.json"
        meta.write_text(
            '{"runtime_compatible": false, "model_name": "xgboost", '
            '"target": "wrong_target", "features": [], '
            f'"artifact_sha256": "{sha}", "model_version": "1.0"}}'
        )

        monkeypatch.setattr(settings, "ml_enabled", True)
        monkeypatch.setattr(settings, "ml_artifact_path", str(artifact))
        monkeypatch.setattr(settings, "ml_metadata_path", str(meta))
        monkeypatch.setattr(settings, "ml_artifact_sha256", sha)

        ml_inference.initialize()
        assert ml_inference._fallback_reason == "metadata_contract_mismatch"
        assert ml_inference._model is None