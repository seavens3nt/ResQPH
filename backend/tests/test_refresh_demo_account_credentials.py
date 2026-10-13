from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from pymongo import MongoClient

from app.management.refresh_demo_account_credentials import (
    load_plan,
    refresh_credentials,
)
from app.security.passwords import hash_password, verify_password

STATIONS = [
    ("Sampaloc Fire Station", "sampaloc-fire-station", "sampaloc@example.test"),
    ("Central Sampaloc Fire and Rescue Volunteer Brigade", "central-sampaloc-algeciras", "algeciras@example.test"),
    ("Central Sampaloc Fire and Rescue Brigade Headquarters", "central-sampaloc-lacson-hq", "lacson@example.test"),
    ("Iverson Fire and Rescue Volunteer", "iverson-fire-rescue", "iverson@example.test"),
    ("David Fire and Rescue Volunteer Inc. Headquarters", "david-fire-rescue-hq", "david@example.test"),
]


def _plan() -> list[dict[str, str | None]]:
    rows: list[dict[str, str | None]] = []
    for index in range(1, 4):
        rows.append({
            "account_id": f"account-citizen-{index}", "name": f"Demo Citizen {index}", "role": "citizen",
            "station_id": None, "current_email": f"citizen.test.20261013.d0e859.{index}@example.test",
            "email": f"citizen{index}@example.test", "password": f"river-lantern-meadow-cloud-{index}",
        })
    for index, (name, station_id, email) in enumerate(STATIONS):
        rows.append({
            "account_id": f"account-station-{index}", "name": name, "role": "rescuer",
            "station_id": station_id, "current_email": f"station.test.{station_id}.d0e859@example.test",
            "email": email, "password": f"quiet-maple-harbor-field-{index}",
        })
    return rows


@pytest.fixture
def disposable_db(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    uri = os.environ.get("MONGODB_INTEGRATION_URI")
    if not uri:
        pytest.skip("MONGODB_INTEGRATION_URI is required for disposable replica-set tests")
    database_name = f"resqph_cred_refresh_disposable_{uuid4().hex}"
    mongo = MongoClient(uri, serverSelectionTimeoutMS=5000)
    assert database_name not in mongo.list_database_names()
    monkeypatch.setattr("app.management.refresh_demo_account_credentials.settings.mongodb_database", database_name)
    monkeypatch.setattr("app.management.refresh_demo_account_credentials.settings.mongodb_uri", uri)
    rows = _plan()
    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps({"environment": "staging", "accounts": rows}), encoding="utf-8")
    database = mongo[database_name]
    database.accounts.create_index("email", unique=True, name="uq_account_email")
    database.accounts.create_index("id", unique=True, name="uq_account_id")
    for row in rows:
        database.accounts.insert_one({
            "id": row["account_id"], "email": row["current_email"], "name": row["name"],
            "role": "rescuer" if row["role"] == "rescuer" else "citizen",
            "station_id": row["station_id"], "password_hash": hash_password("old-password-for-tests"),
        })
        database.auth_sessions.insert_one({"account_id": row["account_id"], "token_hash": uuid4().hex})
    active_station = STATIONS[1][1]
    database.missions.insert_one({"id": "active-mission", "station_id": active_station, "status": "assigned"})
    database.rescue_requests.insert_one({"id": "active-request", "assigned_station_id": active_station, "status": "assigned"})
    try:
        yield uri, database_name, database, rows, plan_path
    finally:
        assert database_name.startswith("resqph_cred_refresh_disposable_")
        mongo.drop_database(database_name)
        mongo.close()


def test_refresh_preserves_identity_revokes_sessions_and_blocks_active_station(disposable_db) -> None:
    uri, database_name, database, rows, plan_path = disposable_db
    monkeypatch_settings(uri, database_name)

    assert asyncio.run(refresh_credentials(plan_path)) == (7, 1)
    for row in rows:
        account = database.accounts.find_one({"id": row["account_id"]})
        assert account["role"] == ("rescuer" if row["role"] == "rescuer" else "citizen")
        assert account.get("station_id") == row["station_id"]
        if row["station_id"] == STATIONS[1][1]:
            assert account["email"] == row["current_email"]
            assert database.auth_sessions.count_documents({"account_id": row["account_id"]}) == 1
            assert verify_password("old-password-for-tests", account["password_hash"])
        else:
            assert account["email"] == row["email"]
            assert database.auth_sessions.count_documents({"account_id": row["account_id"]}) == 0
            assert verify_password(str(row["password"]), account["password_hash"])
    assert database.accounts.count_documents({}) == 8
    assert database.accounts.index_information()["uq_account_email"]["unique"] is True
    assert asyncio.run(refresh_credentials(plan_path)) == (7, 1)
    assert database.accounts.count_documents({}) == 8


def monkeypatch_settings(uri: str, database_name: str) -> None:
    from app.core.config import settings

    settings.mongodb_uri = uri
    settings.mongodb_database = database_name


def test_target_email_conflict_aborts_all_changes(disposable_db) -> None:
    uri, database_name, database, rows, plan_path = disposable_db
    monkeypatch_settings(uri, database_name)
    database.accounts.insert_one({"id": "account-unrelated", "email": rows[0]["email"], "role": "citizen"})

    with pytest.raises(ValueError, match="target email"):
        asyncio.run(refresh_credentials(plan_path))
    assert database.accounts.find_one({"id": rows[0]["account_id"]})["email"] == rows[0]["current_email"]
    assert database.auth_sessions.count_documents({}) == 8


def test_plan_requires_exact_synthetic_account_count(tmp_path: Path) -> None:
    path = tmp_path / "bad-plan.json"
    path.write_text(json.dumps({"environment": "staging", "accounts": []}), encoding="utf-8")
    with pytest.raises(ValueError, match="eight designated"):
        load_plan(path)
