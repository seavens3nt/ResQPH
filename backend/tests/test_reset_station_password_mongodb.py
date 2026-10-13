from __future__ import annotations

import asyncio
import os
from uuid import uuid4

import pytest
from pymongo import MongoClient

from app.core.config import settings
from app.management.reset_station_password import reset_password
from app.security.passwords import hash_password, verify_password


@pytest.fixture
def station_database(monkeypatch: pytest.MonkeyPatch):
    uri = os.environ.get("MONGODB_INTEGRATION_URI")
    if not uri:
        pytest.skip("MONGODB_INTEGRATION_URI is required for disposable replica-set tests")
    database_name = f"resqph_stn_reset_{uuid4().hex}"
    mongo = MongoClient(uri, serverSelectionTimeoutMS=5000)
    assert database_name not in mongo.list_database_names()
    monkeypatch.setattr(settings, "mongodb_uri", uri)
    monkeypatch.setattr(settings, "mongodb_database", database_name)
    database = mongo[database_name]
    database.accounts.create_index("email", unique=True, name="uq_account_email")
    database.accounts.insert_one({
        "id": "account-station-test", "email": "station.test.central-sampaloc-algeciras.d0e859@example.test", "role": "rescuer",
        "station_id": "central-sampaloc-algeciras", "password_hash": hash_password("old-station-password-55"),
    })
    database.auth_sessions.insert_many([
        {"account_id": "account-station-test", "token_hash": uuid4().hex},
        {"account_id": "account-station-test", "token_hash": uuid4().hex},
    ])
    database.missions.insert_one({"id": "active-mission", "station_id": "central-sampaloc-algeciras", "status": "assigned"})
    database.rescue_requests.insert_one({"id": "active-request", "assigned_station_id": "central-sampaloc-algeciras", "status": "assigned"})
    try:
        yield database
    finally:
        assert database_name.startswith("resqph_stn_reset_")
        mongo.drop_database(database_name)
        mongo.close()


def test_active_work_requires_explicit_override_and_reset_revokes_sessions(station_database) -> None:
    database = station_database
    old_password = "old-station-password-55"
    new_password = "river-maple-harbor-cloud"
    with pytest.raises(ValueError, match="active work"):
        asyncio.run(reset_password(
            "station.test.central-sampaloc-algeciras.d0e859@example.test",
            "central-sampaloc-algeciras", new_password,
        ))
    untouched = database.accounts.find_one({"id": "account-station-test"})
    assert verify_password(old_password, untouched["password_hash"])
    assert database.auth_sessions.count_documents({"account_id": "account-station-test"}) == 2

    asyncio.run(reset_password(
        "station.test.central-sampaloc-algeciras.d0e859@example.test", "central-sampaloc-algeciras", new_password,
        allow_active_work=True, new_email="algeciras@example.test",
    ))
    updated = database.accounts.find_one({"id": "account-station-test"})
    assert updated["id"] == "account-station-test"
    assert updated["email"] == "algeciras@example.test"
    assert updated["station_id"] == "central-sampaloc-algeciras"
    assert verify_password(new_password, updated["password_hash"])
    assert not verify_password(old_password, updated["password_hash"])
    assert database.auth_sessions.count_documents({"account_id": "account-station-test"}) == 0
    assert database.missions.count_documents({"id": "active-mission", "status": "assigned"}) == 1
    assert database.rescue_requests.count_documents({"id": "active-request", "status": "assigned"}) == 1


def test_reset_refuses_mismatched_station_membership(station_database) -> None:
    with pytest.raises(ValueError, match="No existing station account"):
        asyncio.run(reset_password("station.test.central-sampaloc-algeciras.d0e859@example.test", "iverson-fire-rescue", "a-long-new-password"))


def test_reset_refuses_email_owned_by_another_account(station_database) -> None:
    database = station_database
    database.accounts.insert_one({"id": "account-unrelated", "email": "already-used@example.test"})
    with pytest.raises(ValueError, match="Target email belongs to another account"):
        asyncio.run(reset_password(
            "station.test.central-sampaloc-algeciras.d0e859@example.test", "central-sampaloc-algeciras", "a-long-new-password",
            allow_active_work=True, new_email="already-used@example.test",
        ))
    account = database.accounts.find_one({"id": "account-station-test"})
    assert account["email"] == "station.test.central-sampaloc-algeciras.d0e859@example.test"
    assert verify_password("old-station-password-55", account["password_hash"])
    assert database.auth_sessions.count_documents({"account_id": "account-station-test"}) == 2
