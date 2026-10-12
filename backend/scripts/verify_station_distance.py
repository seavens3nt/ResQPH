"""Reproduce station comparisons without touching any reusable database.

Run from backend/: MONGODB_INTEGRATION_URI=<replica-set-uri> .venv/bin/python
scripts/verify_station_distance.py --baseline <revision> --output <json-path>
Only synthetic coordinates from the canonical station catalog are written.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import types
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import networkx as nx
from pymongo import AsyncMongoClient
from resqph_routing import build_graph_from_geojson
from resqph_routing.endpoints import nearest_attachments

from app.db.setup import initialize_database
from app.integrations.geospatial import (
    DEFAULT_FLOOD_FIXTURE,
    DEFAULT_ROAD_FIXTURE,
    GeospatialFixtureConfig,
)
from app.integrations.routing import RoutingAdapter, _node_coordinates
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.services.assignments import AssignmentService
from app.services.stations import load_station_catalog
from tests.test_station_distance_mongodb import create


def baseline_module(revision: str, relative_path: str, name: str) -> types.ModuleType:
    source = subprocess.check_output(['git', 'show', f'{revision}:{relative_path}'], text=True)
    module = types.ModuleType(name)
    sys.modules[name] = module
    exec(compile(source, relative_path, 'exec'), module.__dict__)  # noqa: S102 - explicitly selected trusted local revision
    return module


def candidate_evidence(candidates, exclusions) -> dict:
    ranked = []
    for rank, candidate in enumerate(candidates, 1):
        item = candidate.model_dump(mode='json')
        item['rank'] = rank
        item['route'] = {key: item['route'][key] for key in (
            'status', 'selection_mode', 'distance_m', 'estimated_time_s',
            'snapped_origin', 'snapped_destination', 'edge_ids', 'scenario_timestamp')}
        ranked.append(item)
    return {
        'ranked': ranked,
        'exclusions': [item.model_dump(mode='json') for item in exclusions],
        'selected': candidates[0].station_id if candidates else None,
        'capacity_policy': 'one mission per available canonical station unit; equal member_count=4',
    }


async def main(args) -> None:
    old_routing = baseline_module(args.baseline, 'backend/app/integrations/routing.py', 'station_baseline_routing')
    old_assignments = baseline_module(args.baseline, 'backend/app/services/assignments.py', 'station_baseline_assignments')
    stations = load_station_catalog()['stations']
    roads = json.loads(DEFAULT_ROAD_FIXTURE.read_text())
    nodes = _node_coordinates(roads)  # Also rejects inconsistent intersection coordinates.
    graph = nx.MultiDiGraph()
    for feature in roads['features']:
        p = feature['properties']
        graph.add_edge(p['from_node'], p['to_node'], key=p['edge_id'], length=p['length_m'])
    evidence = {
        'baseline': args.baseline, 'initial_working_tree': 'clean on temporary-main',
        'routing_import': __import__('resqph_routing').__file__,
        'headquarters_unchanged': True,
        'fixture_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in (DEFAULT_ROAD_FIXTURE, DEFAULT_FLOOD_FIXTURE)},
        'coverage': {'edges': graph.number_of_edges(), 'nodes': len(nodes),
                     'weak_component_sizes': sorted([len(c) for c in nx.weakly_connected_components(graph)], reverse=True),
                     'strong_component_sizes': sorted([len(c) for c in nx.strongly_connected_components(graph)], reverse=True),
                     'maximum_parallel_edges': max(graph.number_of_edges(a, b) for a, b in graph.edges()),
                     'source_type_counts': {kind: sum(f['properties']['source_type'] == kind for f in roads['features'])
                                            for kind in sorted({f['properties']['source_type'] for f in roads['features']})}},
        'comparisons': [],
    }
    client = AsyncMongoClient(os.environ['MONGODB_INTEGRATION_URI'], serverSelectionTimeoutMS=5000)
    assert (await client.admin.command('hello')).get('setName')
    name = f'resqph_distance_evidence_{uuid4().hex}'
    assert name not in await client.list_database_names()
    db = client[name]
    try:
        await initialize_database(db)
        await db.rescuers.update_many({}, {'$set': {'member_count': 4}})
        requests, rescuers, assignments = RescueRequestRepository(db), RescuerRepository(db), AssignmentRepository(db)
        before = old_assignments.AssignmentService(requests, rescuers, assignments, old_routing.RoutingAdapter())
        after = AssignmentService(requests, rescuers, assignments, RoutingAdapter())
        for station in stations:
            request = await create(requests, station)
            evidence['comparisons'].append({'near_station_id': station['station_id'],
                'confirmed_destination': list(request.location.point.coordinates),
                'before': candidate_evidence(*await before._rank_eligible_teams(request)),
                'after': candidate_evidence(*await after._rank_eligible_teams(request))})
        request = await create(requests)
        await db.rescuers.update_one({'id': stations[0]['team_id']}, {'$set': {'current_location': stations[1]['point']}})
        await db.rescuers.update_one({'id': stations[3]['team_id']}, {'$set': {
            'current_location': {'type': 'Point', 'coordinates': [120.9932, 14.6081]}}})
        evidence['stale_positions'] = {
            'fixture_change': 'Sampaloc current position retained at Algeciras; Iverson retained beside Sampaloc incident; headquarters untouched',
            'before': candidate_evidence(*await before._rank_eligible_teams(request)),
            'after': candidate_evidence(*await after._rank_eligible_teams(request))}
        await db.rescuers.update_one({'id': stations[0]['team_id']}, {'$set': {'availability': 'assigned'}})
        evidence['nearest_busy'] = candidate_evidence(*await after._rank_eligible_teams(request))
        await db.rescuers.update_one({'id': stations[0]['team_id']}, {'$set': {'availability': 'available'}})
        origins = nearest_attachments(tuple(stations[0]['point']['coordinates']), build_graph_from_geojson(roads), 75)
        blocked_ids = {origin.edge_id for origin in origins}
        flood = json.loads(DEFAULT_FLOOD_FIXTURE.read_text())
        for feature in roads['features']:
            edge_id = feature['properties']['edge_id']
            if edge_id not in blocked_ids:
                continue
            flood['features'] = [f for f in flood['features'] if f['properties']['edge_id'] != edge_id]
            flood['features'].append({'type': 'Feature', 'geometry': feature['geometry'], 'properties': {
                **flood['features'][0]['properties'], 'edge_id': edge_id, 'passability': 'impassable', 'flood_level': 'severe'}})
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'blocked-sampaloc.geojson'
            path.write_text(json.dumps(flood))
            blocked = AssignmentService(requests, rescuers, assignments,
                RoutingAdapter(fixture_config=GeospatialFixtureConfig(flood_path=path)))
            evidence['nearest_blocked'] = candidate_evidence(*await blocked._rank_eligible_teams(request))
            evidence['nearest_blocked']['blocked_edge_ids'] = sorted(blocked_ids)
            evidence['nearest_blocked']['route_checks'] = [
                {'station_id': station['station_id'],
                 'original_origin': station['point']['coordinates'],
                 'result': blocked._evaluate_team_route(tuple(station['point']['coordinates']),
                                                        request.location.point.coordinates)}
                for station in stations]
        await db.rescuers.update_many({}, {'$set': {'availability': 'assigned'}})
        evidence['all_unavailable'] = candidate_evidence(*await after._rank_eligible_teams(request))
        # Read-only inspection, never write/drop any pre-existing database.
        historical = {}
        for database_name in await client.list_database_names():
            if database_name not in {'resqph', 'resqph_demo_20261012', 'resqph_station_disposable_browser_20261010'}:
                continue
            collection = client[database_name].missions
            historical[database_name] = await collection.count_documents({'$or': [{'station_id': 'iverson-fire-rescue'}, {'team_id': 'team-iverson-fire-rescue'}]})
        evidence['existing_iverson_counts_read_only'] = historical
        evidence['historical_limit'] = 'No historical availability/origin snapshots can be inferred from current team state.'
    finally:
        assert name.startswith('resqph_distance_evidence_')
        await client.drop_database(name)
        await client.close()
    Path(args.output).write_text(json.dumps(evidence, indent=2) + '\n')
    print('Synthetic station evidence written; disposable database dropped.')
    print('Stale-position selection:', evidence['stale_positions']['before']['selected'], '->', evidence['stale_positions']['after']['selected'])
    print('Coverage:', evidence['coverage'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', required=True)
    parser.add_argument('--output', required=True)
    asyncio.run(main(parser.parse_args()))
