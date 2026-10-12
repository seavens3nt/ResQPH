"""Hosted configuration, bounded readiness and origin/cache security contracts."""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes import health
from app.core.config import Settings, settings
from app.db.mongodb import get_database
from app.main import app, lifespan
from app.services.dispatch_worker import DispatchWorker


def hosted_settings(**changes):
    return Settings(_env_file=None, **{
        "app_environment": "production",
        "mongodb_uri": "mongodb+srv://synthetic:nonsecret@cluster.example.mongodb.net/",
        "mongodb_database": "resqph_production",
        "frontend_origins": "https://resqph.example.test",
        "auth_cookie_secure": True,
        "auth_allow_demo_headers": False,
        "ml_enabled": False,
        **changes,
    })


def test_valid_hosted_settings_and_staging_isolation():
    assert hosted_settings().auth_cookie_samesite == "lax"
    assert hosted_settings(app_environment="staging", mongodb_database="resqph_staging")


@pytest.mark.parametrize("changes", [
    {"auth_cookie_secure": False}, {"auth_allow_demo_headers": True}, {"ml_enabled": True},
    {"auth_cookie_samesite": "none"}, {"frontend_origins": ""},
    {"frontend_origins": "http://localhost:5173"}, {"frontend_origins": "https://*.vercel.app"},
    {"frontend_origins": "https://resqph.example.test/path"},
    {"mongodb_uri": "mongodb://localhost:27017/?replicaSet=rs0"},
    {"mongodb_uri": "mongodb+srv://synthetic:nonsecret@cluster.example.mongodb.net/?directConnection=true"},
    {"mongodb_database": "resqph_staging"}, {"api_prefix": "/other"},
])
def test_hosted_settings_fail_closed(changes):
    with pytest.raises(ValidationError) as error:
        hosted_settings(**changes)
    assert "nonsecret" not in str(error.value)


@pytest.mark.parametrize("path", ["/auth/login", "/auth/register", "/auth/logout"])
def test_unsafe_requests_require_exact_origin(monkeypatch, path):
    monkeypatch.setitem(app.dependency_overrides, get_database, lambda: None)
    monkeypatch.setattr(settings, "app_environment", "production")
    monkeypatch.setattr(settings, "frontend_origins", "https://resqph.example.test")
    client = TestClient(app, base_url="https://resqph.example.test")
    for headers in [{}, {"Origin": "https://evil.example.test"},
                    {"Origin": "null", "X-Forwarded-Host": "resqph.example.test"}]:
        response = client.post("/api/v1" + path, json={}, headers=headers)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "origin_not_allowed"
        assert response.headers["cache-control"] == "private, no-store"
    # Correct origin reaches validation, not the origin rejection.
    response = client.post("/api/v1/auth/login", json={}, headers={"Origin": "https://resqph.example.test"})
    assert response.status_code == 422
    client.close()


def test_api_liveness_and_errors_are_not_publicly_cached():
    client = TestClient(app)
    for path in ["/api/v1/health", "/api/v1/nonexistent"]:
        response = client.get(path)
        assert response.headers["cache-control"] == "private, no-store"
        assert response.headers["cdn-cache-control"] == "no-store"
        assert response.headers["vercel-cdn-cache-control"] == "no-store"
        assert "application/json" in response.headers["content-type"]
    client.close()


@pytest.mark.parametrize("database_ok,worker_ok,task_done,expected", [
    (True, True, False, 200), (False, True, False, 503),
    (True, False, False, 503), (True, True, True, 503),
])
def test_readiness_requires_database_and_live_worker(monkeypatch, database_ok, worker_ok, task_done, expected):
    async def command(_name):
        if not database_ok:
            raise RuntimeError("sensitive connection details must not escape")
        return {"ok": 1}
    monkeypatch.setattr(health, "get_database", lambda: SimpleNamespace(command=command))
    monkeypatch.setattr(app.state, "dispatch_worker", SimpleNamespace(healthy=worker_ok), raising=False)
    monkeypatch.setattr(app.state, "dispatch_task", SimpleNamespace(done=lambda: task_done), raising=False)
    client = TestClient(app)
    response = client.get("/api/v1/ready")
    assert response.status_code == expected
    assert "sensitive" not in response.text
    client.close()


@pytest.mark.asyncio
async def test_readiness_timeout_is_bounded(monkeypatch):
    async def command(_name):
        await asyncio.sleep(10)
    monkeypatch.setattr(health, "get_database", lambda: SimpleNamespace(command=command))
    monkeypatch.setattr(settings, "readiness_timeout_seconds", 0.01)
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))
    response = await asyncio.wait_for(health.readiness_check(request), timeout=0.5)
    assert response.status_code == 503


def test_dispatch_health_detects_staleness_and_repeated_errors(monkeypatch):
    worker = DispatchWorker(None, None, None)
    assert worker.healthy
    worker.consecutive_failures = 3
    assert not worker.healthy
    worker.consecutive_failures = 0
    worker.last_success_at -= 61
    assert not worker.healthy


@pytest.mark.asyncio
async def test_database_startup_failure_prevents_serving(monkeypatch):
    from app import main

    async def unavailable():
        raise RuntimeError("sanitized startup failure")
    monkeypatch.setattr(main, "connect_mongodb", unavailable)
    with pytest.raises(RuntimeError, match="sanitized startup failure"):
        async with lifespan(app):
            pytest.fail("Application must not start without its database")
