"""Merged-main Team Phase 2 engine-to-API acceptance checks."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.api.routes.routing import router
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)

ROUTE_REQUEST = {
    "origin": {"type": "Point", "coordinates": [120.9938198, 14.5977093]},
    "destination": {"type": "Point", "coordinates": [120.9931743, 14.5983287]},
    "scenario_id": "scenario-controlled-ubelt-001",
    "algorithm": "astar",
    "include_ml_penalty": True,
}

NO_ROUTE_REQUEST = {
    **ROUTE_REQUEST,
    "destination": {"type": "Point", "coordinates": [121.0036128, 14.6117538]},
}


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    return TestClient(app)


def headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "coordinator-gate", "X-Demo-Role": "coordinator"}


def test_real_engine_response_survives_the_api_contract_deterministically() -> None:
    client = make_client()

    first = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())
    second = client.post("/api/v1/routes/evaluate", json=ROUTE_REQUEST, headers=headers())

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json() == second.json()

    body = first.json()
    assert body["status"] == "route-found"
    assert body["algorithm"] == "astar"
    assert body["geometry"]["type"] == "LineString"
    assert len(body["geometry"]["coordinates"]) >= 2
    assert body["edge_ids"]
    assert body["total_cost"] == sum(body["cost_breakdown"].values())
    assert body["cost_breakdown"]["ml_risk"] == 0
    assert body["fallback_used"] is True
    assert body["model_version"] is None
    assert any("Runtime ML is disabled" in warning for warning in body["warnings"])
    assert "live navigation" in " ".join(body["warnings"])


def test_no_route_survives_without_substitute_geometry() -> None:
    response = make_client().post(
        "/api/v1/routes/evaluate",
        json=NO_ROUTE_REQUEST,
        headers=headers(),
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "no-route"
    assert body["reason"] == "controlled_impassability_disconnected_destination"
    assert "geometry" not in body
    assert "edge_ids" not in body
    assert any("No eligible route" in warning for warning in body["warnings"])
