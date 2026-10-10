import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pymongo import AsyncMongoClient, MongoClient
from pymongo.asynchronous.client_session import AsyncClientSession

from app.db.setup import initialize_database
from app.main import app
from app.models.mission import Mission
from app.models.rescue_request import GeoPoint, RequestLocation, RescueRequest
from app.repositories.assignments import AssignmentRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.schemas.assignments import AssignmentCreate
from app.schemas.common import DemoActor, ServiceError
from app.services.assignments import AssignmentService

pytestmark = [
    pytest.mark.skipif(
        os.getenv("RUN_MONGODB_INTEGRATION") != "1",
        reason="set RUN_MONGODB_INTEGRATION=1 for the Docker replica-set test",
    ),
]


def request_fixture(request_id: str) -> RescueRequest:
    now = datetime.now(UTC)
    return RescueRequest(
        id=request_id,
        citizen_id="citizen-integration-demo",
        location=RequestLocation(
            address="Sanitized integration-test address",
            point=GeoPoint(coordinates=(120.9946, 14.6042)),
        ),
        headcount=2,
        vulnerabilities=["senior"],
        medical_needs=False,
        reported_flood_level="moderate",
        situation_summary="Synthetic transaction verification",
        status="pending",
        version=1,
        created_at=now,
        updated_at=now,
        status_history=[],
    )


class FailingMissionAssignmentRepository(AssignmentRepository):
    async def create_mission(
        self,
        mission: Mission,
        session: AsyncClientSession,
    ) -> Mission:
        raise RuntimeError("forced mission persistence failure")


@pytest.mark.asyncio
async def test_mongodb_assignment_commit_conflict_and_rollback() -> None:
    mongodb_uri = os.getenv(
        "MONGODB_INTEGRATION_URI",
        "mongodb://localhost:27017/?replicaSet=rs0",
    )
    client = AsyncMongoClient(mongodb_uri, serverSelectionTimeoutMS=5_000)
    database_name = f"resqph_issue15_test_{uuid4().hex}"
    database = client[database_name]
    actor = DemoActor(user_id="coordinator-integration-demo", role="coordinator")
    connected = False

    try:
        await client.admin.command("ping")
        connected = True
        await initialize_database(database)
        requests = RescueRequestRepository(database)
        rescuers = RescuerRepository(database)
        assignments = AssignmentRepository(database)
        service = AssignmentService(requests, rescuers, assignments)

        await requests.create(request_fixture("request-commit"))
        committed = await service.assign_team(
            "request-commit",
            AssignmentCreate(team_id="team-alpha", expected_request_version=1),
            actor,
        )

        assert committed.request.status == "assigned"
        assert await database["missions"].count_documents({"request_id": "request-commit"}) == 1
        stored_request = await database["rescue_requests"].find_one(
            {"id": "request-commit"}
        )
        assert stored_request["status_history"][-1]["status"] == "assigned"
        assert (
            await database["rescuers"].find_one({"id": "team-alpha"})
        )["availability"] == "assigned"

        with pytest.raises(ServiceError) as duplicate:
            await service.assign_team(
                "request-commit",
                AssignmentCreate(team_id="team-bravo", expected_request_version=2),
                actor,
            )
        assert duplicate.value.status_code == 409
        assert duplicate.value.code == "duplicate_assignment"
        assert (
            await database["rescuers"].find_one({"id": "team-bravo"})
        )["availability"] == "available"

        await requests.create(request_fixture("request-rollback"))
        failing_service = AssignmentService(
            requests,
            rescuers,
            FailingMissionAssignmentRepository(database),
        )
        with pytest.raises(RuntimeError, match="forced mission persistence failure"):
            await failing_service.assign_team(
                "request-rollback",
                AssignmentCreate(team_id="team-bravo", expected_request_version=1),
                actor,
            )

        rolled_back_request = await database["rescue_requests"].find_one(
            {"id": "request-rollback"}
        )
        rolled_back_team = await database["rescuers"].find_one({"id": "team-bravo"})
        assert rolled_back_request["status"] == "pending"
        assert rolled_back_request["version"] == 1
        assert rolled_back_request.get("mission_id") is None
        assert rolled_back_team["availability"] == "available"
        assert rolled_back_team.get("assigned_mission_id") is None
        assert await database["missions"].count_documents(
            {"request_id": "request-rollback"}
        ) == 0
    finally:
        if connected:
            await client.drop_database(database_name)
        await client.close()


