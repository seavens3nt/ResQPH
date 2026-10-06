"""Narrow adapter for the deterministic routing engine boundary."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from itertools import pairwise
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
    find_shortest_distance_route,
)

from app.core.config import settings
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
    selection_mode: str
    geospatial: GeospatialFixtureBundle


@dataclass(frozen=True)
class SnapResult:
    node_id: str
    snapped_coordinates: tuple[float, float]
    snapped_distance_m: float
    edge_id: str


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
            origin_snaps = (
                _snap_candidates(
                    request.origin,
                    graph,
                    settings.route_snap_max_distance_m,
                )
                if request.selection_mode == "distance"
                else [
                    snap
                    for snap in [
                        _snap_to_graph(
                            request.origin,
                            graph,
                            settings.route_snap_max_distance_m,
                        )
                    ]
                    if snap is not None
                ]
            )
            destination_snaps = (
                _snap_candidates(
                    request.destination,
                    graph,
                    settings.route_snap_max_distance_m,
                )
                if request.selection_mode == "distance"
                else [
                    snap
                    for snap in [
                        _snap_to_graph(
                            request.destination,
                            graph,
                            settings.route_snap_max_distance_m,
                        )
                    ]
                    if snap is not None
                ]
            )
            if not origin_snaps or not destination_snaps:
                scenario = request.geospatial.flood_scenario.scenario
                fixture_notice = (
                    request.geospatial.flood_scenario.fixture_notice
                    or "Synthetic academic scenario; not live flood evidence."
                )
                return {
                    "fixture_notice": fixture_notice,
                    "status": "no-route",
                    "reason": "point_exceeds_maximum_road_snap_distance",
                    "warnings": _unique(
                        [
                            "Incident or team point is too far from eligible controlled-road coverage.",
                            CONTROLLED_SCENARIO_WARNING,
                            ML_DISABLED_WARNING,
                        ]
                    ),
                    "scenario_timestamp": scenario.scenario_timestamp,
                    "selection_mode": request.selection_mode,
                    "snapped_origin": _snap_payload(origin_snaps[0] if origin_snaps else None),
                    "snapped_destination": _snap_payload(
                        destination_snaps[0] if destination_snaps else None
                    ),
                }
            result, origin_snap, destination_snap = _best_snapped_route(
                graph,
                origin_snaps,
                destination_snaps,
                request.selection_mode,
            )
            origin_node = origin_snap.node_id
            destination_node = destination_snap.node_id
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
                "selection_mode": request.selection_mode,
                "snapped_origin": _snap_payload(origin_snap),
                "snapped_destination": _snap_payload(destination_snap),
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
                "selection_mode": request.selection_mode,
                "snapped_origin": _snap_payload(origin_snap),
                "snapped_destination": _snap_payload(destination_snap),
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
        total_cost = breakdown["base"] + breakdown["deterministic_risk"] + breakdown["ml_risk"]
        route_key = "|".join(
            [
                request.scenario_id,
                request.selection_mode,
                origin_node,
                destination_node,
                *result.edge_ids,
            ]
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
            "total_cost": total_cost,
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
            "selection_mode": request.selection_mode,
            "snapped_origin": _snap_payload(origin_snap),
            "snapped_destination": _snap_payload(destination_snap),
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
            selection_mode=request.selection_mode,
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


def _snap_to_graph(
    point: tuple[float, float],
    graph: RoutingGraph,
    max_distance_m: float,
) -> SnapResult | None:
    best: SnapResult | None = None
    for edge in graph.edge_index.values():
        geometry = edge.geometry if isinstance(edge.geometry, dict) else None
        positions = geometry.get("coordinates", []) if geometry else []
        if len(positions) < 2:
            continue
        for start, end in pairwise(positions):
            snapped, distance = _project_point_to_segment_m(
                point,
                (float(start[0]), float(start[1])),
                (float(end[0]), float(end[1])),
            )
            node_id = edge.from_node
            if _meters_between(snapped, tuple(positions[-1][:2])) < _meters_between(
                snapped,
                tuple(positions[0][:2]),
            ):
                node_id = edge.to_node
            candidate = SnapResult(
                node_id=node_id,
                snapped_coordinates=snapped,
                snapped_distance_m=distance,
                edge_id=edge.edge_id,
            )
            if best is None or (distance, edge.edge_id, node_id) < (
                best.snapped_distance_m,
                best.edge_id,
                best.node_id,
            ):
                best = candidate
    if best is None or best.snapped_distance_m > max_distance_m:
        return None
    return best


def _snap_candidates(
    point: tuple[float, float],
    graph: RoutingGraph,
    max_distance_m: float,
) -> list[SnapResult]:
    candidates: dict[tuple[str, str], SnapResult] = {}
    for edge in graph.edge_index.values():
        geometry = edge.geometry if isinstance(edge.geometry, dict) else None
        positions = geometry.get("coordinates", []) if geometry else []
        if len(positions) < 2:
            continue
        endpoints = [
            (edge.from_node, tuple(positions[0][:2])),
            (edge.to_node, tuple(positions[-1][:2])),
        ]
        for node_id, endpoint in endpoints:
            distance = _meters_between(point, endpoint)
            if distance > max_distance_m:
                continue
            key = (node_id, edge.edge_id)
            candidate = SnapResult(
                node_id=node_id,
                snapped_coordinates=(float(endpoint[0]), float(endpoint[1])),
                snapped_distance_m=distance,
                edge_id=edge.edge_id,
            )
            previous = candidates.get(key)
            if previous is None or candidate.snapped_distance_m < previous.snapped_distance_m:
                candidates[key] = candidate
    nearest_segment = _snap_to_graph(point, graph, max_distance_m)
    if nearest_segment is not None:
        candidates[(nearest_segment.node_id, nearest_segment.edge_id)] = nearest_segment
    return sorted(
        candidates.values(),
        key=lambda item: (item.snapped_distance_m, item.edge_id, item.node_id),
    )[:12]


def _best_snapped_route(
    graph: RoutingGraph,
    origin_snaps: list[SnapResult],
    destination_snaps: list[SnapResult],
    selection_mode: str,
) -> tuple[RouteResult | NoRouteResult, SnapResult, SnapResult]:
    first_origin = origin_snaps[0]
    first_destination = destination_snaps[0]
    first_result: RouteResult | NoRouteResult | None = None
    best: tuple[float, str, RouteResult, SnapResult, SnapResult] | None = None
    for origin_snap in origin_snaps:
        for destination_snap in destination_snaps:
            result = (
                find_shortest_distance_route(graph, origin_snap.node_id, destination_snap.node_id)
                if selection_mode == "distance"
                else find_route(graph, origin_snap.node_id, destination_snap.node_id)
            )
            if first_result is None:
                first_result = result
            if not isinstance(result, RouteResult) or not result.edge_ids:
                continue
            selected_edges = [graph.get_edge(edge_id) for edge_id in result.edge_ids]
            distance = sum(edge.length_m or 0.0 for edge in selected_edges if edge is not None)
            metric = distance if selection_mode == "distance" else result.total_cost
            route_key = "|".join(result.edge_ids)
            candidate = (metric, route_key, result, origin_snap, destination_snap)
            if best is None or candidate[:2] < best[:2]:
                best = candidate
    if best is not None:
        return best[2], best[3], best[4]
    return first_result or NoRouteResult(), first_origin, first_destination


def _project_point_to_segment_m(
    point: tuple[float, float],
    start: tuple[float, float],
    end: tuple[float, float],
) -> tuple[tuple[float, float], float]:
    longitude, latitude = point
    scale = math.cos(math.radians(latitude))
    px = longitude * scale
    py = latitude
    ax = start[0] * scale
    ay = start[1]
    bx = end[0] * scale
    by = end[1]
    dx = bx - ax
    dy = by - ay
    if math.isclose(dx, 0.0) and math.isclose(dy, 0.0):
        snapped = start
    else:
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        snapped = ((ax + t * dx) / scale, ay + t * dy)
    return snapped, _meters_between(point, snapped)


def _meters_between(left: tuple[float, float], right: tuple[float, float]) -> float:
    latitude = (left[1] + right[1]) / 2
    dx = (right[0] - left[0]) * 111_320 * math.cos(math.radians(latitude))
    dy = (right[1] - left[1]) * 110_540
    return math.hypot(dx, dy)


def _snap_payload(snap: SnapResult | None) -> dict[str, Any] | None:
    if snap is None:
        return None
    return {
        "point": {"type": "Point", "coordinates": list(snap.snapped_coordinates)},
        "distance_m": round(snap.snapped_distance_m, 3),
        "edge_id": snap.edge_id,
        "node_id": snap.node_id,
        "max_distance_m": settings.route_snap_max_distance_m,
    }


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
