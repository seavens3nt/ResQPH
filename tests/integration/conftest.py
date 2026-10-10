"""The legacy integration suite opts into demo headers for fixture actors."""

import os

os.environ.setdefault("AUTH_ALLOW_DEMO_HEADERS", "true")

import pytest


@pytest.fixture(autouse=True)
def reset_local_rate_limit_buckets():
    from app.core.rate_limit import _buckets

    _buckets.clear()
