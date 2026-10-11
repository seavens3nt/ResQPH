"""Current-cookie tests using fresh guarded disposable MongoDB databases."""
import os
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pymongo.errors import OperationFailure

from app.repositories.mission_status_events import MissionStatusEventRepository
from app.services.stations import load_station_catalog
from tests.test_product_journey_mongodb import (
    _cookies,
    _csrf,
    _login_station,
    _progress,
    _provision_station,
    _recovery_mission,
    _register_citizen,
    _request_body,
    _restore_cookies,
)

pytest_plugins = ['tests.test_product_journey_mongodb']

pytestmark = pytest.mark.skipif(os.getenv('RUN_MONGODB_INTEGRATION') != '1', reason='Explicit disposable replica-set acceptance')


def test_shared_tracking_and_foreign_reads(api) -> None:
    client, database, mission, citizen, station = _recovery_mission(api)
    station_session = _cookies(client)
    path = f"/api/v1/missions/{mission['id']}"
    for suffix in ['', '/tracking']:
        response = client.get(path + suffix)
        assert response.status_code == 200
        _restore_cookies(client, citizen)
        own = client.get(path + suffix)
        assert own.status_code == 200
        if suffix:
            assert own.json()['route_geometry'] == response.json()['route_geometry']
            assert own.json()['position'] == response.json()['position']
        _restore_cookies(client, station_session)
    _register_citizen(client, 'foreign-read@example.test')
    for suffix in ['', '/tracking']:
        denied = client.get(path + suffix)
        assert denied.status_code == 404
        assert denied.json()['error']['code'] == 'mission_not_found'
    other = next(s for s in load_station_catalog()['stations'] if s['station_id'] != station['station_id'])
    _provision_station(database, other, 'foreign-station@example.test')
    _login_station(client, 'foreign-station@example.test', other['station_id'])
    assert client.get(path).status_code == 404
    assert client.get(path + '/tracking').status_code == 404
    _restore_cookies(client, station_session)
    mission = _progress(client, mission, 'en-route')
    first = client.get(path + '/tracking').json()
    _restore_cookies(client, citizen)
    second = client.get(path + '/tracking').json()
    assert second['progress_ratio'] >= first['progress_ratio']
    assert second['route_geometry'] == first['route_geometry']
    _restore_cookies(client, station_session)
    _progress(client, mission, 'arrived')
    frozen = client.get(path + '/tracking').json()
    _restore_cookies(client, citizen)
    assert client.get(path + '/tracking').json()['position'] == frozen['position']


@pytest.mark.parametrize('assigned', [False, True])
def test_cancellation_retry_releases_once(api, assigned: bool) -> None:
    client, database = api
    if assigned:
        client, database, mission, citizen, _station = _recovery_mission(api)
        station_session = _cookies(client)
        _restore_cookies(client, citizen)
        request = client.get(f"/api/v1/rescue-requests/{mission['request_id']}").json()
    else:
        database.rescuers.update_many({}, {'$set': {'availability': 'assigned'}})
        _register_citizen(client, 'pending-cancel@example.test')
        response = client.post('/api/v1/rescue-requests', json=_request_body(), headers={**_csrf(client), 'Idempotency-Key': 'pending-cancellation-acceptance'})
        assert response.status_code == 201
        request = response.json()
    path = f"/api/v1/rescue-requests/{request['id']}/cancel"
    owner = _cookies(client)
    payload = {'reason': 'Synthetic citizen cancellation', 'version': request['version']}
    _register_citizen(client, 'foreign-cancel@example.test')
    assert client.post(path, json=payload, headers=_csrf(client)).status_code == 404
    _restore_cookies(client, owner)
    stale = client.post(path, json={**payload, 'version': 999}, headers=_csrf(client))
    assert stale.status_code == 409
    assert stale.json()['error']['code'] == 'stale_request_version'
    assert client.post(path, json=payload, headers=_csrf(client)).status_code == 200
    snapshot = database.rescue_requests.find_one({'id': request['id']})
    assert snapshot['status'] == 'cancelled'
    assert snapshot['status_history'][-1]['actor_role'] == 'citizen'
    assert client.post(path, json=payload, headers=_csrf(client)).status_code == 200
    assert database.rescue_requests.find_one({'id': request['id']}) == snapshot
    assert client.post(path, json={**payload, 'reason': 'Different consent'}, headers=_csrf(client)).status_code == 409
    if assigned:
        assert database.missions.find_one({'id': mission['id']})['status'] == 'cancelled'
        team = database.rescuers.find_one({'id': mission['team_id']})
        assert team['availability'] == 'available' and team['assigned_mission_id'] is None
        assert database.mission_status_events.count_documents({'mission_id': mission['id'], 'new_status': 'cancelled'}) == 1
        assert client.get(f"/api/v1/missions/{mission['id']}/tracking").json()['simulation_status'] == 'cancelled'
        _restore_cookies(client, station_session)
        assert not any(item['id'] == mission['id'] for item in client.get('/api/v1/missions?assigned_to=me&status=assigned,en-route,arrived').json())
        late_start = client.post(f"/api/v1/missions/{mission['id']}/status-events", json={'event_id':uuid4().hex,'new_status':'en-route','expected_mission_version':mission['version'],'source':'online','client_recorded_at':datetime.now(UTC).isoformat()}, headers=_csrf(client))
        assert late_start.status_code == 409



