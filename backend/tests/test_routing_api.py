from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.api.routes.routing import get_routing_adapter, router
from app.integrations.routing import RoutingIntegrationError
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)
from app.schemas.routing import RouteRequest

REPO_ROOT = Path(__file__).resolve().parents[2]
ROUTE_FOUND = json.loads(
    (REPO_ROOT / "data" / "samples" / "route-found.example.json").read_text(
        encoding="utf-8"
    )
)
NO_ROUTE = json.loads(
    (REPO_ROOT / "data" / "samples" / "no-route.example.json").read_text(
        encoding="utf-8"
    )
)

VALID_PAYLOAD = {
    "origin": {"type": "Point", "coordinates": [120.99, 14.604]},
    "destination": {"type": "Point", "coordinates": [120.9915, 14.6055]},
    "scenario_id": "scenario-controlled-ubelt-001",
    "algorithm": "astar",
    "include_ml_penalty": True,
}

REAL_ENGINE_PAYLOAD = {
    "origin": {"type": "Point", "coordinates": [120.9938198, 14.5977093]},
    "destination": {"type": "Point", "coordinates": [120.9931743, 14.5983287]},
    "scenario_id": "scenario-controlled-ubelt-001",
    "algorithm": "astar",
    "include_ml_penalty": True,
}


class FakeAdapter:
    def __init__(
        self,
        result: dict[str, Any] | None = None,
        error: RoutingIntegrationError | None = None,
    ) -> None:
        self.result = result or ROUTE_FOUND
        self.error = error
        self.calls: list[RouteRequest] = []

    def evaluate(self, payload: RouteRequest) -> dict[str, Any]:
        self.calls.append(payload)
        if self.error is not None:
            raise self.error
        return self.result


@pytest.fixture()
def fake_adapter() -> FakeAdapter:
    return FakeAdapter()


@pytest.fixture()
def client(fake_adapter: FakeAdapter) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.dependency_overrides[get_routing_adapter] = lambda: fake_adapter
    return TestClient(app)


def rescuer_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "rescuer-alpha", "X-Demo-Role": "rescuer"}


def coordinator_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "coordinator-alpha", "X-Demo-Role": "coordinator"}


def citizen_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "citizen-alpha", "X-Demo-Role": "citizen"}


def post_route(
    client: TestClient,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    return client.post(
        "/api/v1/routes/evaluate",
        json=payload or VALID_PAYLOAD,
        headers=rescuer_headers() if headers is None else headers,
    )


def test_rescuer_can_receive_route_found_response(
    client: TestClient,
    fake_adapter: FakeAdapter,
) -> None:
    response = post_route(client)

    assert response.status_code == 200, response.text
    assert response.json() == ROUTE_FOUND
    assert len(fake_adapter.calls) == 1


def test_coordinator_cannot_evaluate_routes(client: TestClient) -> None:
    response = post_route(client, headers=coordinator_headers())

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_no_route_response_is_success_without_invented_geometry(
    client: TestClient,
    fake_adapter: FakeAdapter,
) -> None:
    fake_adapter.result = NO_ROUTE

    response = post_route(client)

    assert response.status_code == 200
    body = response.json()
    assert body == NO_ROUTE
    assert "geometry" not in body
    assert "edge_ids" not in body


@pytest.mark.parametrize("headers", [citizen_headers(), {}])
def test_disallowed_or_missing_role_uses_common_error_envelope(
    client: TestClient,
    fake_adapter: FakeAdapter,
    headers: dict[str, str],
) -> None:
    response = post_route(client, headers=headers)

    assert response.status_code == (401 if not headers else 403)
    body = response.json()
    assert body["error"]["code"] in {
        "forbidden",
        "authentication_required",
        "demo_identity_required",
        "demo_role_required",
    }
    assert body["error"]["request_id"].startswith("trace-")
    assert fake_adapter.calls == []


@pytest.mark.parametrize(
    "mutation",
    [
        {"origin": {"type": "Point", "coordinates": [121.5, 14.604]}},
        {"origin": {"type": "Point", "coordinates": [14.604, 120.99]}},
        {"origin": {"type": "Point", "coordinates": [True, 14.604]}},
        {"origin": {"type": "Point", "coordinates": [120.99]}},
        {"algorithm": "dijkstra"},
        {"scenario_id": "scenario-controlled-unknown"},
        {"include_ml_penalty": "true"},
        {"unexpected": "field"},
    ],
)
def test_invalid_requests_return_422_and_do_not_call_adapter(
    client: TestClient,
    fake_adapter: FakeAdapter,
    mutation: dict[str, Any],
) -> None:
    payload = dict(VALID_PAYLOAD)
    payload.update(mutation)

    response = post_route(client, payload=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert fake_adapter.calls == []


def test_non_finite_coordinates_return_422_and_do_not_call_adapter(
    client: TestClient,
    fake_adapter: FakeAdapter,
) -> None:
    payload = dict(VALID_PAYLOAD)
    payload["origin"] = {"type": "Point", "coordinates": [float("inf"), 14.604]}

    response = client.post(
        "/api/v1/routes/evaluate",
        content=json.dumps(payload),
        headers={**rescuer_headers(), "content-type": "application/json"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert fake_adapter.calls == []


def test_unavailable_engine_returns_503(client: TestClient, fake_adapter: FakeAdapter) -> None:
    fake_adapter.error = RoutingIntegrationError(
        "routing_engine_unavailable",
        "The deterministic routing engine is unavailable.",
        [{"field": "routing_engine", "reason": "missing"}],
    )

    response = post_route(client)

    assert response.status_code == 503
    body = response.json()
    assert body["error"]["code"] == "routing_engine_unavailable"
    assert body["error"]["details"][0]["field"] == "routing_engine"


def test_malformed_engine_result_returns_500(
    client: TestClient,
    fake_adapter: FakeAdapter,
) -> None:
    fake_adapter.error = RoutingIntegrationError(
        "routing_engine_malformed_result",
        "Routing engine result does not match the response contract.",
        [{"field": "status", "reason": "expected route-found or no-route"}],
    )

    response = post_route(client)

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "routing_engine_malformed_result"
    assert body["error"]["details"][0]["field"] == "status"


def test_repeated_identical_requests_preserve_same_domain_result(
    client: TestClient,
) -> None:
    first = post_route(client)
    second = post_route(client)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_default_dependency_runs_real_engine_end_to_end() -> None:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    real_client = TestClient(app)

    response = post_route(real_client, payload=REAL_ENGINE_PAYLOAD)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "route-found"
    assert body["algorithm"] == "astar"
    assert body["fallback_used"] is True
    assert body["cost_breakdown"]["ml_risk"] == 0
    assert body["geometry"]["type"] == "LineString"
    assert body["edge_ids"] == [
        "ubelt-v1:1037130917:1037130787:0",
        "ubelt-v1:1037130787:68082882:0",
    ]


def test_openapi_exposes_route_contract(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()

    operation = schema["paths"]["/api/v1/routes/evaluate"]["post"]
    assert operation["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/RouteRequest"
    )
    assert "200" in operation["responses"]
    assert "403" in operation["responses"]
    assert "422" in operation["responses"]
    assert "503" in operation["responses"]
    assert "live flood data" in operation["description"]
    schemas = schema["components"]["schemas"]
    assert "RouteFoundResponse" in schemas
    assert "NoRouteResponse" in schemas
