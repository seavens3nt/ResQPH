from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.integrations.routing import (
    ML_DISABLED_WARNING,
    RoutingAdapter,
    RoutingEngineRequest,
    RoutingIntegrationError,
    UnavailableRoutingEngine,
)
from app.schemas.routing import RouteFoundResponse, RouteRequest

REPO_ROOT = Path(__file__).resolve().parents[2]
ROUTE_FOUND_FIXTURE = REPO_ROOT / "data" / "samples" / "route-found.example.json"
NO_ROUTE_FIXTURE = REPO_ROOT / "data" / "samples" / "no-route.example.json"

SAMPLE_REQUEST = {
    "origin": {"type": "Point", "coordinates": [120.99, 14.604]},
    "destination": {"type": "Point", "coordinates": [120.9915, 14.6055]},
    "scenario_id": "scenario-controlled-ubelt-001",
    "algorithm": "astar",
    "include_ml_penalty": True,
}


class FakeEngine:
    def __init__(self, result: dict[str, Any]) -> None:
        self.result = result
        self.requests: list[RoutingEngineRequest] = []

    def evaluate_route(self, request: RoutingEngineRequest) -> dict[str, Any]:
        self.requests.append(request)
        return self.result


def load_fixture(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def make_request(**overrides: Any) -> RouteRequest:
    payload = dict(SAMPLE_REQUEST)
    payload.update(overrides)
    return RouteRequest.model_validate(payload)


def test_route_found_result_is_preserved() -> None:
    fixture = load_fixture(ROUTE_FOUND_FIXTURE)
    adapter = RoutingAdapter(FakeEngine(fixture))

    result = adapter.evaluate(make_request())

    assert isinstance(result, RouteFoundResponse)
    assert result.model_dump(mode="json") == fixture


def test_no_route_result_is_preserved_without_invented_path() -> None:
    fixture = load_fixture(NO_ROUTE_FIXTURE)
    adapter = RoutingAdapter(FakeEngine(fixture))

    result = adapter.evaluate(make_request())

    body = result.model_dump(mode="json")
    assert body == fixture
    assert body["status"] == "no-route"
    assert "geometry" not in body
    assert "edge_ids" not in body


@pytest.mark.parametrize("include_ml_penalty", [True, False])
def test_request_translation_to_engine_interface(include_ml_penalty: bool) -> None:
    engine = FakeEngine(load_fixture(NO_ROUTE_FIXTURE))
    adapter = RoutingAdapter(engine)

    adapter.evaluate(make_request(include_ml_penalty=include_ml_penalty))

    assert len(engine.requests) == 1
    translated = engine.requests[0]
    assert translated.origin == (120.99, 14.604)
    assert translated.destination == (120.9915, 14.6055)
    assert translated.scenario_id == "scenario-controlled-ubelt-001"
    assert translated.algorithm == "astar"
    assert translated.include_ml_penalty is include_ml_penalty
    assert translated.geospatial.flood_scenario.scenario.scenario_id == (
        "scenario-controlled-ubelt-001"
    )


def test_unavailable_engine_maps_to_stable_error() -> None:
    adapter = RoutingAdapter(UnavailableRoutingEngine())

    with pytest.raises(RoutingIntegrationError) as exc_info:
        adapter.evaluate(make_request())

    assert exc_info.value.code == "routing_engine_unavailable"
    assert exc_info.value.details[0]["field"] == "routing_engine"


def test_unknown_result_status_is_rejected() -> None:
    error = evaluate_bad_result({"status": "rerouted"})

    assert error.code == "routing_engine_malformed_result"
    assert error.details[0]["field"] == "status"


def test_missing_required_route_found_field_is_rejected() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    del result["route_id"]

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert "route_id" in error.details[0]["field"]


def test_invalid_result_geometry_is_rejected() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["geometry"]["type"] = "Point"

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert any("geometry" in detail["field"] for detail in error.details)


def test_non_finite_numeric_result_is_rejected() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["total_cost"] = float("inf")

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert any("total_cost" in detail["field"] for detail in error.details)


def test_missing_fallback_field_is_rejected() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    del result["fallback_used"]

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert any("fallback_used" in detail["field"] for detail in error.details)


def test_invalid_warnings_are_rejected() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["warnings"] = [""]

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert any("warnings" in detail["field"] for detail in error.details)


@pytest.mark.parametrize(
    ("field", "value", "expected_field"),
    [
        ("fallback_used", False, "fallback_used"),
        ("model_version", "xgb-should-not-run", "model_version"),
    ],
)
def test_disabled_ml_policy_fields_are_enforced(
    field: str,
    value: Any,
    expected_field: str,
) -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result[field] = value

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert error.details[0]["field"] == expected_field


def test_disabled_ml_cost_is_enforced() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["cost_breakdown"]["ml_risk"] = 60
    result["total_cost"] = 180

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert error.details[0]["field"] == "cost_breakdown.ml_risk"


def test_disabled_ml_warning_is_required() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["warnings"] = ["Synthetic controlled scenario; not live navigation data."]

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert error.details[0]["field"] == "warnings"
    assert ML_DISABLED_WARNING in error.details[0]["reason"]


def test_cost_breakdown_must_match_total() -> None:
    result = load_fixture(ROUTE_FOUND_FIXTURE)
    result["total_cost"] = 121

    error = evaluate_bad_result(result)

    assert error.code == "routing_engine_malformed_result"
    assert error.details[0]["field"] == "total_cost"


def evaluate_bad_result(result: dict[str, Any]) -> RoutingIntegrationError:
    adapter = RoutingAdapter(FakeEngine(result))
    with pytest.raises(RoutingIntegrationError) as exc_info:
        adapter.evaluate(make_request())
    return exc_info.value
