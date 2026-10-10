from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.models.mission_status_event import MissionStatusEvent
from pymongo import ASCENDING
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

TransactionResult = TypeVar("TransactionResult")


class DuplicateMissionStatusEventError(Exception):
    pass


class MissionStatusEventRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["mission_status_events"]
        self._indexes_ready = False

    async def ensure_indexes(self) -> None:
        if self._indexes_ready:
            return
        await self._collection.create_index(
            [("event_id", ASCENDING)],
            name="uq_mission_status_event_id",
            unique=True,
        )
        await self._collection.create_index(
            [("mission_id", ASCENDING), ("server_recorded_at", ASCENDING)],
            name="ix_mission_status_event_history",
        )
        self._indexes_ready = True

    async def run_in_transaction(
        self,
        callback: Callable[[AsyncClientSession], Awaitable[TransactionResult]],
    ) -> TransactionResult:
        client = self._collection.database.client
        async with client.start_session() as session:
            return await session.with_transaction(callback)

    async def get_by_event_id(
        self,
        event_id: str,
        session: AsyncClientSession | None = None,
    ) -> MissionStatusEvent | None:
        document = await self._collection.find_one({"event_id": event_id}, session=session)
        if document is None:
            return None
        return MissionStatusEvent.model_validate(document)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        cursor = self._collection.find({"mission_id": mission_id}).sort("server_recorded_at", 1)
        return [MissionStatusEvent.model_validate(document) async for document in cursor]

    async def append(
        self,
        event: MissionStatusEvent,
        session: AsyncClientSession | None = None,
    ) -> MissionStatusEvent:
        try:
            await self._collection.insert_one(event.model_dump(), session=session)
        except DuplicateKeyError as exc:
            raise DuplicateMissionStatusEventError from exc
        return event
