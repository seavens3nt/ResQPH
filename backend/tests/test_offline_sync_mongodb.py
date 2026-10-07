import asyncio
import json
import os
import re
from collections.abc import AsyncIterator
from copy import deepcopy
from pathlib import Path
from typing import Any, cast

import httpx
import pytest
import pytest_asyncio
from app.api.routes.missions import (
    get_mission_service,
    router,
    validation_exception_handler,
)
from app.db.setup import initialize_database
from app.models.mission import Mission
from app.models.mission_status_event import MissionStatusEvent
from app.repositories.mission_status_events import MissionStatusEventRepository
from app.repositories.missions import MissionRepository
from app.schemas.missions import DemoActor, MissionStatusEventCreate
from app.services.missions import MissionService
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pymongo import AsyncMongoClient
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = REPO_ROOT / "data" / "samples" / "offline-mission.example.json"
DISPOSABLE_DATABASE_PREFIX = "resqph_issue62_offline_"


def validate_disposable_database_name(database_name: str) -> None:
    if not re.fullmatch(r"resqph_issue62_offline_[A-Za-z0-9_]+", database_name):
        raise ValueError("Use a nonempty disposable issue62 database name with only letters, digits and underscores.")

pytestmark = [
    pytest.mark.skipif(
        os.getenv("RUN_MONGODB_INTEGRATION") != "1",
        reason="set RUN_MONGODB_INTEGRATION=1 for the disposable MongoDB replica-set tests",
    ),
]


@pytest.fixture()
def offline_fixture() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(FIXTURE_PATH.read_text(encoding="utf-8")))


@pytest_asyncio.fixture()
async def database() -> AsyncIterator[AsyncDatabase]:
    mongodb_uri = os.getenv("MONGODB_INTEGRATION_URI")
    database_name = os.getenv("MONGODB_INTEGRATION_DATABASE")
    if mongodb_uri is None or database_name is None:
        pytest.fail("set MONGODB_INTEGRATION_URI and MONGODB_INTEGRATION_DATABASE explicitly")
    try:
        validate_disposable_database_name(database_name)
    except ValueError as error:
        pytest.fail(str(error))

    client = AsyncMongoClient(mongodb_uri, serverSelectionTimeoutMS=5_000)
    owned_database = False
    try:
        await client.admin.command("ping")
        hello = await client.admin.command("hello")
        if not hello.get("setName"):
            pytest.fail("MongoDB integration server must be a replica set for transactions")

        if database_name in await client.list_database_names():
            pytest.fail("Refusing to overwrite an existing database. Choose a new disposable database name.")
        db = client[database_name]
        owned_database = True
        await initialize_database(db)
        yield db
    finally:
        try:
            if owned_database:
                await client.drop_database(database_name)
        finally:
            await client.close()


