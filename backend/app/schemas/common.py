from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

DemoRole = Literal["citizen", "rescuer", "coordinator"]


class DemoActor(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    role: DemoRole


class ErrorDetail(BaseModel):
    field: str
    reason: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class ServiceError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


def error_response(exc: ServiceError, request_id: str | None = None) -> JSONResponse:
    envelope = ErrorEnvelope(
        error={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id or f"trace-{uuid4().hex}",
        }
    )
    return JSONResponse(
        status_code=exc.status_code, content=envelope.model_dump(mode="json")
    )


async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    return error_response(exc, request.headers.get("X-Request-Id"))


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "reason": error["msg"],
        }
        for error in exc.errors()
    ]
    return error_response(
        ServiceError(422, "validation_error", "Request validation failed.", details),
        request.headers.get("X-Request-Id"),
    )


def serialize_utc(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
