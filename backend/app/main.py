from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api.routes import (
    assignments,
    health,
    missions,
    ml,
    rescue_requests,
    routing,
    teams,
    weather,
)
from app.core.config import settings
from app.core.rate_limit import RateLimitExceeded, rate_limit_error_handler
from app.db.mongodb import close_mongodb, connect_mongodb, get_database
from app.db.setup import initialize_database
from app.integrations import ml_inference
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await connect_mongodb()
    try:
        await initialize_database(get_database())
        ml_inference.initialize()
        yield
    finally:
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
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(rescue_requests.router, prefix=settings.api_prefix)
app.include_router(assignments.router, prefix=settings.api_prefix)
app.include_router(missions.router, prefix=settings.api_prefix)
app.include_router(teams.router, prefix=settings.api_prefix)
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
