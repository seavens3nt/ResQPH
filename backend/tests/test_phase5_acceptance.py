import os
import re
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.api.routes.assignments import get_assignment_service
from app.core.config import settings
from app.main import app
from app.models.mission import Mission
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.services.assignments import AssignmentService

DISPOSABLE_DATABASE_PREFIX = "resqph_issue73_backend_"

MONGODB_REQUIRED = pytest.mark.skipif(
    os.getenv("RUN_MONGODB_INTEGRATION") != "1",
    reason="set RUN_MONGODB_INTEGRATION=1 for Phase 5 MongoDB acceptance tests",
)


@dataclass
class MongoHarness:
    api: TestClient
    database: Database[dict[str, Any]]
    database_name: str
    server_hello: dict[str, Any]


def validate_disposable_database_name(database_name: str) -> None:
    if not re.fullmatch(r"resqph_issue73_backend_[A-Za-z0-9_]+", database_name):
        raise ValueError(
            "Use a nonempty resqph_issue73_backend_ disposable database name "
            "with only letters, digits, and underscores."
        )


@pytest.fixture()
def mongo_harness(monkeypatch: pytest.MonkeyPatch) -> Iterator[MongoHarness]:
    mongodb_uri = os.getenv("MONGODB_INTEGRATION_URI")
    database_name = os.getenv("MONGODB_INTEGRATION_DATABASE")
    if mongodb_uri is None or database_name is None:
        pytest.fail("set MONGODB_INTEGRATION_URI and MONGODB_INTEGRATION_DATABASE explicitly")

    try:
        validate_disposable_database_name(database_name)
    except ValueError as error:
        pytest.fail(str(error))

    admin_client: MongoClient[dict[str, Any]] = MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5_000,
    )
    owns_database = False
    try:
        admin_client.admin.command("ping")
        server_hello = cast(dict[str, Any], admin_client.admin.command("hello"))
        if not server_hello.get("setName"):
            pytest.fail("MongoDB integration server must be a replica set for transaction evidence")
        if database_name in admin_client.list_database_names():
            pytest.fail("Refusing to overwrite an existing database. Choose a fresh disposable name.")

        monkeypatch.setattr(settings, "mongodb_uri", mongodb_uri)
        monkeypatch.setattr(settings, "mongodb_database", database_name)
        monkeypatch.setattr(settings, "frontend_origins", "http://localhost:5173,http://localhost:4173")
        owns_database = True
        with TestClient(app, raise_server_exceptions=False) as api:
            yield MongoHarness(
                api=api,
                database=admin_client[database_name],
                database_name=database_name,
                server_hello=server_hello,
            )
    finally:
        try:
            if owns_database:
                admin_client.drop_database(database_name)
        finally:
            admin_client.close()


def citizen_headers(user_id: str = "citizen-phase5") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": "citizen"}


def coordinator_headers(user_id: str = "coordinator-phase5") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": "coordinator"}


def rescuer_headers(user_id: str = "team-alpha") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": "rescuer"}


def rescue_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "location": {
            "address": "Sanitized Phase 5 U-Belt address",
            "point": {"type": "Point", "coordinates": [120.9946, 14.6042]},
            "landmark": "Synthetic Phase 5 landmark",
            "description": "Controlled academic rescue fixture",
        },
        "headcount": 3,
        "vulnerabilities": ["senior"],
        "medical_needs": True,
        "medical_details": "Sanitized maintenance medication note",
        "reported_flood_level": "moderate",
        "situation_summary": "Controlled Phase 5 backend acceptance request",
    }
    payload.update(overrides)
    return payload


def status_payload(
    event_id: str,
    new_status: str,
    expected_version: int,
    *,
    source: str = "online",
    note: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "event_id": event_id,
        "new_status": new_status,
        "expected_mission_version": expected_version,
        "client_recorded_at": "2026-10-05T00:00:00Z",
        "source": source,
    }
    if note is not None:
        body["note"] = note
    return body


