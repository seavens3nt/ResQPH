import base64
import binascii
import json
from datetime import datetime
from typing import Any

from pymongo import ASCENDING, DESCENDING, GEOSPHERE, ReturnDocument
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.models.rescue_request import RequestStatus, RescueRequest


class DuplicateRescueRequestError(Exception):
    pass


class RescueRequestRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["rescue_requests"]

    async def ensure_indexes(self) -> None:
        await self._collection.create_index(
            [("id", ASCENDING)],
            name="uq_rescue_request_id",
            unique=True,
        )
        await self._collection.create_index(
            [("status", ASCENDING), ("created_at", DESCENDING)],
            name="ix_rescue_request_queue",
        )
        await self._collection.create_index(
            [("citizen_id", ASCENDING), ("created_at", DESCENDING)],
            name="ix_rescue_request_citizen_history",
        )
        await self._collection.create_index(
            [("citizen_id", ASCENDING), ("idempotency_key", ASCENDING)],
            name="uq_citizen_idempotency_key",
            unique=True,
            partialFilterExpression={"idempotency_key": {"$type": "string"}},
        )
        await self._collection.create_index(
            [("location.point", GEOSPHERE)],
            name="ix_rescue_request_location",
        )

    async def create(
        self,
        request: RescueRequest,
        session: AsyncClientSession | None = None,
    ) -> RescueRequest:
        try:
            await self._collection.insert_one(
                request.model_dump(mode="python"),
                session=session,
            )
        except DuplicateKeyError as exc:
            raise DuplicateRescueRequestError from exc
        return request

    async def get_by_id(
        self,
        request_id: str,
        session: AsyncClientSession | None = None,
    ) -> RescueRequest | None:
        document = await self._collection.find_one({"id": request_id}, session=session)
        if document is None:
            return None
        return RescueRequest.model_validate(document)

    async def get_by_idempotency_key(
        self, citizen_id: str, idempotency_key: str
    ) -> RescueRequest | None:
        document = await self._collection.find_one({
            "citizen_id": citizen_id,
            "idempotency_key": idempotency_key,
        })
        return RescueRequest.model_validate(document) if document else None

    async def set_assignment_reason(self, request_id: str, reason: str) -> None:
        await self._collection.update_one(
            {"id": request_id, "status": "pending", "mission_id": None},
            {"$set": {"assignment_reason": reason}},
        )

    async def list_visible(
        self,
        *,
        citizen_id: str | None,
        status: RequestStatus | None,
        limit: int,
        cursor: str | None,
    ) -> tuple[list[RescueRequest], str | None, int]:
        query: dict[str, Any] = {}
        if citizen_id is not None:
            query["citizen_id"] = citizen_id
        if status is not None:
            query["status"] = status

        cursor_values = decode_cursor(cursor) if cursor else None
        if cursor_values is not None:
            cursor_time, cursor_id = cursor_values
            query["$or"] = [
                {"created_at": {"$lt": cursor_time}},
                {"created_at": cursor_time, "id": {"$lt": cursor_id}},
            ]

        total_query = {key: value for key, value in query.items() if key != "$or"}
        total = await self._collection.count_documents(total_query)
        database_cursor = (
            self._collection.find(query)
            .sort([("created_at", DESCENDING), ("id", DESCENDING)])
            .limit(limit + 1)
        )
        documents = [document async for document in database_cursor]
        has_more = len(documents) > limit
        visible_documents = documents[:limit]
        requests = [
            RescueRequest.model_validate(document) for document in visible_documents
        ]

        next_cursor = None
        if has_more and requests:
            last = requests[-1]
            next_cursor = encode_cursor(last.created_at, last.id)
        return requests, next_cursor, total

    async def cancel_pending_if_current(
        self,
        *,
        request_id: str,
        expected_version: int,
        reason: str,
        cancelled_at: datetime,
        session: AsyncClientSession | None = None,
    ) -> RescueRequest | None:
        document = await self._collection.find_one_and_update(
            {
                "id": request_id,
                "status": "pending",
                "version": expected_version,
                "mission_id": None,
            },
            {
                "$set": {
                    "status": "cancelled",
                    "cancellation_reason": reason,
                    "cancelled_at": cancelled_at,
                    "updated_at": cancelled_at,
                },
                "$inc": {"version": 1},
                "$push": {
                    "status_history": {
                        "status": "cancelled",
                        "occurred_at": cancelled_at,
                        "note": reason,
                    }
                },
            },
            return_document=ReturnDocument.AFTER,
            session=session,
        )
        if document is None:
            return None
        return RescueRequest.model_validate(document)

    async def mark_assigned_if_current(
        self,
        *,
        request_id: str,
        expected_version: int,
        team_id: str,
        station_id: str | None,
        mission_id: str,
        assigned_at: datetime,
        session: AsyncClientSession,
    ) -> RescueRequest | None:
        document = await self._collection.find_one_and_update(
            {
                "id": request_id,
                "status": "pending",
                "version": expected_version,
                "mission_id": None,
            },
            {
                "$set": {
                    "status": "assigned",
                    "assigned_team_id": team_id,
                    "assigned_station_id": station_id,
                    "assignment_reason": "assigned",
                    "mission_id": mission_id,
                    "updated_at": assigned_at,
                },
                "$inc": {"version": 1},
                "$push": {
                    "status_history": {
                        "status": "assigned",
                        "occurred_at": assigned_at,
                        "note": f"Assigned to synthetic team {team_id}",
                    }
                },
            },
            return_document=ReturnDocument.AFTER,
            session=session,
        )
        if document is None:
            return None
        return RescueRequest.model_validate(document)


def encode_cursor(created_at: datetime, request_id: str) -> str:
    payload = json.dumps([created_at.isoformat(), request_id], separators=(",", ":"))
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_raw, request_id = json.loads(raw)
        return datetime.fromisoformat(created_at_raw), str(request_id)
    except (binascii.Error, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise ValueError("invalid cursor") from exc
