"""Real production API/database acceptance; never substitutes fake services."""

import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core.config import settings
from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_MONGODB_INTEGRATION") != "1",
    reason="Requires disposable replica-set acceptance",
)


@pytest.fixture
def api(monkeypatch):
    uri = os.environ["MONGODB_INTEGRATION_URI"]
    name = f"resqph_product_repair_{uuid4().hex}"
    mongo = MongoClient(uri)
    assert name not in mongo.list_database_names()
    monkeypatch.setattr(settings, "mongodb_uri", uri)
    monkeypatch.setattr(settings, "mongodb_database", name)
    try:
        with TestClient(app) as client:
            yield client, mongo[name]
    finally:
        assert name.startswith("resqph_product_repair_")
        mongo.drop_database(name)
        mongo.close()


def headers(role, actor=None):
    return {"X-Demo-Role": role, "X-Demo-User-Id": actor or f"{role}@example.test"}


def request_body():
    return {
        "location": {
            "address": "Synthetic U-Belt acceptance address",
            "point": {"type": "Point", "coordinates": [120.9931743, 14.5983287]},
        },
        "headcount": 2,
        "medical_needs": False,
        "reported_flood_level": "unknown",
    }


def assigned(client, team="team-alpha"):
    created = client.post(
        "/api/v1/rescue-requests", json=request_body(), headers=headers("citizen")
    )
    assert created.status_code == 201, created.text
    result = client.post(
        f"/api/v1/rescue-requests/{created.json()['id']}/assignment",
        json={"team_id": team, "expected_request_version": 1},
        headers=headers("coordinator"),
    )
    assert result.status_code == 201, result.text
    return created.json(), result.json()["mission"]


def test_fresh_minimal_request_route_status_history_and_team_release(api):
    client, db = api
    request, mission = assigned(client)
    mid, rid = mission["id"], request["id"]
    rescuer = headers("rescuer", "team-alpha")
    fetched = client.get(f"/api/v1/missions/{mid}", headers=rescuer).json()
    assert fetched["request_summary"]["situation_summary"] is None
    assert fetched["request_summary"]["location"]["landmark"] is None
    route = client.post(
        "/api/v1/routes/evaluate",
        headers=rescuer,
        json={
            "origin": {"type": "Point", "coordinates": [120.9938198, 14.5977093]},
            "destination": fetched["request_summary"]["location"]["point"],
            "scenario_id": "scenario-controlled-ubelt-001",
            "algorithm": "astar",
            "include_ml_penalty": False,
        },
    )
    assert route.status_code == 200 and route.json()["status"] == "route-found"
    for version, status in enumerate(["en-route", "arrived", "completed"], 1):
        body = {
            "event_id": f"acceptance-{status}",
            "new_status": status,
            "expected_mission_version": version,
            "source": "offline-sync",
            "client_recorded_at": datetime.now(UTC).isoformat(),
            "note": "Sanitized acceptance note",
        }
        result = client.post(
            f"/api/v1/missions/{mid}/status-events", headers=rescuer, json=body
        )
        assert result.status_code == 200, result.text
        duplicate = client.post(
            f"/api/v1/missions/{mid}/status-events", headers=rescuer, json=body
        )
        assert (
            duplicate.status_code == 200
            and len(duplicate.json()["status_history"]) == version
        )
        citizen = client.get(
            f"/api/v1/rescue-requests/{rid}", headers=headers("citizen")
        ).json()
        assert citizen["status"] == status
        assert citizen["status_history"][-1]["status"] == status
    team = db.rescuers.find_one({"id": "team-alpha"})
    assert team["availability"] == "available" and team["assigned_mission_id"] is None
    assert db.mission_status_events.count_documents({"mission_id": mid}) == 3
    assert (
        len(
            client.get(
                "/api/v1/missions?assigned_to=me&status=completed", headers=rescuer
            ).json()
        )
        == 1
    )


def test_assigned_cancellation_is_atomic_and_late_cancellation_is_rejected(api):
    client, db = api
    request, mission = assigned(client)
    response = client.post(
        f"/api/v1/missions/{mission['id']}/cancel",
        headers=headers("coordinator"),
        json={"expected_mission_version": 1, "reason": "Controlled test cancelled"},
    )
    assert response.status_code == 200
    assert db.rescue_requests.find_one({"id": request["id"]})["status"] == "cancelled"
    assert (
        db.rescue_requests.find_one({"id": request["id"]})["cancellation_reason"]
        == "Controlled test cancelled"
    )
    assert db.rescuers.find_one({"id": "team-alpha"})["availability"] == "available"
    _, second = assigned(client)
    body = {
        "event_id": "late-cancel-test",
        "new_status": "en-route",
        "expected_mission_version": 1,
    }
    assert (
        client.post(
            f"/api/v1/missions/{second['id']}/status-events",
            headers=headers("rescuer", "team-alpha"),
            json=body,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/missions/{second['id']}/cancel",
            headers=headers("coordinator"),
            json={"expected_mission_version": 2, "reason": "Not allowed"},
        ).status_code
        == 409
    )
    assert db.missions.find_one({"id": second["id"]})["status"] == "en-route"


def hazard_body():
    return {
        "location": "Synthetic flood observation",
        "point": {"type": "Point", "coordinates": [120.9946, 14.6042]},
        "category": "flood",
        "severity": "moderate",
        "source": "controlled",
        "observed_at": "2026-10-05T00:00:00Z",
        "note": "<b>sanitized</b>",
    }


def test_mission_and_team_endpoints_reject_missing_or_invalid_identity(api):
    client, _ = api
    for headers_value in [
        {},
        {"X-Demo-Role": "coordinator"},
        {"X-Demo-User-Id": "x", "X-Demo-Role": "admin"},
    ]:
        assert client.get("/api/v1/missions", headers=headers_value).status_code == 403
        assert client.get("/api/v1/teams", headers=headers_value).status_code == 403


def test_broken_link_rolls_back_the_entire_status_transition(api):
    client, db = api
    _, mission = assigned(client)
    db.rescuers.update_one(
        {"id": "team-alpha"}, {"$set": {"assigned_mission_id": "unrelated"}}
    )
    result = client.post(
        f"/api/v1/missions/{mission['id']}/status-events",
        headers=headers("rescuer", "team-alpha"),
        json={
            "event_id": "rollback-check",
            "new_status": "en-route",
            "expected_mission_version": 1,
        },
    )
    assert result.status_code == 409
    assert db.missions.find_one({"id": mission["id"]})["status"] == "assigned"
    assert (
        db.rescue_requests.find_one({"id": mission["request_id"]})["status"]
        == "assigned"
    )
    assert db.mission_status_events.count_documents({"event_id": "rollback-check"}) == 0


def test_retired_hazard_endpoints_preserve_existing_records(api):
    client, db = api
    db.hazard_reports.insert_one({"id": "archived-observation", **hazard_body()})
    before = db.hazard_reports.find_one({"id": "archived-observation"})
    for role in ["citizen", "rescuer", "coordinator", "volunteer"]:
        assert client.get("/api/v1/hazard-reports", headers=headers(role)).status_code == 404
        assert client.post(
            "/api/v1/hazard-reports", headers=headers(role), json=hazard_body()
        ).status_code == 404
        for operation in ["verify", "reject"]:
            assert client.post(
                f"/api/v1/hazard-reports/archived-observation/{operation}",
                headers=headers(role),
                json={"expected_version": 1, "reason": "Retired workflow"},
            ).status_code == 404
    assert db.hazard_reports.find_one({"id": "archived-observation"}) == before
    assert db.hazard_reports.count_documents({}) == 1
