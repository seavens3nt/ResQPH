"""Disposable database evidence for overlapping workers and restart reconciliation."""
import asyncio
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pymongo import AsyncMongoClient

from app.repositories.dispatch_jobs import DispatchJobRepository

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_MONGODB_INTEGRATION") != "1", reason="Explicit disposable replica-set acceptance",
)


@pytest.mark.asyncio
async def test_overlapping_claims_restart_reconciliation_and_expired_lease():
    client = AsyncMongoClient(os.environ["MONGODB_INTEGRATION_URI"], serverSelectionTimeoutMS=5000)
    name = f"resqph_disposable_dispatch_{uuid4().hex}"
    owned = False
    try:
        assert name not in await client.list_database_names()
        database = client[name]
        owned = True
        first = DispatchJobRepository(database)
        second = DispatchJobRepository(database)
        await first.ensure_indexes()
        now = datetime.now(UTC)
        await database["rescue_requests"].insert_one({
            "id": "synthetic-pending", "status": "pending", "mission_id": None,
            "reported_severity": "high", "created_at": now,
        })
        await first.reconcile_pending_requests()
        # Two overlapping API processes cannot claim the same active lease.
        claims = await asyncio.gather(first.claim(now + timedelta(seconds=1)), second.claim(now + timedelta(seconds=1)))
        leased = next(claim for claim in claims if claim is not None)
        assert sum(claim is not None for claim in claims) == 1
        # A restarted process wakes pending work but must not steal a live lease.
        await second.reconcile_pending_requests()
        assert await second.claim(now + timedelta(seconds=2)) is None
        recovered = await second.claim(now + timedelta(seconds=32))
        assert recovered is not None and recovered["lease_token"] != leased["lease_token"]
        # An old process finishing after lease expiry cannot remove the new owner's job.
        await first.finish(leased)
        assert await database["dispatch_jobs"].count_documents({}) == 1
        await second.finish(recovered)
        assert await database["dispatch_jobs"].count_documents({}) == 0
    finally:
        if owned:
            assert name.startswith("resqph_disposable_dispatch_")
            await client.drop_database(name)
        await client.close()
