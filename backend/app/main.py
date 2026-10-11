import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api.routes import (
    auth,
    health,
    missions,
    ml,
    rescue_requests,
    routing,
    weather,
)
from app.core.config import settings
from app.core.rate_limit import RateLimitExceeded, rate_limit_error_handler
from app.db.mongodb import close_mongodb, connect_mongodb, get_database
from app.db.setup import initialize_database
from app.integrations import ml_inference
from app.repositories.assignments import AssignmentRepository
from app.repositories.dispatch_jobs import DispatchJobRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)
from app.services.assignments import AssignmentService
from app.services.dispatch_worker import DispatchWorker


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await connect_mongodb()
    stop_worker = asyncio.Event()
    worker_task: asyncio.Task | None = None
    try:
        await initialize_database(get_database())
        ml_inference.initialize()
        database = get_database()
        jobs = DispatchJobRepository(database)
        await jobs.reconcile_pending_requests()
        requests = RescueRequestRepository(database)
        worker = DispatchWorker(
            jobs,
            requests,
            AssignmentService(
                requests,
                RescuerRepository(database),
                AssignmentRepository(database),
            ),
        )
        worker_task = asyncio.create_task(worker.run(stop_worker), name="automatic-dispatch")
        yield
    finally:
        stop_worker.set()
        if worker_task is not None:
            worker_task.cancel()
            await asyncio.gather(worker_task, return_exceptions=True)
        ml_inference.shutdown()
        await close_mongodb()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the ResQPH academic engineering prototype.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key", "X-Request-Id"],
    max_age=600,
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(rescue_requests.router, prefix=settings.api_prefix)
app.include_router(missions.router, prefix=settings.api_prefix)
app.include_router(weather.router, prefix=settings.api_prefix)
app.include_router(ml.router, prefix=settings.api_prefix)
app.include_router(routing.router, prefix=settings.api_prefix)

app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(RateLimitExceeded, rate_limit_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.exception_handler(PyMongoError)
async def database_error(_, exc: PyMongoError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "database_unavailable",
                "message": "The prototype database is unavailable. No success is confirmed.",
                "details": [],
            }
        },
    )
