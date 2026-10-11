from __future__ import annotations

import pytest
from fastapi import Request

from app.core import rate_limit


def request() -> Request:
    return Request({"type": "http", "method": "GET", "headers": [], "client": ("127.0.0.1", 1234)})


def test_rate_limit_returns_retry_after_and_recovers(monkeypatch: pytest.MonkeyPatch) -> None:
    rate_limit._buckets.clear()
    now = 10.0
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: now)
    rate_limit.check_rate_limit(request(), actor_id="citizen-1", action="test", limit=1)
    with pytest.raises(rate_limit.RateLimitExceeded) as raised:
        rate_limit.check_rate_limit(request(), actor_id="citizen-1", action="test", limit=1)
    assert raised.value.retry_after >= 1

    now += 61
    rate_limit.check_rate_limit(request(), actor_id="citizen-1", action="test", limit=1)


def test_rate_limit_bucket_storage_is_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    rate_limit._buckets.clear()
    monkeypatch.setattr(rate_limit, "_MAX_BUCKETS", 2)
    rate_limit._check_bucket("first", 10, 1.0)
    rate_limit._check_bucket("second", 10, 1.0)
    rate_limit._check_bucket("third", 10, 1.0)
    assert len(rate_limit._buckets) <= 2


@pytest.mark.asyncio
async def test_rate_limit_error_has_existing_envelope_and_retry_header() -> None:
    error = rate_limit.RateLimitExceeded(7)
    response = await rate_limit.rate_limit_error_handler(request(), error)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "7"