def create_request(api: TestClient) -> dict[str, Any]:
    response = api.post(
        "/api/v1/rescue-requests",
        json=rescue_payload(),
        headers=citizen_headers(),
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def assign_request(api: TestClient, request_id: str, team_id: str = "team-alpha") -> dict[str, Any]:
    response = api.post(
        f"/api/v1/rescue-requests/{request_id}/assignment",
        json={"team_id": team_id, "expected_request_version": 1},
        headers=coordinator_headers(),
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def post_status(
    api: TestClient,
    mission_id: str,
    event_id: str,
    new_status: str,
    expected_version: int,
    *,
    headers: dict[str, str] | None = None,
    source: str = "online",
    note: str | None = None,
) -> Any:
    return api.post(
        f"/api/v1/missions/{mission_id}/status-events",
        json=status_payload(
            event_id,
            new_status,
            expected_version,
            source=source,
            note=note,
        ),
        headers=headers or rescuer_headers(),
    )


def get_document(database: Database[dict[str, Any]], collection: str, query: dict[str, Any]) -> dict[str, Any]:
    document = database[collection].find_one(query)
    assert document is not None
    return cast(dict[str, Any], document)


def event_count(database: Database[dict[str, Any]], mission_id: str) -> int:
    return int(database["mission_status_events"].count_documents({"mission_id": mission_id}))


def test_phase5_openapi_cors_and_safe_boundary_contracts() -> None:
    client = TestClient(app, raise_server_exceptions=False)

    schema = client.get("/openapi.json").json()
    paths = schema["paths"]
    assert "/api/v1/rescue-requests" in paths
    assert "/api/v1/rescue-requests/{request_id}/assignment" in paths
    assert "/api/v1/missions/{mission_id}/status-events" in paths
    assert "/api/v1/routes/evaluate" in paths
    assert "/api/v1/ml/road-risk" in paths

    assignment_responses = paths["/api/v1/rescue-requests/{request_id}/assignment"]["post"]["responses"]
    assert {"201", "403", "404", "409", "422", "503"}.issubset(assignment_responses)
    assert "ErrorEnvelope" in schema["components"]["schemas"]

    road_risk_schema = paths["/api/v1/ml/road-risk"]["post"]
    assert road_risk_schema["responses"]["200"]["description"] == "Successful Response"
    route_schema = paths["/api/v1/routes/evaluate"]["post"]
    assert route_schema["responses"]["200"]["description"] == "Successful Response"

    allowed_preflight = client.options(
        "/api/v1/rescue-requests",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Demo-User-Id,X-Demo-Role,Content-Type",
        },
    )
    assert allowed_preflight.status_code == 200
    assert allowed_preflight.headers["access-control-allow-origin"] == "http://localhost:5173"

    blocked_preflight = client.options(
        "/api/v1/rescue-requests",
        headers={
            "Origin": "https://example.invalid",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert blocked_preflight.status_code == 400
    assert "access-control-allow-origin" not in blocked_preflight.headers


@MONGODB_REQUIRED
def test_phase5_invalid_inputs_and_roles_leave_database_unchanged(
    mongo_harness: MongoHarness,
) -> None:
    api = mongo_harness.api
    database = mongo_harness.database

    malformed = api.post(
        "/api/v1/rescue-requests",
        json=rescue_payload(headcount=0),
        headers={**citizen_headers(), "X-Request-Id": "trace-phase5-invalid"},
    )
    assert malformed.status_code == 422
    assert malformed.json()["error"]["code"] == "validation_error"
    assert malformed.json()["error"]["request_id"] == "trace-phase5-invalid"

    missing_role = api.post(
        "/api/v1/rescue-requests",
        json=rescue_payload(),
        headers={"X-Demo-User-Id": "citizen-phase5"},
    )
    assert missing_role.status_code == 403
    assert missing_role.json()["error"]["code"] == "demo_role_required"

    prohibited_role = api.post(
        "/api/v1/rescue-requests",
        json=rescue_payload(),
        headers={"X-Demo-User-Id": "volunteer-phase5", "X-Demo-Role": "volunteer"},
    )
    assert prohibited_role.status_code == 403
    assert prohibited_role.json()["error"]["code"] == "forbidden"
    assert database["rescue_requests"].count_documents({}) == 0


@MONGODB_REQUIRED
def test_phase5_real_mongodb_lifecycle_updates_request_mission_and_history(
    mongo_harness: MongoHarness,
) -> None:
    api = mongo_harness.api
    database = mongo_harness.database

    created = create_request(api)
    request_id = created["id"]
    assert created["status"] == "pending"
    assert created["version"] == 1
    assert [item["status"] for item in created["status_history"]] == ["pending"]

    assigned = assign_request(api, request_id)
    mission = assigned["mission"]
    mission_id = mission["id"]
    assert assigned["request"]["status"] == "assigned"
    assert mission["status"] == "assigned"
    assert database["missions"].count_documents({"request_id": request_id}) == 1
    assert get_document(database, "rescuers", {"id": "team-alpha"})["availability"] == "assigned"

    first = post_status(api, mission_id, "phase5-en-route", "en-route", 1)
    assert first.status_code == 200
    assert first.json()["status"] == "en-route"
    assert first.json()["version"] == 2
    first_event = get_document(
        database,
        "mission_status_events",
        {"event_id": "phase5-en-route"},
    )

    arrived = post_status(
        api,
        mission_id,
        "phase5-arrived",
        "arrived",
        2,
        source="offline-sync",
    )
    assert arrived.status_code == 200
    assert arrived.json()["status"] == "arrived"
    assert arrived.json()["version"] == 3

    completed = post_status(
        api,
        mission_id,
        "phase5-completed",
        "completed",
        3,
        headers=coordinator_headers(),
    )
    assert completed.status_code == 200
    body = completed.json()
    assert body["status"] == "completed"
    assert body["version"] == 4
    assert [event["event_id"] for event in body["status_history"]] == [
        "phase5-en-route",
        "phase5-arrived",
        "phase5-completed",
    ]
    assert body["status_history"][1]["source"] == "offline-sync"
    assert body["status_history"][2]["actor_role"] == "coordinator"

    stored_mission = get_document(database, "missions", {"id": mission_id})
    stored_request = get_document(database, "rescue_requests", {"id": request_id})
    assert stored_mission["status"] == "completed"
    assert stored_mission["version"] == 4
    assert event_count(database, mission_id) == 3
    assert get_document(database, "mission_status_events", {"event_id": "phase5-en-route"}) == first_event

    assert stored_request["status"] == "completed"
    assert stored_request["version"] == 5
    assert [item["status"] for item in stored_request["status_history"]] == [
        "pending",
        "assigned",
        "en-route",
        "arrived",
        "completed",
    ]


@MONGODB_REQUIRED
def test_phase5_retry_conflict_stale_actor_and_transition_rejections_do_not_write(
    mongo_harness: MongoHarness,
) -> None:
    api = mongo_harness.api
    database = mongo_harness.database
    request_id = create_request(api)["id"]
    mission_id = assign_request(api, request_id)["mission"]["id"]

    duplicate_assignment = api.post(
        f"/api/v1/rescue-requests/{request_id}/assignment",
        json={"team_id": "team-bravo", "expected_request_version": 2},
        headers=coordinator_headers(),
    )
    assert duplicate_assignment.status_code == 409
    assert duplicate_assignment.json()["error"]["code"] == "duplicate_assignment"
    assert database["missions"].count_documents({"request_id": request_id}) == 1
    assert get_document(database, "rescuers", {"id": "team-bravo"})["availability"] == "available"

    wrong_actor = post_status(
        api,
        mission_id,
        "phase5-wrong-actor",
        "en-route",
        1,
        headers=rescuer_headers("team-bravo"),
    )
    assert wrong_actor.status_code == 403
    assert wrong_actor.json()["error"]["code"] == "forbidden"
    assert event_count(database, mission_id) == 0

    stale = post_status(api, mission_id, "phase5-stale", "en-route", 99)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_mission_version"
    assert event_count(database, mission_id) == 0

    skipped = post_status(api, mission_id, "phase5-skipped", "completed", 1)
    assert skipped.status_code == 409
    assert skipped.json()["error"]["code"] == "invalid_transition"
    assert event_count(database, mission_id) == 0

    accepted = post_status(api, mission_id, "phase5-retry", "en-route", 1, note="Original note")
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "en-route"
    assert event_count(database, mission_id) == 1

    retry = post_status(api, mission_id, "phase5-retry", "en-route", 1, note="Original note")
    assert retry.status_code == 200
    assert retry.json()["status"] == "en-route"
    assert event_count(database, mission_id) == 1

    conflicting_reuse = post_status(
        api,
        mission_id,
        "phase5-retry",
        "en-route",
        1,
        note="Changed note",
    )
    assert conflicting_reuse.status_code == 409
    assert conflicting_reuse.json()["error"]["code"] == "duplicate_event"
    assert event_count(database, mission_id) == 1

    repeated = post_status(api, mission_id, "phase5-repeated", "en-route", 2)
    assert repeated.status_code == 409
    assert repeated.json()["error"]["code"] == "invalid_transition"
    assert event_count(database, mission_id) == 1

    database["missions"].update_one(
        {"id": mission_id},
        {"$set": {"team_id": "team-bravo", "assigned_rescuer_id": "team-bravo"}},
    )
    reassigned_original = post_status(api, mission_id, "phase5-reassigned", "arrived", 2)
    assert reassigned_original.status_code == 403
    assert reassigned_original.json()["error"]["code"] == "forbidden"
    assert get_document(database, "missions", {"id": mission_id})["status"] == "en-route"
    assert event_count(database, mission_id) == 1


class FailingMissionAssignmentRepository(AssignmentRepository):
    async def create_mission(
        self,
        mission: Mission,
        session: AsyncClientSession,
    ) -> Mission:
        raise PyMongoError("forced Phase 5 mission insert failure")


@MONGODB_REQUIRED
def test_phase5_assignment_dependency_failure_returns_envelope_and_rolls_back(
    mongo_harness: MongoHarness,
) -> None:
    api = mongo_harness.api
    database = mongo_harness.database
    request_id = create_request(api)["id"]
    before_request = get_document(database, "rescue_requests", {"id": request_id})
    before_team = get_document(database, "rescuers", {"id": "team-alpha"})

    def failing_assignment_service() -> AssignmentService:
        return AssignmentService(
            RescueRequestRepository(cast(Any, database)),
            RescuerRepository(cast(Any, database)),
            FailingMissionAssignmentRepository(cast(Any, database)),
        )

    app.dependency_overrides[get_assignment_service] = failing_assignment_service
    try:
        response = api.post(
            f"/api/v1/rescue-requests/{request_id}/assignment",
            json={"team_id": "team-alpha", "expected_request_version": 1},
            headers=coordinator_headers(),
        )
    finally:
        app.dependency_overrides.pop(get_assignment_service, None)

    assert get_document(database, "rescue_requests", {"id": request_id}) == before_request
    assert get_document(database, "rescuers", {"id": "team-alpha"}) == before_team
    assert database["missions"].count_documents({"request_id": request_id}) == 0
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
