from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import assignments, health, missions, rescue_requests, ml
from app.core.config import settings
from app.db.mongodb import close_mongodb, connect_mongodb, get_database
from app.db.setup import initialize_database
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)
from app.services import ml_inference


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
app.include_router(ml.router, prefix=settings.api_prefix)

app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)