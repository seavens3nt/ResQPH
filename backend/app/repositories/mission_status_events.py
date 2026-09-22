from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.models.mission_status_event import MissionStatusEvent


class DuplicateMissionStatusEventError(Exception):
    pass


class MissionStatusEventRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["mission_status_events"]

    async def get_by_event_id(self, event_id: str) -> MissionStatusEvent | None:
        document = await self._collection.find_one({"event_id": event_id})
        if document is None:
            return None
        return MissionStatusEvent.model_validate(document)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        cursor = self._collection.find({"mission_id": mission_id}).sort("server_recorded_at", 1)
        return [MissionStatusEvent.model_validate(document) async for document in cursor]

    async def append(self, event: MissionStatusEvent) -> MissionStatusEvent:
        try:
            await self._collection.insert_one(event.model_dump())
        except DuplicateKeyError as exc:
            raise DuplicateMissionStatusEventError from exc
        return event
