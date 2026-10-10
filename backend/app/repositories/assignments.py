from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.models.mission import Mission
from pymongo import ASCENDING
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

TransactionResult = TypeVar("TransactionResult")


class DuplicateAssignmentError(Exception):
    pass


class AssignmentRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._missions = database["missions"]

    async def ensure_indexes(self) -> None:
        await self._missions.create_index(
            [("id", ASCENDING)],
            name="uq_mission_id",
            unique=True,
        )
        await self._missions.create_index(
            [("request_id", ASCENDING)],
            name="uq_active_mission_per_request",
            unique=True,
            partialFilterExpression={
                "status": {"$in": ["assigned", "en-route", "arrived"]}
            },
        )
        await self._missions.create_index(
            [("team_id", ASCENDING), ("status", ASCENDING)],
            name="ix_mission_team_status",
        )

    async def run_in_transaction(
        self,
        callback: Callable[[AsyncClientSession], Awaitable[TransactionResult]],
    ) -> TransactionResult:
        client = self._missions.database.client
        async with client.start_session() as session:
            return await session.with_transaction(callback)

    async def create_mission(
        self,
        mission: Mission,
        session: AsyncClientSession,
    ) -> Mission:
        try:
            await self._missions.insert_one(
                mission.model_dump(mode="python"),
                session=session,
            )
        except DuplicateKeyError as exc:
            raise DuplicateAssignmentError from exc
        return mission

    async def rescuer_has_request(self, rescuer_id: str, request_id: str) -> bool:
        document = await self._missions.find_one(
            {
                "request_id": request_id,
                "$or": [
                    {"team_id": rescuer_id},
                    {"assigned_rescuer_id": rescuer_id},
                ],
            },
            projection={"_id": 1},
        )
        return document is not None
