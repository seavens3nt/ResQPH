from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.common import ServiceError, error_response

_WINDOW_SECONDS = 60.0
_buckets: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(
    request: Request,
    *,
    actor_id: str,
    action: str,
    limit: int,
) -> None:
    now = time.monotonic()
    client_host = request.client.host if request.client else "unknown"
    actor_key = f"actor:{action}:{actor_id or 'anonymous'}"
    ip_key = f"ip:{action}:{client_host}"
    _check_bucket(actor_key, limit, now)
    _check_bucket(ip_key, settings.broad_ip_rate_limit_per_minute, now)


def _check_bucket(key: str, limit: int, now: float) -> None:
    bucket = _buckets[key]
    while bucket and now - bucket[0] >= _WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= limit:
        retry_after = max(1, int(_WINDOW_SECONDS - (now - bucket[0])) + 1)
        raise RateLimitExceeded(retry_after)
    bucket.append(now)


class RateLimitExceeded(ServiceError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            429,
            "rate_limit_exceeded",
            "Too many prototype requests. Wait before retrying.",
            [{"field": "Retry-After", "reason": f"{retry_after} seconds"}],
        )
        self.retry_after = retry_after


async def rate_limit_error_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    response = error_response(exc, request.headers.get("X-Request-Id"))
    response.headers["Retry-After"] = str(exc.retry_after)
    return response


def make_rate_limit_dependency(
    *,
    action: str,
    limit_getter: Callable[[], int],
) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        actor_id = request.headers.get("X-Demo-User-Id", "").strip()
        check_rate_limit(
            request,
            actor_id=actor_id,
            action=action,
            limit=limit_getter(),
        )

    return dependency
