"""Narrow adapter for the deterministic routing engine boundary."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Any, Protocol

from pydantic import TypeAdapter, ValidationError
from resqph_routing import (
    GraphValidationError,
    NoRouteResult,
    RouteResult,
    RoutingGraph,
    RoutingInputError,
    build_graph_from_geojson,
    collect_warnings,
    find_route,
)

from app.integrations.geospatial import (
    GeospatialFixtureConfig,
    load_geospatial_fixtures,
)
from app.schemas.geospatial import GeospatialFixtureBundle, GeospatialFixtureError
from app.schemas.routing import (
    RouteEvaluateResponse,
    RouteFoundResponse,
    RouteRequest,
)

ML_DISABLED_WARNING = "Runtime ML is disabled; deterministic rules were used."
CONTROLLED_SCENARIO_WARNING = (
    "Synthetic controlled scenario; not live navigation data."
)


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
    """Explicit degraded engine used by unavailable-path tests."""

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


class DeterministicRoutingEngine:
    """Run the accepted pure routing package against validated U-Belt fixtures."""

    def evaluate_route(self, request: RoutingEngineRequest) -> dict[str, Any]:
        road_payload = request.geospatial.road_edges.model_dump(mode="json")
        flood_payload = request.geospatial.flood_scenario.model_dump(mode="json")

        try:
            graph = build_graph_from_geojson(
                road_payload,
                flood_payload,
                ml_results=None,
                ml_accepted=False,
            )
            node_coordinates = _node_coordinates(road_payload)
            origin_node = _nearest_node(request.origin, node_coordinates)
            destination_node = _nearest_node(request.destination, node_coordinates)
            result = find_route(graph, origin_node, destination_node)
        except (GraphValidationError, RoutingInputError, ValueError) as exc:
            raise RoutingIntegrationError(
                "routing_engine_unavailable",
                "The deterministic routing engine rejected its controlled inputs.",
                [{"field": "routing_engine", "reason": str(exc)}],
            ) from exc

        scenario = request.geospatial.flood_scenario.scenario
        fixture_notice = (
            request.geospatial.flood_scenario.fixture_notice
            or "Synthetic academic scenario; not live flood evidence."
        )

        if origin_node == destination_node:
            return {
                "fixture_notice": fixture_notice,
                "status": "no-route",
                "reason": "origin_and_destination_resolve_to_same_node",
                "warnings": _unique(
                    [
                        "Origin and destination resolve to the same fixture node; no route geometry was produced.",
                        CONTROLLED_SCENARIO_WARNING,
                        ML_DISABLED_WARNING,
                    ]
                ),
                "scenario_timestamp": scenario.scenario_timestamp,
            }

        if isinstance(result, NoRouteResult):
            return {
                "fixture_notice": fixture_notice,
                "status": "no-route",
                "reason": result.reason,
                "warnings": _unique(
                    [
                        *collect_warnings(result),
                        "No eligible route exists under the selected controlled scenario.",
                        CONTROLLED_SCENARIO_WARNING,
                        ML_DISABLED_WARNING,
                    ]
                ),
                "scenario_timestamp": scenario.scenario_timestamp,
            }

        if not isinstance(result, RouteResult) or not result.edge_ids:
            raise RoutingIntegrationError(
                "routing_engine_malformed_result",
                "The deterministic routing engine returned an empty route.",
                [{"field": "edge_ids", "reason": "expected at least one edge"}],
            )

        geometry = _route_geometry(graph, result.edge_ids)
        selected_edges = [graph.get_edge(edge_id) for edge_id in result.edge_ids]
        if any(edge is None for edge in selected_edges):
            raise RoutingIntegrationError(
                "routing_engine_malformed_result",
                "The deterministic routing engine returned an unknown edge.",
                [{"field": "edge_ids", "reason": "selected edge missing from graph"}],
            )

        edges = [edge for edge in selected_edges if edge is not None]
        distance_m = sum(edge.length_m or 0.0 for edge in edges)
        estimated_time_s = sum(
            edge.travel_time_s or edge.base_cost for edge in edges
        )
        breakdown = result.aggregate_cost_breakdown
        route_key = "|".join(
            [request.scenario_id, origin_node, destination_node, *result.edge_ids]
        )
        route_id = "route-" + hashlib.sha256(route_key.encode("utf-8")).hexdigest()[:16]

        return {
            "fixture_notice": fixture_notice,
            "status": "route-found",
            "route_id": route_id,
            "algorithm": "astar",
            "geometry": {"type": "LineString", "coordinates": geometry},
            "distance_m": distance_m,
            "estimated_time_s": estimated_time_s,
            "total_cost": result.total_cost,
            "edge_ids": result.edge_ids,
            "cost_breakdown": breakdown,
            "fallback_used": True,
            "warnings": _unique(
                [
                    *collect_warnings(result),
                    CONTROLLED_SCENARIO_WARNING,
                    ML_DISABLED_WARNING,
                ]
            ),
            "explanation": " ".join(
                [
                    *result.explanations,
                    (
                        f"{len(graph.excluded_edges)} impassable or severe edge(s) "
                        "were excluded before search."
                    ),
                ]
            ),
            "scenario_timestamp": scenario.scenario_timestamp,
            "model_version": None,
        }


class RoutingAdapter:
    """Translate backend requests to the routing engine and validate results."""

    def __init__(
        self,
        engine: RoutingEngine | None = None,
        fixture_config: GeospatialFixtureConfig | None = None,
    ) -> None:
        self._engine = engine or DeterministicRoutingEngine()
        self._fixture_config = fixture_config

    def evaluate(self, request: RouteRequest) -> RouteEvaluateResponse:
        try:
            geospatial = load_geospatial_fixtures(self._fixture_config)
        except GeospatialFixtureError as exc:
            raise RoutingIntegrationError(
                "routing_engine_unavailable",
                "The deterministic routing engine cannot load its controlled geospatial inputs.",
                [
                    {
                        "field": f"geospatial.{detail.field}",
                        "reason": f"{exc.code}: {detail.reason}",
                    }
                    for detail in exc.details
                ],
            ) from exc

        loaded_scenario_id = geospatial.flood_scenario.scenario.scenario_id
        if loaded_scenario_id != request.scenario_id:
            raise RoutingIntegrationError(
                "routing_engine_unavailable",
                "The loaded controlled scenario does not match the route request.",
                [
                    {
                        "field": "scenario_id",
                        "reason": (
                            f"requested {request.scenario_id}, loaded {loaded_scenario_id}"
                        ),
                    }
                ],
            )

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


def _node_coordinates(road_payload: dict[str, Any]) -> dict[str, tuple[float, float]]:
    coordinates: dict[str, tuple[float, float]] = {}
    for feature in road_payload.get("features", []):
        properties = feature["properties"]
        line = feature["geometry"]["coordinates"]
        for node_id, position in (
            (properties["from_node"], line[0]),
            (properties["to_node"], line[-1]),
        ):
            point = (float(position[0]), float(position[1]))
            existing = coordinates.get(node_id)
            if existing is not None and not _same_position(existing, point):
                raise ValueError(f"node {node_id} has inconsistent fixture coordinates")
            coordinates[node_id] = point
    if not coordinates:
        raise ValueError("road fixture contains no node coordinates")
    return coordinates


def _nearest_node(
    point: tuple[float, float],
    node_coordinates: dict[str, tuple[float, float]],
) -> str:
    longitude, latitude = point
    latitude_scale = math.cos(math.radians(latitude))

    def distance_key(item: tuple[str, tuple[float, float]]) -> tuple[float, str]:
        node_id, (node_longitude, node_latitude) = item
        longitude_delta = (node_longitude - longitude) * latitude_scale
        latitude_delta = node_latitude - latitude
        return (longitude_delta**2 + latitude_delta**2, node_id)

    return min(node_coordinates.items(), key=distance_key)[0]


def _route_geometry(graph: RoutingGraph, edge_ids: list[str]) -> list[list[float]]:
    route: list[list[float]] = []
    for edge_id in edge_ids:
        edge = graph.get_edge(edge_id)
        geometry = edge.geometry if edge is not None else None
        if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
            raise RoutingIntegrationError(
                "routing_engine_malformed_result",
                "A selected routing edge has invalid geometry.",
                [{"field": f"edge_ids.{edge_id}", "reason": "expected LineString"}],
            )
        positions = [list(position[:2]) for position in geometry.get("coordinates", [])]
        if len(positions) < 2:
            raise RoutingIntegrationError(
                "routing_engine_malformed_result",
                "A selected routing edge has incomplete geometry.",
                [{"field": f"edge_ids.{edge_id}", "reason": "expected two positions"}],
            )
        if route and _same_position(tuple(route[-1]), tuple(positions[-1])):
            positions.reverse()
        if route and not _same_position(tuple(route[-1]), tuple(positions[0])):
            raise RoutingIntegrationError(
                "routing_engine_malformed_result",
                "Selected routing edge geometries are not contiguous.",
                [{"field": f"edge_ids.{edge_id}", "reason": "geometry gap"}],
            )
        route.extend(positions if not route else positions[1:])
    return route


def _same_position(
    left: tuple[float, float],
    right: tuple[float, float],
    tolerance: float = 1e-9,
) -> bool:
    return math.isclose(left[0], right[0], abs_tol=tolerance) and math.isclose(
        left[1], right[1], abs_tol=tolerance
    )


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
