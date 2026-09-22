from datetime import datetime
from typing import Any

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.mission import Mission, MissionStatus


class MissionRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["missions"]

    async def list_for_rescuer(
        self,
        rescuer_id: str,
        statuses: list[MissionStatus] | None = None,
    ) -> list[Mission]:
        query: dict[str, Any] = {
            "$or": [{"team_id": rescuer_id}, {"assigned_rescuer_id": rescuer_id}],
        }
        if statuses:
            query["status"] = {"$in": statuses}

        cursor = self._collection.find(query).sort("assigned_at", -1)
        return [Mission.model_validate(document) async for document in cursor]

    async def list_all(self, statuses: list[MissionStatus] | None = None) -> list[Mission]:
        query: dict[str, Any] = {}
        if statuses:
            query["status"] = {"$in": statuses}

        cursor = self._collection.find(query).sort("assigned_at", -1)
        return [Mission.model_validate(document) async for document in cursor]

    async def get_by_id(self, mission_id: str) -> Mission | None:
        document = await self._collection.find_one({"id": mission_id})
        if document is None:
            return None
        return Mission.model_validate(document)

    async def update_status_if_current(
        self,
        mission_id: str,
        expected_version: int,
        prior_status: MissionStatus,
        new_status: MissionStatus,
        recorded_at: datetime,
    ) -> Mission | None:
        update: dict[str, Any] = {
            "$set": {
                "status": new_status,
                "updated_at": recorded_at,
            },
            "$inc": {"version": 1},
        }
        if new_status == "completed":
            update["$set"]["completed_at"] = recorded_at

        document = await self._collection.find_one_and_update(
            {
                "id": mission_id,
                "status": prior_status,
                "version": expected_version,
            },
            update,
            return_document=ReturnDocument.AFTER,
        )
        if document is None:
            return None
        return Mission.model_validate(document)
