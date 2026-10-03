"""Verify rejected ML cannot alter the real controlled route API."""

from pathlib import Path

import pytest
from test_team_phase2_route_flow import (
    NO_ROUTE_REQUEST,
    ROUTE_REQUEST,
    headers,
    make_client,
)

from app.core.config import settings
from app.integrations import ml_inference

EXPERIMENT = (
    Path(__file__).resolve().parents[2]
    / "ml/external-experiments/ondoy-2009-metro-manila/artifacts"
)
RISK_REQUEST = {
    "edge_id": "ubelt-v1:1037130917:1037130787:0",
    "road_class": "residential",
    "length_m": 120.0,
    "baseline_travel_time_s": 30.0,
    "historical_flood_frequency": 0.4,
    "max_prior_flood_depth_cm": 25.0,
    "distance_to_documented_waterway_m": 300.0,
    "elevation_context_m": 2.5,
    "rainfall_band_before_outcome": "heavy",
}


@pytest.mark.parametrize(
    "mode,reason",
    [
        ("disabled", "ml_disabled"),
        ("missing", "artifact_not_found"),
        ("corrupt", "checksum_mismatch"),
        ("incompatible", "metadata_contract_mismatch"),
    ],
)
def test_rejected_ml_preserves_route_and_no_route(
    mode: str, reason: str, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    artifact = EXPERIMENT / "road_flood_classifier.pkl"
    digest = (EXPERIMENT / "SHA256SUMS").read_text().split()[0]
    client = make_client()
    baseline = client.post(
        "/api/v1/routes/evaluate",
        json={**ROUTE_REQUEST, "include_ml_penalty": False},
        headers=headers(),
    )
    assert baseline.status_code == 200, baseline.text

    with monkeypatch.context() as patch:
        patch.setattr(settings, "ml_enabled", mode != "disabled")
        patch.setattr(
            settings, "ml_artifact_path",
            str(tmp_path / "missing.pkl") if mode == "missing" else str(artifact),
        )
        patch.setattr(settings, "ml_metadata_path", str(EXPERIMENT / "flood_classifier_metadata.json"))
        patch.setattr(settings, "ml_artifact_sha256", "0" * 64 if mode == "corrupt" else digest)
        patch.setattr(
            ml_inference, "_load_serialized_model",
            lambda _: pytest.fail("Rejected artifact must never be deserialized"),
        )
        try:
            ml_inference.initialize()
            risk = ml_inference.predict_road_risk(RISK_REQUEST)
            assert risk["fallback_used"] is True
            assert risk["fallback_reason"] == reason
            assert risk["model_name"] == "rule_fallback"

            first = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())
            second = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())
            assert first.status_code == second.status_code == 200
            assert first.json() == second.json() == baseline.json()
            route = first.json()
            assert route["cost_breakdown"]["ml_risk"] == 0
            assert route["fallback_used"] is True
            assert route["model_version"] is None
            assert any("Runtime ML is disabled" in warning for warning in route["warnings"])
            assert route["edge_ids"] == [
                "ubelt-v1:1037130917:1037130787:0",
                "ubelt-v1:1037130787:68082882:0",
            ]

            blocked = client.post("/api/v1/routes/evaluate", json=NO_ROUTE_REQUEST, headers=headers())
            assert blocked.status_code == 200, blocked.text
            assert blocked.json()["status"] == "no-route"
            assert "geometry" not in blocked.json()
            assert "edge_ids" not in blocked.json()
        finally:
            ml_inference.shutdown()
