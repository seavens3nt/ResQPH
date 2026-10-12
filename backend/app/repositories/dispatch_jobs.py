from datetime import UTC, datetime, timedelta
from uuid import uuid4

from pymongo import ASCENDING, ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase


class DispatchJobRepository:
    """Durable retry queue for accepted requests that have no station capacity yet."""

    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["dispatch_jobs"]
        self._requests = database["rescue_requests"]

    async def ensure_indexes(self) -> None:
        await self._collection.create_index("request_id", unique=True, name="uq_dispatch_request")
        await self._collection.create_index(
            [("next_attempt_at", ASCENDING), ("severity_rank", ASCENDING), ("created_at", ASCENDING)],
            name="ix_dispatch_due_priority",
        )

    async def enqueue(self, request_id: str, severity: str, created_at: datetime) -> None:
        severity_rank = {"critical": 0, "high": 1, "moderate": 2, "low": 3}.get(severity, 2)
        now = datetime.now(UTC)
        await self._collection.update_one(
            {"request_id": request_id},
            {"$setOnInsert": {
                "request_id": request_id,
                "severity_rank": severity_rank,
                "created_at": created_at,
                "next_attempt_at": now,
                "attempts": 0,
                "lease_until": None,
                "lease_token": None,
            }},
            upsert=True,
        )

    async def claim(self, now: datetime) -> dict | None:
        return await self._collection.find_one_and_update(
            {
                "next_attempt_at": {"$lte": now},
                "$or": [{"lease_until": None}, {"lease_until": {"$lte": now}}],
            },
            {"$set": {"lease_until": now + timedelta(seconds=30), "lease_token": uuid4().hex}},
            sort=[("severity_rank", ASCENDING), ("created_at", ASCENDING)],
            return_document=ReturnDocument.AFTER,
        )

    async def retry(self, job: dict, now: datetime) -> None:
        attempts = int(job.get("attempts", 0)) + 1
        delay = min(3600, 2 ** min(attempts, 12))
        await self._collection.update_one(
            {"request_id": job["request_id"], "lease_token": job["lease_token"]},
            {"$set": {"attempts": attempts, "next_attempt_at": now + timedelta(seconds=delay), "lease_until": None, "lease_token": None}},
        )

    async def finish(self, job: dict) -> None:
        await self._collection.delete_one({"request_id": job["request_id"], "lease_token": job["lease_token"]})

    async def discard(self, request_id: str) -> None:
        await self._collection.delete_one({"request_id": request_id})

    async def wake_pending(self) -> None:
        await self._collection.update_many(
            {},
            {"$set": {"next_attempt_at": datetime.now(UTC)}},
        )

    async def reconcile_pending_requests(self) -> None:
        await self._collection.update_many(
            {},
            {"$set": {"next_attempt_at": datetime.now(UTC)}},
        )
        cursor = self._requests.find({"status": "pending", "mission_id": None})
        async for request in cursor:
            severity = request.get("reported_severity", "moderate")
            created_at = request.get("created_at", datetime.now(UTC))
            await self.enqueue(request["id"], severity, created_at)
