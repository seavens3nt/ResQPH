from datetime import datetime
from typing import Any

from pymongo import ReturnDocument
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase

from app.models.mission import Mission, MissionStatus


class MissionLifecycleConflictError(Exception):
    """The linked request or team no longer matches the mission transition."""


class MissionRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["missions"]
        self._requests = database["rescue_requests"]
        self._teams = database["rescuers"]
        self._dispatch_jobs = database["dispatch_jobs"]

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

    async def update_tracking_state(
        self,
        mission_id: str,
        tracking_state: dict[str, Any],
        updated_at: datetime,
        *,
        start_if_not_running: bool = False,
    ) -> Mission | None:
        query: dict[str, Any] = {"id": mission_id}
        if start_if_not_running:
            query.update({"status": "en-route", "tracking_state.status": {"$ne": "running"}})
        document = await self._collection.find_one_and_update(
            query,
            {
                "$set": {
                    "tracking_state": tracking_state,
                    "updated_at": updated_at,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
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
        tracking_state: dict[str, Any] | None = None,
        team_position: dict[str, Any] | None = None,
        session: AsyncClientSession | None = None,
    ) -> Mission | None:
        if session is None or not session.in_transaction:
            raise RuntimeError("Mission lifecycle updates require an active transaction.")
        update: dict[str, Any] = {
            "$set": {
                "status": new_status,
                "updated_at": recorded_at,
            },
            "$inc": {"version": 1},
        }
        if new_status == "completed":
            update["$set"]["completed_at"] = recorded_at
        if tracking_state is not None:
            update["$set"]["tracking_state"] = tracking_state

        document = await self._collection.find_one_and_update(
            {
                "id": mission_id,
                "status": prior_status,
                "version": expected_version,
            },
            update,
            return_document=ReturnDocument.AFTER,
            session=session,
        )
        if document is None:
            return None
        request_result = await self._requests.update_one(
            {"id": document["request_id"], "mission_id": mission_id, "status": prior_status},
            {
                "$set": {"status": new_status, "updated_at": recorded_at},
                "$inc": {"version": 1},
                "$push": {"status_history": {"status": new_status, "occurred_at": recorded_at}},
            },
            session=session,
        )
        availability = {"en-route": "en-route", "arrived": "on-scene", "completed": "available", "cancelled": "available"}
        team_update: dict[str, Any] = {
            "$set": {"availability": availability[new_status], "updated_at": recorded_at},
            "$inc": {"version": 1},
        }
        if new_status in {"completed", "cancelled"}:
            team_update["$set"].update({"assigned_request_id": None, "assigned_mission_id": None})
            if team_position is not None:
                team_update["$set"].update({"current_location": team_position, "position_updated_at": recorded_at})
        team_result = await self._teams.update_one(
            {
                "id": document["team_id"],
                "assigned_mission_id": mission_id,
                "assigned_request_id": document["request_id"],
            },
            team_update,
            session=session,
        )
        if request_result.modified_count != 1 or team_result.modified_count != 1:
            raise MissionLifecycleConflictError("Linked mission lifecycle records no longer match.")
        if new_status in {"completed", "cancelled"}:
            await self._dispatch_jobs.update_many(
                {},
                {"$set": {"next_attempt_at": recorded_at}},
                session=session,
            )
        return Mission.model_validate(document)

    async def record_cancellation_reason(
        self, request_id: str, reason: str, recorded_at: datetime,
        session: AsyncClientSession,
    ) -> None:
        await self._requests.update_one(
            {"id": request_id, "status": "cancelled"},
            {"$set": {"cancellation_reason": reason, "cancelled_at": recorded_at}},
            session=session,
        )
