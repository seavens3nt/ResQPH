import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.db.mongodb import get_database

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "status": "ok",
        "version": settings.app_version,
    }


@router.get("/ready")
async def readiness_check(request: Request) -> JSONResponse:
    database_ready = False
    try:
        async with asyncio.timeout(settings.readiness_timeout_seconds):
            await get_database().command("ping")
        database_ready = True
    except (TimeoutError, PyMongoError, RuntimeError):
        # Never expose connection strings, driver errors or database names.
        database_ready = False
    worker = getattr(request.app.state, "dispatch_worker", None)
    task = getattr(request.app.state, "dispatch_task", None)
    dispatch_ready = bool(worker and worker.healthy and task and not task.done())
    ready = database_ready and dispatch_ready
    return JSONResponse(status_code=200 if ready else 503, content={
        "status": "ready" if ready else "unavailable",
        "database": "ok" if database_ready else "unavailable",
        "dispatch": "ok" if dispatch_ready else "unavailable",
        "release": settings.release_sha,
    })
