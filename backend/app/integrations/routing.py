"""Narrow adapter for the deterministic routing engine boundary."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from pydantic import TypeAdapter, ValidationError

from app.integrations.geospatial import (
    GeospatialFixtureConfig,
    load_geospatial_fixtures,
)
from app.schemas.geospatial import GeospatialFixtureBundle
from app.schemas.routing import (
    RouteEvaluateResponse,
    RouteFoundResponse,
    RouteRequest,
)

ML_DISABLED_WARNING = "Runtime ML is disabled; deterministic rules were used."


class RoutingIntegrationError(Exception):
    """Raised when deterministic routing cannot produce a valid domain result."""

    def __init__(
        self,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or []


@dataclass(frozen=True)
class RoutingEngineRequest:
    origin: tuple[float, float]
    destination: tuple[float, float]
    scenario_id: str
    algorithm: str
    include_ml_penalty: bool
    geospatial: GeospatialFixtureBundle


class RoutingEngine(Protocol):
    def evaluate_route(self, request: RoutingEngineRequest) -> dict[str, Any]:
        """Return a route-found or no-route result matching the routing contract."""


class UnavailableRoutingEngine:
    """Default engine used until the routing package exposes route calculation."""

    def evaluate_route(self, request: RoutingEngineRequest) -> dict[str, Any]:
        raise RoutingIntegrationError(
            "routing_engine_unavailable",
            "The deterministic routing engine is unavailable.",
            [
                {
                    "field": "routing_engine",
                    "reason": "no accepted routing calculation entry point is installed",
                }
            ],
        )


class RoutingAdapter:
    """Translate backend requests to the routing engine and validate results."""

    def __init__(
        self,
        engine: RoutingEngine | None = None,
        fixture_config: GeospatialFixtureConfig | None = None,
    ) -> None:
        self._engine = engine or UnavailableRoutingEngine()
        self._fixture_config = fixture_config

    def evaluate(self, request: RouteRequest) -> RouteEvaluateResponse:
        geospatial = load_geospatial_fixtures(self._fixture_config)
        engine_request = RoutingEngineRequest(
            origin=tuple(request.origin.coordinates),
            destination=tuple(request.destination.coordinates),
            scenario_id=request.scenario_id,
            algorithm=request.algorithm,
            include_ml_penalty=request.include_ml_penalty,
            geospatial=geospatial,
        )
        result = self._engine.evaluate_route(engine_request)
        return validate_routing_result(result)


def validate_routing_result(result: Any) -> RouteEvaluateResponse:
    """Validate route-found/no-route output from the deterministic engine."""

    if not isinstance(result, dict):
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine returned a malformed result.",
            [{"field": "result", "reason": "expected object"}],
        )

    status = result.get("status")
    if status not in {"route-found", "no-route"}:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine returned an unknown route status.",
            [{"field": "status", "reason": f"expected route-found or no-route, got {status}"}],
        )

    try:
        parsed = TypeAdapter(RouteEvaluateResponse).validate_python(result)
    except ValidationError as exc:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine result does not match the response contract.",
            [
                {
                    "field": ".".join(str(part) for part in error["loc"]),
                    "reason": str(error["msg"]),
                }
                for error in exc.errors()
            ],
        ) from exc

    if isinstance(parsed, RouteFoundResponse):
        _validate_route_found_contract(parsed)

    return parsed


def _validate_route_found_contract(result: RouteFoundResponse) -> None:
    breakdown_total = (
        result.cost_breakdown.base
        + result.cost_breakdown.deterministic_risk
        + result.cost_breakdown.ml_risk
    )
    if result.total_cost != breakdown_total:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine cost breakdown does not match total_cost.",
            [
                {
                    "field": "total_cost",
                    "reason": f"expected {breakdown_total}, got {result.total_cost}",
                }
            ],
        )

    if result.cost_breakdown.ml_risk != 0:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine returned an ML cost while runtime ML is disabled.",
            [{"field": "cost_breakdown.ml_risk", "reason": "expected 0"}],
        )
    if result.fallback_used is not True:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine must expose deterministic fallback while runtime ML is disabled.",
            [{"field": "fallback_used", "reason": "expected true"}],
        )
    if result.model_version is not None:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine must not expose an ML model version while runtime ML is disabled.",
            [{"field": "model_version", "reason": "expected null"}],
        )
    if ML_DISABLED_WARNING not in result.warnings:
        raise RoutingIntegrationError(
            "routing_engine_malformed_result",
            "Routing engine result must warn that runtime ML is disabled.",
            [{"field": "warnings", "reason": f"missing {ML_DISABLED_WARNING}"}],
        )