def test_cancellation_start_race(api) -> None:
    client, database, mission, citizen, _station = _recovery_mission(api)
    citizen_headers = {'Cookie': '; '.join(f'{name}={value}' for name, (_path,value) in citizen.items()), 'X-CSRF-Token':citizen['resqph_csrf'][1]}
    request = client.get(f"/api/v1/rescue-requests/{mission['request_id']}", headers=citizen_headers).json()
    def cancel() -> int:
        return client.post(f"/api/v1/rescue-requests/{request['id']}/cancel", json={'reason': 'Synthetic race cancellation', 'version': request['version']}, headers=citizen_headers).status_code
    def start() -> int:
        return client.post(f"/api/v1/missions/{mission['id']}/status-events", json={'event_id': uuid4().hex, 'new_status': 'en-route', 'expected_mission_version': mission['version'], 'source': 'online', 'client_recorded_at': datetime.now(UTC).isoformat()}, headers=_csrf(client)).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(cancel), pool.submit(start)]
        assert sorted(future.result() for future in futures) == [200, 409]
    final = database.missions.find_one({'id': mission['id']})
    linked = database.rescue_requests.find_one({'id': request['id']})
    team = database.rescuers.find_one({'id': mission['team_id']})
    assert final['status'] == linked['status']
    if final['status'] == 'cancelled':
        assert team['availability'] == 'available' and team['assigned_mission_id'] is None
    else:
        assert final['status'] == 'en-route' and team['assigned_mission_id'] == mission['id']
        late = client.post(f"/api/v1/rescue-requests/{request['id']}/cancel", json={'reason':'Too late to cancel','version':linked['version']}, headers=citizen_headers)
        assert late.status_code == 409


def test_cancellation_history_failure_rolls_back(api, monkeypatch) -> None:
    client, database, mission, citizen, _station = _recovery_mission(api)
    _restore_cookies(client, citizen)
    request = client.get(f"/api/v1/rescue-requests/{mission['request_id']}").json()
    records = [('missions',mission['id']), ('rescue_requests',request['id']), ('rescuers',mission['team_id'])]
    before = [deepcopy(database[name].find_one({'id':key})) for name,key in records]
    async def fail(*args, **kwargs) -> None:
        raise OperationFailure('Synthetic cancellation history failure')
    with monkeypatch.context() as context:
        context.setattr(MissionStatusEventRepository, 'append', fail)
        failed = client.post(f"/api/v1/rescue-requests/{request['id']}/cancel", json={'reason': 'Synthetic rollback check', 'version': request['version']}, headers=_csrf(client))
        assert failed.status_code == 503
        assert failed.json()['error']['code'] == 'database_unavailable'
    assert [database[name].find_one({'id':key}) for name,key in records] == before
    assert database.mission_status_events.count_documents({'mission_id':mission['id'], 'new_status':'cancelled'}) == 0


def test_started_request_cannot_be_cancelled(api) -> None:
    client, _database, mission, citizen, _station = _recovery_mission(api)
    _progress(client, mission, 'en-route')
    _restore_cookies(client, citizen)
    request = client.get(f"/api/v1/rescue-requests/{mission['request_id']}").json()
    assert request['can_cancel'] is False
    response = client.post(f"/api/v1/rescue-requests/{request['id']}/cancel", json={'reason':'Too late to cancel','version':request['version']}, headers=_csrf(client))
    assert response.status_code == 409
    assert response.json()['error']['code'] == 'request_not_pending'


def test_journey_reads_reject_account_switch_and_expired_session(api) -> None:
    client, database, mission, citizen, _station = _recovery_mission(api)
    _restore_cookies(client, citizen)
    account_id = client.get('/api/v1/auth/session').json()['user']['id']
    paths = [f"/api/v1/rescue-requests/{mission['request_id']}", f"/api/v1/missions/{mission['id']}", f"/api/v1/missions/{mission['id']}/tracking"]
    for path in paths:
        mismatch = client.get(path, headers={'X-Expected-Account-Id':'different-synthetic-account'})
        assert mismatch.status_code == 409
        assert mismatch.json()['error']['code'] == 'session_identity_changed'
    expired_sessions = database.auth_sessions.update_many({'account_id':account_id}, {'$set': {'expires_at':datetime(2000,1,1,tzinfo=UTC)}})
    assert expired_sessions.modified_count > 0
    for path in paths:
        expired = client.get(path)
        assert expired.status_code == 401
        assert expired.json()['error']['code'] == 'authentication_required'