async def seed_offline_mission(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> Mission:
    mission = Mission.model_validate(offline_fixture["mission"])
    await database["missions"].insert_one(mission.model_dump(mode="python"))
    await database["rescue_requests"].insert_one({
        "id": mission.request_id,
        "mission_id": mission.id,
        "status": mission.status,
        "version": 3,
        "status_history": [],
    })
    await database["rescuers"].update_one(
        {"id": mission.team_id},
        {"$set": {
            "availability": "en-route",
            "assigned_request_id": mission.request_id,
            "assigned_mission_id": mission.id,
            "version": 2,
        }},
        upsert=True,
    )
    return mission


def rescuer_headers(user_id: str = "rescuer-alpha") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": "rescuer"}


def offline_body(offline_fixture: dict[str, Any], **overrides: Any) -> dict[str, Any]:
    body = deepcopy(offline_fixture["pending_event"]["body"])
    body.update(overrides)
    return cast(dict[str, Any], body)


def mission_api(database: AsyncDatabase) -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def service_override() -> MissionService:
        return MissionService(
            MissionRepository(database),
            MissionStatusEventRepository(database),
        )

    app.dependency_overrides[get_mission_service] = service_override
    return app


async def post_status(
    client: httpx.AsyncClient,
    offline_fixture: dict[str, Any],
    **overrides: Any,
) -> httpx.Response:
    mission_id = overrides.pop("mission_id", offline_fixture["mission"]["id"])
    headers = overrides.pop("headers", rescuer_headers())
    return await client.post(
        f"/api/v1/missions/{mission_id}/status-events",
        json=offline_body(offline_fixture, **overrides),
        headers=headers,
    )


async def stored_mission(database: AsyncDatabase, mission_id: str) -> dict[str, Any]:
    document = await database["missions"].find_one({"id": mission_id})
    assert document is not None
    return cast(dict[str, Any], document)


async def stored_events(database: AsyncDatabase, mission_id: str) -> list[dict[str, Any]]:
    cursor = database["mission_status_events"].find({"mission_id": mission_id}).sort(
        "server_recorded_at",
        1,
    )
    return [cast(dict[str, Any], document) async for document in cursor]


@pytest.mark.asyncio
async def test_mongodb_offline_successful_single_commit(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        fetched = await client.get(f"/api/v1/missions/{mission.id}", headers=rescuer_headers())
        assert fetched.status_code == 200
        assert fetched.json()["status"] == "en-route"
        assert fetched.json()["version"] == 2

        response = await post_status(client, offline_fixture)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "arrived"
    assert body["version"] == 3

    persisted = await stored_mission(database, mission.id)
    events = await stored_events(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert len(events) == 1
    assert events[0]["event_id"] == "offline-event-001"
    assert events[0]["source"] == "offline-sync"
    assert events[0]["client_recorded_at"].isoformat().startswith("2026-10-04T00:05:00")
    assert events[0]["server_recorded_at"] == persisted["updated_at"]
    indexes = await database["mission_status_events"].index_information()
    assert indexes["uq_mission_status_event_id"]["unique"] is True
    assert indexes["uq_mission_status_event_id"]["key"] == [("event_id", 1)]


@pytest.mark.asyncio
async def test_mongodb_same_id_replay_preserves_single_history_event(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(client, offline_fixture)
        retry = await post_status(client, offline_fixture)

    assert first.status_code == 200
    assert retry.status_code == 200
    assert retry.json()["status"] == "arrived"
    assert retry.json()["version"] == 3

    persisted = await stored_mission(database, mission.id)
    events = await stored_events(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert [event["event_id"] for event in events] == ["offline-event-001"]


@pytest.mark.asyncio
async def test_mongodb_lost_response_replay_after_commit_is_idempotent(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        committed_response = await post_status(client, offline_fixture)
        assert committed_response.status_code == 200
        committed_state = await stored_mission(database, mission.id)
        assert committed_state["status"] == "arrived"
        assert committed_state["version"] == 3

        replay = await post_status(client, offline_fixture)

    assert replay.status_code == 200
    assert replay.json()["status"] == "arrived"
    assert replay.json()["version"] == 3
    assert len(await stored_events(database, mission.id)) == 1


class CoordinatedEventRepository(MissionStatusEventRepository):
    def __init__(self, database: AsyncDatabase, event_id: str, parties: int) -> None:
        super().__init__(database)
        self._event_id = event_id
        self._parties = parties
        self._arrived = 0
        self._release = asyncio.Event()

    async def get_by_event_id(
        self,
        event_id: str,
        session: AsyncClientSession | None = None,
    ) -> MissionStatusEvent | None:
        if session is not None and event_id == self._event_id and not self._release.is_set():
            self._arrived += 1
            if self._arrived >= self._parties:
                self._release.set()
            await asyncio.wait_for(self._release.wait(), timeout=5)
        return await super().get_by_event_id(event_id, session=session)


@pytest.mark.asyncio
async def test_mongodb_concurrent_identical_same_id_requests_do_not_duplicate_history(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    payload = MissionStatusEventCreate.model_validate(offline_body(offline_fixture))
    events = CoordinatedEventRepository(database, payload.event_id, parties=2)

    async def submit() -> Any:
        service = MissionService(MissionRepository(database), events)
        return await service.create_status_event(
            mission.id,
            payload,
            actor=DemoActor(user_id="rescuer-alpha", role="rescuer"),
        )

    results = await asyncio.gather(submit(), submit(), return_exceptions=True)

    assert not [result for result in results if isinstance(result, Exception)]
    assert sorted(result.version for result in results) == [3, 3]
    persisted = await stored_mission(database, mission.id)
    stored_history = await stored_events(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert [event["event_id"] for event in stored_history] == ["offline-event-001"]


@pytest.mark.asyncio
async def test_mongodb_conflicting_id_reuse_is_rejected_without_extra_write(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(client, offline_fixture)
        conflict = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:06:00Z",
            note="Different offline note",
        )

    assert first.status_code == 200
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "duplicate_event"
    persisted = await stored_mission(database, mission.id)
    events = await stored_events(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert len(events) == 1


@pytest.mark.asyncio
async def test_mongodb_replay_accepts_bson_millisecond_precision_and_keeps_server_time(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:05:00.123456Z",
        )
        stored_after_commit = await stored_events(database, mission.id)
        replay = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:05:00.123456Z",
        )

        fetched = await client.get(f"/api/v1/missions/{mission.id}", headers=rescuer_headers())

    assert first.status_code == 200
    assert replay.status_code == 200
    assert fetched.status_code == 200
    assert replay.json()["status"] == "arrived"
    assert replay.json()["version"] == 3

    events = await stored_events(database, mission.id)
    assert len(events) == 1
    assert events[0]["client_recorded_at"].isoformat() == "2026-10-04T00:05:00.123000"
    assert events[0]["server_recorded_at"] == stored_after_commit[0]["server_recorded_at"]
    assert replay.json()["status_history"][0]["client_recorded_at"] == (
        "2026-10-04T00:05:00.123000Z"
    )
    assert fetched.json()["status_history"][0]["client_recorded_at"] == (
        "2026-10-04T00:05:00.123000Z"
    )
    assert replay.json()["status_history"][0]["server_recorded_at"] == (
        first.json()["status_history"][0]["server_recorded_at"]
    )


@pytest.mark.asyncio
async def test_mongodb_replay_accepts_equivalent_timezone_representation(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:05:00.123456Z",
        )
        replay = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T08:05:00.123456+08:00",
        )

    assert first.status_code == 200
    assert replay.status_code == 200
    assert replay.json()["version"] == 3
    assert len(await stored_events(database, mission.id)) == 1


@pytest.mark.asyncio
async def test_mongodb_replay_rejects_materially_different_client_timestamp(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:05:00.123456Z",
        )
        conflict = await post_status(
            client,
            offline_fixture,
            client_recorded_at="2026-10-04T00:05:00.124456Z",
        )

    assert first.status_code == 200
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "duplicate_event"
    persisted = await stored_mission(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert len(await stored_events(database, mission.id)) == 1


@pytest.mark.asyncio
async def test_mongodb_replay_rejects_changed_note(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        first = await post_status(client, offline_fixture, note="Original note")
        conflict = await post_status(client, offline_fixture, note="Changed note")

    assert first.status_code == 200
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "duplicate_event"
    persisted = await stored_mission(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert len(await stored_events(database, mission.id)) == 1


@pytest.mark.asyncio
async def test_mongodb_stale_version_rejection_has_no_writes(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    await database["missions"].update_one(
        {"id": mission.id},
        {"$set": {"status": "arrived"}, "$inc": {"version": 1}},
    )
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await post_status(client, offline_fixture, event_id="offline-event-stale")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "stale_mission_version"
    persisted = await stored_mission(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert await stored_events(database, mission.id) == []


@pytest.mark.asyncio
@pytest.mark.parametrize("requested_status", ["completed", "assigned", "en-route"])
async def test_mongodb_invalid_transition_rejection_has_no_writes(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
    requested_status: str,
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    before = await stored_mission(database, mission.id)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=mission_api(database)), base_url="http://testserver") as client:
        response = await post_status(client, offline_fixture, new_status=requested_status)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_transition"
    assert await stored_mission(database, mission.id) == before
    assert await stored_events(database, mission.id) == []


@pytest.mark.asyncio
async def test_mongodb_unauthorized_and_reassigned_rescuer_replay_is_rejected(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    app = mission_api(database)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        accepted = await post_status(client, offline_fixture)
        wrong_rescuer = await post_status(
            client,
            offline_fixture,
            headers=rescuer_headers("rescuer-bravo"),
        )

        await database["missions"].update_one(
            {"id": mission.id},
            {"$set": {"team_id": "rescuer-bravo", "assigned_rescuer_id": "rescuer-bravo"}},
        )
        reassigned_original = await post_status(client, offline_fixture)

    assert accepted.status_code == 200
    assert wrong_rescuer.status_code == 403
    assert wrong_rescuer.json()["error"]["code"] == "forbidden"
    assert reassigned_original.status_code == 403
    assert reassigned_original.json()["error"]["code"] == "forbidden"
    persisted = await stored_mission(database, mission.id)
    events = await stored_events(database, mission.id)
    assert persisted["status"] == "arrived"
    assert persisted["version"] == 3
    assert len(events) == 1


class RecordingMissionRepository(MissionRepository):
    def __init__(self, database: AsyncDatabase) -> None:
        super().__init__(database)
        self.update_attempted = False

    async def update_status_if_current(self, *args: Any, **kwargs: Any) -> Mission | None:
        self.update_attempted = True
        return await super().update_status_if_current(*args, **kwargs)


class FailingEventRepository(MissionStatusEventRepository):
    async def append(
        self,
        event: MissionStatusEvent,
        session: AsyncClientSession | None = None,
    ) -> MissionStatusEvent:
        raise RuntimeError("forced history persistence failure")


@pytest.mark.asyncio
async def test_mongodb_history_failure_rolls_back_mission_update(
    database: AsyncDatabase,
    offline_fixture: dict[str, Any],
) -> None:
    mission = await seed_offline_mission(database, offline_fixture)
    missions = RecordingMissionRepository(database)
    before_request = await database["rescue_requests"].find_one({"id": mission.request_id})
    before_team = await database["rescuers"].find_one({"id": mission.team_id})
    service = MissionService(missions, FailingEventRepository(database))
    payload = MissionStatusEventCreate.model_validate(offline_body(offline_fixture))

    with pytest.raises(RuntimeError, match="forced history persistence failure"):
        await service.create_status_event(
            mission.id,
            payload,
            actor=DemoActor(user_id="rescuer-alpha", role="rescuer"),
        )

    persisted = await stored_mission(database, mission.id)
    events = await stored_events(database, mission.id)
    assert missions.update_attempted is True
    assert persisted["status"] == "en-route"
    assert persisted["version"] == 2
    assert events == []
    assert await database["rescue_requests"].find_one({"id": mission.request_id}) == before_request
    assert await database["rescuers"].find_one({"id": mission.team_id}) == before_team
