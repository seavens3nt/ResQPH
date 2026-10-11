"""Disposable MongoDB acceptance for the cookie-authenticated citizen/station flow."""

import asyncio
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core.config import settings
from app.main import app
from app.management.provision_station_account import (
    provision as provision_station_account,
)
from app.management.reset_station_password import (
    reset_password as reset_station_password,
)
from app.security.passwords import hash_password
from app.services.stations import load_station_catalog

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_MONGODB_INTEGRATION") != "1",
    reason="Requires the explicitly configured disposable MongoDB replica set",
)


def _request_body() -> dict:
    return {
        "location": {
            "address": "Sanitized U-Belt acceptance location",
            "landmark": "Synthetic landmark",
            "point": {"type": "Point", "coordinates": [120.9931743, 14.5983287]},
        },
        "headcount": 2,
        "vulnerabilities": ["senior"],
        "medical_needs": True,
        "medical_details": "Synthetic acceptance need",
        "reported_flood_level": "moderate",
        "reported_severity": "high",
        "situation_summary": "Controlled Mongo acceptance scenario",
    }


def _csrf(client: TestClient) -> dict[str, str]:
    token = next((cookie.value for cookie in client.cookies.jar if cookie.name == "resqph_csrf"), "")
    return {"X-CSRF-Token": token}


def _cookies(client: TestClient) -> dict[str, tuple[str, str]]:
    return {cookie.name: (cookie.path, cookie.value) for cookie in client.cookies.jar}


def _restore_cookies(client: TestClient, cookies: dict[str, tuple[str, str]]) -> None:
    client.cookies.clear()
    for name, (path, value) in cookies.items():
        client.cookies.set(name, value, domain="testserver.local", path=path)


def _register_citizen(client: TestClient, email: str) -> None:
    result = client.post("/api/v1/auth/register", json={
        "name": "Synthetic Acceptance Citizen",
        "email": email,
        "password": "Synthetic-Password-For-Tests-55",
    })
    assert result.status_code == 201, result.text


def _provision_station(database, station: dict, email: str) -> None:
    database.accounts.insert_one({
        "id": f"station-account-{uuid4().hex}",
        "email": email,
        "name": station["name"],
        "role": "rescuer",
        "password_hash": hash_password("Synthetic-Station-Password-55"),
        "station_id": station["station_id"],
        "station_name": station["name"],
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    })


def _login_station(client: TestClient, email: str, station_id: str, password: str = "Synthetic-Station-Password-55") -> None:
    result = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
        "station_id": station_id,
    })
    assert result.status_code == 200, result.text
    restored = client.get("/api/v1/auth/session")
    assert restored.status_code == 200
    assert restored.json()["user"]["station_id"] == station_id


