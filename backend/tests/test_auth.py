from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import demo_role
from app.core.config import settings
from app.db.mongodb import get_database
from app.main import app
from app.security.passwords import hash_password
from app.services.stations import load_station_catalog


class MemoryCollection:
    def __init__(self) -> None:
        self.items: list[dict[str, Any]] = []

    async def create_index(self, *_args: Any, **_kwargs: Any) -> str:
        return "test-index"

    async def insert_one(self, document: dict[str, Any]) -> SimpleNamespace:
        if "email" in document and any(item.get("email") == document["email"] for item in self.items):
            raise DuplicateKeyError("duplicate email")
        self.items.append({**document})
        return SimpleNamespace(inserted_id=len(self.items))

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for item in self.items:
            matches = True
            for key, value in query.items():
                if isinstance(value, dict) and "$gt" in value:
                    matches = matches and item.get(key, datetime.min.replace(tzinfo=UTC)) > value["$gt"]
                else:
                    matches = matches and item.get(key) == value
            if matches:
                return item
        return None

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> SimpleNamespace:
        item = await self.find_one(query)
        if item is None:
            return SimpleNamespace(modified_count=0)
        item.update(update.get("$set", {}))
        return SimpleNamespace(modified_count=1)

    async def delete_one(self, query: dict[str, Any]) -> SimpleNamespace:
        item = await self.find_one(query)
        if item is None:
            return SimpleNamespace(deleted_count=0)
        self.items.remove(item)
        return SimpleNamespace(deleted_count=1)


class MemoryDatabase:
    def __init__(self) -> None:
        self.collections = {"accounts": MemoryCollection(), "auth_sessions": MemoryCollection()}

    def __getitem__(self, name: str) -> MemoryCollection:
        return self.collections.setdefault(name, MemoryCollection())


@pytest.fixture
def auth_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, MemoryDatabase]:
    database = MemoryDatabase()
    monkeypatch.setattr(settings, "auth_allow_demo_headers", False)
    monkeypatch.setattr(settings, "auth_cookie_secure", False)
    monkeypatch.setattr(demo_role, "get_database", lambda: database)
    app.dependency_overrides[get_database] = lambda: database
    client = TestClient(app)
    yield client, database
    client.close()
    app.dependency_overrides.pop(get_database, None)


def test_citizen_registration_login_restore_profile_and_logout(auth_client: tuple[TestClient, MemoryDatabase]) -> None:
    client, database = auth_client
    registered = client.post("/api/v1/auth/register", json={
        "name": "  Test Citizen  ", "email": "Citizen@Example.test", "password": "Longer-Test-Password-55",
    })
    assert registered.status_code == 201, registered.json()
    assert registered.json()["email"] == "citizen@example.test"
    assert "password_hash" not in registered.json()
    assert client.cookies.get("resqph_session")
    assert "httponly" in registered.headers.get("set-cookie", "").lower()

    account = database["accounts"].items[0]
    assert account["password_hash"] != "Longer-Test-Password-55"
    assert account["password_hash"].startswith("scrypt$")

    duplicate = client.post("/api/v1/auth/register", json={
        "name": "Other Citizen", "email": "citizen@example.test", "password": "Longer-Test-Password-55",
    })
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_already_registered"

    restored = client.get("/api/v1/auth/session")
    assert restored.status_code == 200
    assert restored.json()["user"]["id"] == account["id"]

    csrf = client.cookies.get("resqph_csrf")
    profile = client.patch("/api/v1/auth/profile", json={"name": "Citizen Updated"}, headers={"X-CSRF-Token": csrf})
    assert profile.status_code == 200
    assert profile.json()["name"] == "Citizen Updated"

    logout = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/session").status_code == 401
    assert database["auth_sessions"].items == []


def test_station_login_checks_server_membership_and_demo_header_rejection(auth_client: tuple[TestClient, MemoryDatabase]) -> None:
    client, database = auth_client
    station = load_station_catalog()["stations"][0]
    account = {
        "id": "station-account-1", "email": "station@example.test", "name": station["name"],
        "role": "rescuer", "password_hash": hash_password("Longer-Station-Password-55"),
        "station_id": station["station_id"], "created_at": datetime.now(UTC),
    }
    database["accounts"].items.append(account)

    wrong_station = client.post("/api/v1/auth/login", json={
        "email": account["email"], "password": "Longer-Station-Password-55", "station_id": "iverson-fire-rescue",
    })
    assert wrong_station.status_code == 403, wrong_station.json()
    assert wrong_station.json()["error"]["code"] == "station_membership_mismatch"

    valid_login = client.post("/api/v1/auth/login", json={
        "email": account["email"], "password": "Longer-Station-Password-55", "station_id": station["station_id"],
    })
    assert valid_login.status_code == 200
    restored = client.get("/api/v1/auth/session").json()["user"]
    assert restored["station_id"] == station["station_id"]
    assert restored["station_name"] == station["name"]

    client.cookies.clear()
    forged = client.get("/api/v1/missions", headers={"X-Demo-Role": "rescuer", "X-Demo-User-Id": "team-charlie"})
    assert forged.status_code == 401
    assert forged.json()["error"]["code"] == "authentication_required"