def test_full_fastapi_request_to_assignment_slice_against_mongodb() -> None:
    mongodb_uri = os.getenv("MONGODB_INTEGRATION_URI")
    database_name = os.getenv("MONGODB_INTEGRATION_DATABASE")
    if mongodb_uri is None or database_name is None:
        pytest.skip("set MongoDB integration URI and disposable database name")
    if not database_name.startswith("resqph_issue15_api_test_"):
        pytest.fail("integration database must use the disposable Issue #15 prefix")

    citizen_headers = {
        "X-Demo-User-Id": "citizen-api-integration",
        "X-Demo-Role": "citizen",
    }
    coordinator_headers = {
        "X-Demo-User-Id": "coordinator-api-integration",
        "X-Demo-Role": "coordinator",
    }
    rescuer_headers = {
        "X-Demo-User-Id": "team-alpha",
        "X-Demo-Role": "rescuer",
    }
    payload = {
        "location": {
            "address": "Sanitized U-Belt integration address",
            "point": {"type": "Point", "coordinates": [120.9946, 14.6042]},
            "landmark": "Synthetic integration landmark",
        },
        "headcount": 2,
        "vulnerabilities": ["senior"],
        "medical_needs": False,
        "reported_flood_level": "moderate",
        "situation_summary": "Controlled full-API transaction test",
    }

    cleanup_client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5_000)
    try:
        with TestClient(app) as api:
            created = api.post(
                "/api/v1/rescue-requests",
                json=payload,
                headers=citizen_headers,
            )
            assert created.status_code == 201
            request = created.json()
            assert request["status"] == "pending"

            queue = api.get(
                "/api/v1/rescue-requests?status=pending",
                headers=coordinator_headers,
            )
            assert queue.status_code == 200
            assert [item["id"] for item in queue.json()["items"]] == [request["id"]]

            assigned = api.post(
                f"/api/v1/rescue-requests/{request['id']}/assignment",
                json={"team_id": "team-alpha", "expected_request_version": 1},
                headers=coordinator_headers,
            )
            assert assigned.status_code == 201
            assignment = assigned.json()
            assert assignment["request"]["status"] == "assigned"
            assert assignment["mission"]["request_id"] == request["id"]

            authoritative_request = api.get(
                f"/api/v1/rescue-requests/{request['id']}",
                headers=citizen_headers,
            )
            assert authoritative_request.status_code == 200
            assert authoritative_request.json()["status"] == "assigned"

            mission = api.get(
                f"/api/v1/missions/{assignment['mission']['id']}",
                headers={
                    "X-Demo-User-Id": "team-alpha",
                    "X-Demo-Role": "rescuer",
                },
            )
            assert mission.status_code == 200
            assert mission.json()["request_id"] == request["id"]
            assert mission.json()["status"] == "assigned"
            assert mission.json()["latest_route_result"] is None

            advanced = api.post(
                f"/api/v1/missions/{assignment['mission']['id']}/status-events",
                json={
                    "event_id": "phase-2-gate-en-route",
                    "new_status": "en-route",
                    "expected_mission_version": 1,
                    "source": "online",
                    "note": "Sanitized Phase 2 gate transition",
                },
                headers=rescuer_headers,
            )
            assert advanced.status_code == 200
            advanced_mission = advanced.json()
            assert advanced_mission["status"] == "en-route"
            assert advanced_mission["version"] == 2
            assert advanced_mission["latest_route_result"] is None
            assert advanced_mission["status_history"][-1]["event_id"] == (
                "phase-2-gate-en-route"
            )

            authoritative_mission = api.get(
                f"/api/v1/missions/{assignment['mission']['id']}",
                headers=rescuer_headers,
            )
            assert authoritative_mission.status_code == 200
            assert authoritative_mission.json()["status"] == "en-route"
    finally:
        cleanup_client.drop_database(database_name)
        cleanup_client.close()