def _wait_for_request(client: TestClient, request_id: str, timeout_s: float = 20.0) -> dict:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/rescue-requests/{request_id}")
        assert response.status_code == 200, response.text
        body = response.json()
        if body["status"] != "pending":
            return body
        time.sleep(0.2)
    raise AssertionError("Durable dispatch did not resolve within the acceptance timeout")


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch):
    uri = os.environ["MONGODB_INTEGRATION_URI"]
    database_name = f"resqph_station_disposable_{uuid4().hex}"
    mongo = MongoClient(uri, serverSelectionTimeoutMS=5_000)
    assert database_name not in mongo.list_database_names()
    monkeypatch.setattr(settings, "mongodb_uri", uri)
    monkeypatch.setattr(settings, "mongodb_database", database_name)
    monkeypatch.setattr(settings, "auth_cookie_secure", False)
    monkeypatch.setattr(settings, "auth_allow_demo_headers", False)
    # This acceptance creates several distinct requests in one minute; rate limiting is
    # covered separately and stays enabled without throttling lifecycle concurrency.
    monkeypatch.setattr(settings, "report_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "simulation_control_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "tracking_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "broad_ip_rate_limit_per_minute", 1000)
    database = mongo[database_name]
    try:
        with TestClient(app) as client:
            yield client, database
    finally:
        assert database_name.startswith("resqph_station_disposable_")
        mongo.drop_database(database_name)
        mongo.close()


def test_cookie_auth_dispatch_ownership_tracking_and_pending_retry(api) -> None:
    client, database = api
    catalog = load_station_catalog()["stations"]
    stations = catalog
    station_emails = [f"station-{station['station_id']}@example.test" for station in stations]
    station_passwords = ["Synthetic-Station-Password-55"] * len(stations)
    asyncio.run(provision_station_account(station_emails[0], stations[0]["name"], stations[0]["station_id"], station_passwords[0]))
    asyncio.run(reset_station_password(station_emails[0], stations[0]["station_id"], "Synthetic-Station-Password-Reset-66"))
    station_passwords[0] = "Synthetic-Station-Password-Reset-66"
    for station, email in zip(stations[1:], station_emails[1:], strict=True):
        _provision_station(database, station, email)

    station_sessions: list[dict[str, str]] = []
    try:
        # The active application exposes only Citizen and Rescuer authentication and no manual dispatch.
        paths = set(app.openapi()["paths"])
        assert "/api/v1/auth/register" in paths
        assert "/api/v1/rescue-requests/{request_id}/assignment" not in paths
        assert "/api/v1/teams" not in paths
        assert "/api/v1/missions/{mission_id}/cancel" not in paths

        _register_citizen(client, "citizen-owner@example.test")
        owner_session = _cookies(client)
        owner_account = database.accounts.find_one({"email": "citizen-owner@example.test"})
        assert owner_account is not None
        assert owner_account["password_hash"].startswith("scrypt$")
        _restore_cookies(client, owner_session)
        assert client.get("/api/v1/auth/session").status_code == 200
        logout = client.post("/api/v1/auth/logout", headers=_csrf(client))
        assert logout.status_code == 204
        assert client.get("/api/v1/auth/session").status_code == 401
        owner_login = client.post("/api/v1/auth/login", json={
            "email": "citizen-owner@example.test",
            "password": "Synthetic-Password-For-Tests-55",
        })
        assert owner_login.status_code == 200, owner_login.text
        assert client.get("/api/v1/auth/session").status_code == 200
        owner_session = _cookies(client)
        _register_citizen(client, "citizen-other@example.test")
        other_session = _cookies(client)
        for index, (email, station) in enumerate(zip(station_emails, stations, strict=True)):
            _login_station(client, email, station["station_id"], station_passwords[index])
            station_sessions.append(_cookies(client))

        # A valid station account cannot claim another station by changing the selector.
        _restore_cookies(client, station_sessions[0])
        mismatch = client.post("/api/v1/auth/login", json={
            "email": station_emails[0],
            "password": station_passwords[0],
            "station_id": stations[1]["station_id"],
        })
        assert mismatch.status_code == 403
        assert mismatch.json()["error"]["code"] == "station_membership_mismatch"
        old_password = client.post("/api/v1/auth/login", json={
            "email": station_emails[0], "password": "Synthetic-Station-Password-55",
            "station_id": stations[0]["station_id"],
        })
        assert old_password.status_code == 401
        _login_station(client, station_emails[0], stations[0]["station_id"], station_passwords[0])
        station_sessions[0] = _cookies(client)

        _restore_cookies(client, other_session)
        forged = client.get("/api/v1/missions?assigned_to=me", headers={
            "X-Demo-Role": "rescuer", "X-Demo-User-Id": f"team-{stations[0]['station_id']}",
        })
        assert forged.status_code == 403
        assert forged.json()["error"]["code"] == "forbidden"

        _restore_cookies(client, owner_session)
        idempotency_key = f"mongo-acceptance-{uuid4().hex}"
        body = _request_body()
        def submit_request():
            return client.post("/api/v1/rescue-requests", json=body, headers={**_csrf(client), "Idempotency-Key": idempotency_key})

        with ThreadPoolExecutor(max_workers=2) as pool:
            first, concurrent_retry = list(pool.map(lambda _index: submit_request(), range(2)))
        assert first.status_code == 201, first.text
        assert concurrent_retry.status_code == 201, concurrent_retry.text
        assert concurrent_retry.json()["id"] == first.json()["id"]
        retry = client.post("/api/v1/rescue-requests", json=body, headers={**_csrf(client), "Idempotency-Key": idempotency_key})
        assert retry.status_code == 201
        assert retry.json()["id"] == first.json()["id"]
        assert retry.json()["reported_severity"] == "high"
        conflicting = client.post("/api/v1/rescue-requests", json={**body, "headcount": 3}, headers={**_csrf(client), "Idempotency-Key": idempotency_key})
        assert conflicting.status_code == 409
        assert conflicting.json()["error"]["code"] == "idempotency_key_reused"

        accepted = _wait_for_request(client, first.json()["id"])
        assert accepted["status"] == "assigned"
        assert accepted["mission_id"]
        assert accepted["assigned_station_id"] in {station["station_id"] for station in catalog}
        mission_id = accepted["mission_id"]
        forbidden_cancel = client.post(
            f"/api/v1/rescue-requests/{first.json()['id']}/cancel",
            json={"reason": "Cancellation is pending-only", "version": accepted["version"]},
            headers=_csrf(client),
        )
        assert forbidden_cancel.status_code == 409
        assert forbidden_cancel.json()["error"]["code"] == "request_not_pending"
        assert database.missions.count_documents({"request_id": first.json()["id"]}) == 1
        mission = client.get(f"/api/v1/missions/{mission_id}")
        assert mission.status_code == 200
        mission_data = mission.json()
        assert mission_data["latest_route_result"]["status"] == "route-found"
        assert mission_data["latest_route_result"]["geometry"]["coordinates"]
        assert mission_data["station_id"] == accepted["assigned_station_id"]

        _restore_cookies(client, other_session)
        owner_denied = client.get(f"/api/v1/rescue-requests/{first.json()['id']}")
        _restore_cookies(client, owner_session)
        assert owner_denied.status_code == 404
        assigned_station_index = next((index for index, station in enumerate(stations) if station["station_id"] == accepted["assigned_station_id"]), None)
        assigned_session = station_sessions[assigned_station_index] if assigned_station_index is not None else None
        if assigned_session is not None:
            _restore_cookies(client, assigned_session)
            own_missions = client.get("/api/v1/missions?assigned_to=me")
            assert own_missions.status_code == 200
            assert any(item["id"] == mission_id for item in own_missions.json())
        for index, station in enumerate(stations):
            if station["station_id"] != accepted["assigned_station_id"]:
                _restore_cookies(client, station_sessions[index])
                assert client.get(f"/api/v1/missions/{mission_id}").status_code == 404
                assert client.get("/api/v1/missions?assigned_to=me").json() == []

        # Status and tracking are server-owned, versioned, and persist the unit's last position.
        if assigned_station_index is not None:
            _restore_cookies(client, station_sessions[assigned_station_index])
        else:
            _restore_cookies(client, station_sessions[0])
        start = client
        accept_payload = {
            "event_id": f"mongo-{uuid4().hex}", "new_status": "en-route",
            "expected_mission_version": 1, "source": "online",
            "client_recorded_at": datetime.now(UTC).isoformat(),
        }
        with ThreadPoolExecutor(max_workers=2) as pool:
            accept_retries = list(pool.map(lambda _index: start.post(
                f"/api/v1/missions/{mission_id}/status-events", json=accept_payload, headers=_csrf(start)
            ), range(2)))
        assert all(result.status_code == 200 for result in accept_retries), [result.text for result in accept_retries]
        assert all(result.json()["status"] == "en-route" for result in accept_retries)
        assert database.mission_status_events.count_documents({"mission_id": mission_id}) == 1
        started_at = database.missions.find_one({"id": mission_id})["tracking_state"]["started_at"]
        assert database.missions.find_one({"id": mission_id})["tracking_state"]["status"] == "running"
        with ThreadPoolExecutor(max_workers=2) as pool:
            repeated_starts = list(pool.map(lambda _index: start.post(
                f"/api/v1/missions/{mission_id}/tracking/control", json={"action": "start"}, headers=_csrf(start)
            ), range(2)))
        assert all(result.status_code == 200 for result in repeated_starts)
        assert database.missions.find_one({"id": mission_id})["tracking_state"]["started_at"] == started_at
        time.sleep(1.2)
        tracking = start.get(f"/api/v1/missions/{mission_id}/tracking")
        assert tracking.status_code == 200
        assert tracking.json()["position"] is not None

        arrival = start.post(f"/api/v1/missions/{mission_id}/status-events", json={
            "event_id": f"mongo-{uuid4().hex}", "new_status": "arrived",
            "expected_mission_version": 2, "source": "online",
            "client_recorded_at": datetime.now(UTC).isoformat(),
        }, headers=_csrf(start))
        assert arrival.status_code == 200, arrival.text
        arrived_tracking = start.get(f"/api/v1/missions/{mission_id}/tracking")
        assert arrived_tracking.status_code == 200
        assert arrived_tracking.json()["simulation_status"] == "arrived"
        assert arrived_tracking.json()["progress_ratio"] == 1.0
        arrived_position = arrived_tracking.json()["position"]
        time.sleep(1.2)
        still_arrived = start.get(f"/api/v1/missions/{mission_id}/tracking")
        assert still_arrived.json()["position"] == arrived_position
        blocked_control = start.post(
            f"/api/v1/missions/{mission_id}/tracking/control",
            json={"action": "pause"}, headers=_csrf(start),
        )
        assert blocked_control.status_code == 409
        assert blocked_control.json()["error"]["code"] == "tracking_terminal"
        completed_transition = start.post(f"/api/v1/missions/{mission_id}/status-events", json={
            "event_id": f"mongo-{uuid4().hex}", "new_status": "completed",
            "expected_mission_version": 3, "source": "online",
            "client_recorded_at": datetime.now(UTC).isoformat(),
        }, headers=_csrf(start))
        assert completed_transition.status_code == 200, completed_transition.text
        _restore_cookies(client, owner_session)
        completed = client.get(f"/api/v1/rescue-requests/{first.json()['id']}").json()
        assert completed["status"] == "completed"
        assert completed["status_history"][-1]["status"] == "completed"
        terminal_cancel = client.post(
            f"/api/v1/rescue-requests/{first.json()['id']}/cancel",
            json={"reason": "Terminal request cannot be cancelled", "version": completed["version"]},
            headers=_csrf(client),
        )
        assert terminal_cancel.status_code == 409
        assert terminal_cancel.json()["error"]["code"] == "request_not_pending"
        final_team = database.rescuers.find_one({"id": mission_data["team_id"]})
        assert final_team["availability"] == "available"
        terminal_tracking = start.get(f"/api/v1/missions/{mission_id}/tracking")
        assert terminal_tracking.status_code == 200
        assert final_team["current_location"]["coordinates"] == terminal_tracking.json()["position"]["coordinates"]
        station_point = next(station["point"]["coordinates"] for station in catalog if station["station_id"] == accepted["assigned_station_id"])
        assert final_team["current_location"]["coordinates"] != station_point
        assert database.mission_status_events.count_documents({"mission_id": mission_id}) == 3

        # With every unit occupied, the request remains pending and records a reason. Releasing capacity retries it.
        database.rescuers.update_many({}, {"$set": {"availability": "assigned"}})
        second_key = f"mongo-pending-{uuid4().hex}"
        queued = client.post("/api/v1/rescue-requests", json=body, headers={**_csrf(client), "Idempotency-Key": second_key})
        assert queued.status_code == 201
        time.sleep(3)
        still_pending = client.get(f"/api/v1/rescue-requests/{queued.json()['id']}").json()
        assert still_pending["status"] == "pending"
        assert still_pending["assignment_reason"] == "no_station_available"
        other_owner_session = other_session
        _restore_cookies(client, other_owner_session)
        foreign_cancel = client.post(
            f"/api/v1/rescue-requests/{queued.json()['id']}/cancel",
            json={"reason": "Foreign account", "version": still_pending["version"]},
            headers=_csrf(client),
        )
        assert foreign_cancel.status_code == 404
        _restore_cookies(client, owner_session)
        cancelled = client.post(
            f"/api/v1/rescue-requests/{queued.json()['id']}/cancel",
            json={"reason": "Synthetic cancellation acceptance", "version": still_pending["version"]},
            headers=_csrf(client),
        )
        assert cancelled.status_code == 200, cancelled.text
        assert cancelled.json()["status"] == "cancelled"
        repeated_cancel = client.post(
            f"/api/v1/rescue-requests/{queued.json()['id']}/cancel",
            json={"reason": "Repeated cancellation", "version": cancelled.json()["version"]},
            headers=_csrf(client),
        )
        assert repeated_cancel.status_code == 409
        assert repeated_cancel.json()["error"]["code"] == "request_not_pending"

        race_request = client.post(
            "/api/v1/rescue-requests", json=body,
            headers={**_csrf(client), "Idempotency-Key": f"mongo-cancel-race-{uuid4().hex}"},
        )
        assert race_request.status_code == 201
        time.sleep(3)
        race_pending = client.get(f"/api/v1/rescue-requests/{race_request.json()['id']}").json()
        assert race_pending["status"] == "pending"
        def race_cancel():
            return client.post(
                f"/api/v1/rescue-requests/{race_request.json()['id']}/cancel",
                json={"reason": "Race with automatic assignment", "version": race_pending["version"]},
                headers=_csrf(client),
            )
        def release_for_race():
            return database.rescuers.update_one(
                {"id": mission_data["team_id"]}, {"$set": {"availability": "available"}},
            )
        with ThreadPoolExecutor(max_workers=2) as pool:
            cancel_result = pool.submit(race_cancel)
            release_result = pool.submit(release_for_race)
            race_cancel_response = cancel_result.result()
            release_result.result()
        race_final = _wait_for_request(client, race_request.json()["id"])
        if race_cancel_response.status_code == 200:
            assert race_final["status"] == "cancelled"
            assert race_final.get("mission_id") is None
        else:
            assert race_cancel_response.status_code == 409
            assert race_final["status"] == "assigned"
            assert race_final.get("mission_id")

        database.rescuers.update_many({}, {"$set": {"availability": "assigned"}})
        second_key = f"mongo-pending-{uuid4().hex}"
        queued_for_retry = client.post("/api/v1/rescue-requests", json=body, headers={**_csrf(client), "Idempotency-Key": second_key})
        assert queued_for_retry.status_code == 201
        time.sleep(3)
        still_for_retry = client.get(f"/api/v1/rescue-requests/{queued_for_retry.json()['id']}").json()
        assert still_for_retry["status"] == "pending"
        database.rescuers.update_one({"id": mission_data["team_id"]}, {"$set": {"availability": "available"}})
        retried = _wait_for_request(client, queued_for_retry.json()["id"])
        assert retried["status"] == "assigned"
        assert retried["mission_id"]
    finally:
        pass
