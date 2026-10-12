from app.core.config import settings
from app.integrations.geospatial import DEFAULT_ROAD_FIXTURE
from app.integrations.routing import RoutingAdapter
from app.schemas.routing import RouteRequest
from app.services.stations import load_station_catalog


def test_all_supplied_station_origins_route_to_the_same_incident_within_snap_limit() -> None:
    adapter = RoutingAdapter()
    stations = load_station_catalog()["stations"]
    destination = {"type": "Point", "coordinates": [120.9931743, 14.5983287]}
    assert DEFAULT_ROAD_FIXTURE.name == "ubelt-station-network.geojson"

    for station in stations:
        result = adapter.evaluate(RouteRequest(
            origin=station["point"],
            destination=destination,
            scenario_id="scenario-controlled-ubelt-001",
            algorithm="astar",
            include_ml_penalty=False,
        ))
        assert result.status == "route-found", station["station_id"]
        assert result.geometry.coordinates[0] != result.geometry.coordinates[-1]
        assert result.snapped_origin["distance_m"] <= settings.route_snap_max_distance_m
        assert result.snapped_destination["distance_m"] <= settings.route_snap_max_distance_m


def test_coincident_distance_projections_do_not_invent_a_positive_road_loop() -> None:
    point = load_station_catalog()["stations"][0]["point"]
    result = RoutingAdapter().evaluate(RouteRequest(
        origin=point, destination=point, scenario_id="scenario-controlled-ubelt-001",
        selection_mode="distance",
    ))
    assert result.status == "no-route"
    assert result.reason == "origin_and_destination_project_to_same_point"
