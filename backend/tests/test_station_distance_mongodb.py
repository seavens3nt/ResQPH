"""Station dispatch acceptance in a fresh, disposable replica-set database."""
import asyncio
import json
import os
from datetime import UTC, datetime
from uuid import uuid4

import networkx as nx
import pytest
import pytest_asyncio
from pymongo import AsyncMongoClient
from resqph_routing import build_graph_from_geojson
from resqph_routing.endpoints import (
    attach_endpoints,
    nearest_attachments,
    physical_coverage_graph,
)

from app.db.setup import initialize_database
from app.integrations.geospatial import (
    DEFAULT_FLOOD_FIXTURE,
    DEFAULT_ROAD_FIXTURE,
    GeospatialFixtureConfig,
)
from app.integrations.routing import RoutingAdapter
from app.models.rescue_request import GeoPoint, RequestLocation, RescueRequest
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.services.assignments import AssignmentService
from app.services.stations import load_station_catalog

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(
    os.getenv("RUN_MONGODB_INTEGRATION") != "1", reason="Requires disposable MongoDB replica set")]
STATIONS = load_station_catalog()["stations"]


@pytest_asyncio.fixture
async def dispatch():
    client = AsyncMongoClient(os.environ["MONGODB_INTEGRATION_URI"], serverSelectionTimeoutMS=5000)
    name = f"resqph_station_distance_disposable_{uuid4().hex[:20]}"
    assert (await client.admin.command("hello")).get("setName")
    assert name not in await client.list_database_names()
    database = client[name]
    try:
        await initialize_database(database)
        # Equal capacity: exactly one available seeded unit per canonical station.
        await database.rescuers.update_many({}, {"$set": {"member_count": 4}})
        requests = RescueRequestRepository(database)
        rescuers = RescuerRepository(database)
        service = AssignmentService(requests, rescuers, AssignmentRepository(database))
        yield database, requests, service
    finally:
        assert name.startswith("resqph_station_distance_disposable_")
        await client.drop_database(name)
        await client.close()


async def create(requests, station=STATIONS[0], request_id=None):
    now = datetime.now(UTC)
    lon, lat = station["point"]["coordinates"]
    request = RescueRequest(id=request_id or f"request-{uuid4().hex}", citizen_id="synthetic-distance-citizen",
                            location=RequestLocation(address="Synthetic near-headquarters road test",
                                                     point=GeoPoint(coordinates=(lon + .00005, lat + .00005))),
                            headcount=2, medical_needs=False, reported_flood_level="low",
                            situation_summary="Controlled station comparison", status="pending", version=1,
                            created_at=now, updated_at=now)
    await requests.create(request)
    return request


@pytest.mark.parametrize("station", STATIONS, ids=[s["station_id"] for s in STATIONS])
async def test_five_equal_available_headquarters_comparisons(dispatch, station):
    database, requests, service = dispatch
    request = await create(requests, station)
    candidates, exclusions = await service._rank_eligible_teams(request)
    assert not exclusions
    assert len(candidates) == 5
    assert candidates[0].station_id == station["station_id"]
    roads = json.loads(DEFAULT_ROAD_FIXTURE.read_text())
    flood = json.loads(DEFAULT_FLOOD_FIXTURE.read_text())
    coverage = physical_coverage_graph(roads)
    eligible = build_graph_from_geojson(roads, flood)
    for candidate in candidates:
        assert candidate.origin_source == "base_location"
        assert candidate.route["selection_mode"] == "distance"
        assert candidate.route["snapped_origin"]["distance_m"] <= 75
        assert candidate.route["snapped_destination"]["distance_m"] <= 75
        augmented = attach_endpoints(
            eligible, nearest_attachments(tuple(candidate.routing_origin), coverage, 75),
            nearest_attachments(request.location.point.coordinates, coverage, 75),
        )
        oracle = nx.MultiDiGraph()
        for record in augmented.edge_index.values():
            oracle.add_edge(record.from_node, record.to_node, weight=record.length_m)
        assert candidate.road_distance_m == pytest.approx(nx.shortest_path_length(
            oracle, "@origin", "@destination", weight="weight",
        ))
    assigned = await service.auto_assign_best_team(request.id, 1)
    assert assigned.mission.station_id == candidates[0].station_id
    mission = await database.missions.find_one({"id": assigned.mission.id})
    assert len(mission["dispatch_provenance"]["ranked_candidates"]) == 5
    assert mission["dispatch_provenance"]["chosen_station_id"] == station["station_id"]


