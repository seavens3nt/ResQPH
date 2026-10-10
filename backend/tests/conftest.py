"""The legacy API suite exercises the explicitly test-only demo adapter."""

import os

os.environ.setdefault("AUTH_ALLOW_DEMO_HEADERS", "true")

from app.core.config import settings

settings.auth_allow_demo_headers = True

import pytest


@pytest.fixture(autouse=True)
def _reset_rate_limits() -> None:
    from app.core.rate_limit import _buckets

    _buckets.clear()