async def test_stale_moving_positions_do_not_change_station_dispatch(dispatch):
    database, requests, service = dispatch
    request = await create(requests)
    await database.rescuers.update_one({"id": STATIONS[0]["team_id"]}, {"$set": {
        "current_location": STATIONS[1]["point"], "position_updated_at": datetime(2020, 1, 1, tzinfo=UTC)}})
    await database.rescuers.update_one({"id": STATIONS[3]["team_id"]}, {"$set": {
        "current_location": {"type": "Point", "coordinates": [120.9932, 14.6081]}}})
    candidates, _ = await service._rank_eligible_teams(request)
    assert candidates[0].station_id == STATIONS[0]["station_id"]
    assert candidates[0].routing_origin == STATIONS[0]["point"]["coordinates"]
    assigned = await service.auto_assign_best_team(request.id, 1)
    assert assigned.mission.station_id == STATIONS[0]["station_id"]
    stored = await database.rescuers.find_one({"id": STATIONS[0]["team_id"]})
    assert stored["current_location"] == STATIONS[1]["point"]  # No live/history reset.


async def test_unavailable_and_unreachable_are_excluded_not_forced(dispatch):
    database, requests, service = dispatch
    request = await create(requests)
    await database.rescuers.update_one({"id": STATIONS[0]["team_id"]}, {"$set": {"availability": "assigned"}})
    candidates, exclusions = await service._rank_eligible_teams(request)
    assert candidates[0].station_id != STATIONS[0]["station_id"]
    assert any(e.team_id == STATIONS[0]["team_id"] and e.reason == "team_unavailable" for e in exclusions)
    # Outside road coverage, but inside approved bounds. No tolerance expansion.
    await database.rescuers.update_one({"id": STATIONS[0]["team_id"]}, {"$set": {
        "availability": "available", "base_location": {"type": "Point", "coordinates": [120.982, 14.621]}}})
    candidates, exclusions = await service._rank_eligible_teams(request)
    assert any(e.team_id == STATIONS[0]["team_id"] for e in exclusions)
    await database.rescuers.update_many({}, {"$set": {"availability": "assigned"}})
    assert await service.auto_assign_best_team(request.id, 1) is None
    assert await database.missions.count_documents({}) == 0
    assert (await requests.get_by_id(request.id)).status == "pending"


async def test_all_unreachable_stays_pending_and_inconsistent_capacity_is_excluded(dispatch):
    database, requests, service = dispatch
    request = await create(requests)
    await database.rescuers.update_many({}, {"$set": {
        "base_location": {"type": "Point", "coordinates": [120.982, 14.621]}}})
    assert await service.auto_assign_best_team(request.id, 1) is None
    assert await database.missions.count_documents({}) == 0
    await database.rescuers.update_many({}, {"$set": {"assigned_mission_id": "synthetic-existing-mission"}})
    candidates, exclusions = await service._rank_eligible_teams(request)
    assert not candidates
    assert all(e.reason == "team_unavailable" for e in exclusions)


async def test_concurrent_requests_do_not_overbook_single_available_station(dispatch):
    database, requests, service = dispatch
    await database.rescuers.update_many({"id": {"$ne": STATIONS[0]["team_id"]}},
                                        {"$set": {"availability": "assigned"}})
    first, second = await create(requests), await create(requests)
    results = await asyncio.gather(service.auto_assign_best_team(first.id, 1),
                                   service.auto_assign_best_team(second.id, 1))
    assert sum(result is not None for result in results) == 1
    assert await database.missions.count_documents({"station_id": STATIONS[0]["station_id"]}) == 1
    assert await database.rescue_requests.count_documents({"status": "pending"}) == 1


async def test_blocked_nearest_station_keeps_headquarters_and_selects_next_valid_route(dispatch, tmp_path):
    database, requests, service = dispatch
    request = await create(requests)
    roads = json.loads(DEFAULT_ROAD_FIXTURE.read_text())
    flood = json.loads(DEFAULT_FLOOD_FIXTURE.read_text())
    origins = nearest_attachments(tuple(STATIONS[0]["point"]["coordinates"]),
                                  build_graph_from_geojson(roads), 75)
    blocked_ids = {origin.edge_id for origin in origins}
    for feature in roads["features"]:
        if feature["properties"]["edge_id"] not in blocked_ids:
            continue
        flood["features"] = [f for f in flood["features"]
                              if f["properties"]["edge_id"] != feature["properties"]["edge_id"]]
        flood["features"].append({"type": "Feature", "geometry": feature["geometry"], "properties": {
            **flood["features"][0]["properties"], "edge_id": feature["properties"]["edge_id"],
            "passability": "impassable", "flood_level": "severe"}})
    path = tmp_path / "blocked-station-scenario.geojson"
    path.write_text(json.dumps(flood))
    service._routing = RoutingAdapter(fixture_config=GeospatialFixtureConfig(flood_path=path))
    candidates, exclusions = await service._rank_eligible_teams(request)
    assert candidates
    assert candidates[0].station_id != STATIONS[0]["station_id"]
    assert any(e.team_id == STATIONS[0]["team_id"] for e in exclusions)
    assert (await database.rescuers.find_one({"id": STATIONS[0]["team_id"]}))["base_location"] == STATIONS[0]["point"]
    assigned = await service.auto_assign_best_team(request.id, 1)
    assert assigned.mission.station_id == candidates[0].station_id
    stored = await database.missions.find_one({"id": assigned.mission.id})
    assert stored["dispatch_provenance"]["graph_revision"] == service._routing.fixture_revision
