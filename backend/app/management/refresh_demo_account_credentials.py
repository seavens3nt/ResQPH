"""Safely refresh the synthetic staging login credentials recorded in a private plan."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.schemas.auth import AccountRegister
from app.security.passwords import hash_password

ACTIVE_STATES = ["assigned", "en-route", "arrived"]
STATION_EMAILS = {
    "sampaloc-fire-station": "sampaloc@example.test",
    "central-sampaloc-algeciras": "algeciras@example.test",
    "central-sampaloc-lacson-hq": "lacson@example.test",
    "iverson-fire-rescue": "iverson@example.test",
    "david-fire-rescue-hq": "david@example.test",
}
STATION_NAMES = {
    "sampaloc-fire-station": "Sampaloc Fire Station",
    "central-sampaloc-algeciras": "Central Sampaloc Fire and Rescue Volunteer Brigade",
    "central-sampaloc-lacson-hq": "Central Sampaloc Fire and Rescue Brigade Headquarters",
    "iverson-fire-rescue": "Iverson Fire and Rescue Volunteer",
    "david-fire-rescue-hq": "David Fire and Rescue Volunteer Inc. Headquarters",
}


def load_plan(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("environment") != "staging":
        raise ValueError("Credential plan must explicitly target staging.")
    accounts = data.get("accounts")
    if not isinstance(accounts, list) or len(accounts) != 8:
        raise ValueError("Credential plan must contain the eight designated synthetic accounts.")
    seen_ids: set[str] = set()
    seen_emails: set[str] = set()
    roles: dict[str, int] = {"citizen": 0, "rescuer": 0}
    station_ids: set[str] = set()
    validated: list[dict[str, Any]] = []
    for item in accounts:
        if not isinstance(item, dict):
            raise TypeError("Credential plan contains an invalid account record.")
        account_id = item.get("account_id")
        if not isinstance(account_id, str) or not account_id.startswith("account-") or account_id in seen_ids:
            raise ValueError("Credential plan contains an invalid or duplicate account ID.")
        seen_ids.add(account_id)
        role = item.get("role")
        if role not in {"citizen", "rescuer"}:
            raise ValueError("Credential plan contains an unsupported role.")
        roles[role] += 1
        if role == "rescuer" and not item.get("station_id"):
            raise ValueError("Station accounts require their canonical station ID.")
        if role == "citizen" and item.get("station_id") is not None:
            raise ValueError("Citizen accounts cannot have station membership.")
        if role == "citizen":
            try:
                number = int(item["name"].rsplit(" ", 1)[1])
            except (KeyError, IndexError, ValueError) as exc:
                raise ValueError("Credential plan contains a non-demo citizen account.") from exc
            if number not in {1, 2, 3} or item["name"] != f"Demo Citizen {number}":
                raise ValueError("Credential plan contains a non-demo citizen account.")
            expected_current = f"citizen.test.20261013.d0e859.{number}@example.test"
            expected_email = f"citizen{number}@example.test"
            if item.get("current_email") != expected_current or item.get("email") != expected_email:
                raise ValueError("Credential plan does not match the designated synthetic citizen account.")
        else:
            station_id = item.get("station_id")
            if station_id not in STATION_EMAILS or station_id in station_ids:
                raise ValueError("Credential plan contains an unknown or duplicate station account.")
            station_ids.add(station_id)
            if item.get("name") != STATION_NAMES[station_id]:
                raise ValueError("Credential plan does not match the designated station account.")
            if (item.get("current_email") != f"station.test.{station_id}.d0e859@example.test"
                    or item.get("email") != STATION_EMAILS[station_id]):
                raise ValueError("Credential plan does not match the designated synthetic station account.")
        current_email = item.get("current_email")
        email = item.get("email")
        if not isinstance(current_email, str) or not isinstance(email, str):
            raise TypeError("Credential plan requires current and target emails.")
        password = item.get("password")
        account = AccountRegister(name=item["name"], email=email, password=password)
        normalized_email = str(account.email)
        if normalized_email in seen_emails:
            raise ValueError("Credential plan contains duplicate target emails.")
        seen_emails.add(normalized_email)
        validated.append({**item, "email": normalized_email, "name": account.name, "password": account.password})
    if roles != {"citizen": 3, "rescuer": 5} or station_ids != set(STATION_EMAILS):
        raise ValueError("Credential plan must contain exactly three citizens and one account for each of five stations.")
    return validated


async def refresh_credentials(plan_path: Path) -> tuple[int, int]:
    uri_host = urlsplit(settings.mongodb_uri).hostname or ""
    disposable_test_database = (
        settings.mongodb_database.startswith("resqph_cred_refresh_disposable_")
        and bool(os.environ.get("MONGODB_INTEGRATION_URI"))
        and settings.mongodb_uri == os.environ["MONGODB_INTEGRATION_URI"]
    )
    staging_target = settings.mongodb_database == "resqph_staging" and uri_host.endswith(".mongodb.net")
    if not staging_target and not disposable_test_database:
        raise ValueError("Credential refresh is restricted to the verified staging database.")
    plan = load_plan(plan_path)
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    try:
        database = client[settings.mongodb_database]
        await database.command("ping")
        async with client.start_session() as session:  # noqa: SIM117
            async with await session.start_transaction():
                accounts = database["accounts"]
                expected_ids = {item["account_id"] for item in plan}
                found = {item["id"]: item async for item in accounts.find({"id": {"$in": list(expected_ids)}}, session=session)}
                if set(found) != expected_ids:
                    raise ValueError("A designated synthetic account is missing; no changes were made.")

                target_emails = {item["email"] for item in plan}
                conflicts = await accounts.count_documents(
                    {"email": {"$in": list(target_emails)}, "id": {"$nin": list(expected_ids)}}, session=session
                )
                if conflicts:
                    raise ValueError("A target email belongs to an unrelated account; no changes were made.")
                for item in plan:
                    owner = await accounts.find_one({"email": item["email"]}, {"id": 1}, session=session)
                    if owner and owner.get("id") != item["account_id"]:
                        raise ValueError("A target email belongs to a different account; no changes were made.")

                blocked_ids: set[str] = set()
                for item in plan:
                    current = found[item["account_id"]]
                    role = "rescuer" if item["role"] == "rescuer" else "citizen"
                    if (current.get("name") != item["name"] or current.get("role") != role
                            or current.get("station_id") != item.get("station_id")
                            or current.get("email") not in {item["current_email"], item["email"]}):
                        raise ValueError("A designated account no longer matches the private plan; no changes were made.")
                    if role == "rescuer":
                        active_missions = await database["missions"].count_documents(
                            {"station_id": item["station_id"], "status": {"$in": ACTIVE_STATES}}, session=session
                        )
                        active_requests = await database["rescue_requests"].count_documents(
                            {"assigned_station_id": item["station_id"], "status": {"$in": ACTIVE_STATES}}, session=session
                        )
                        if active_missions or active_requests:
                            blocked_ids.add(item["account_id"])

                updated = 0
                for item in plan:
                    if item["account_id"] in blocked_ids:
                        continue
                    result = await accounts.update_one(
                        {"id": item["account_id"], "email": found[item["account_id"]]["email"]},
                        {"$set": {
                            "email": item["email"],
                            "password_hash": hash_password(item["password"]),
                            "updated_at": datetime.now(UTC),
                        }},
                        session=session,
                    )
                    if result.modified_count != 1:
                        raise ValueError("An account changed during credential refresh; transaction aborted.")
                    await database["auth_sessions"].delete_many({"account_id": item["account_id"]}, session=session)
                    updated += 1
        return updated, len(blocked_ids)
    finally:
        await client.close()


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.management.refresh_demo_account_credentials PRIVATE_PLAN.json")
    updated, blocked = asyncio.run(refresh_credentials(Path(sys.argv[1])))
    print(f"updated={updated} blocked_active_work={blocked}")


if __name__ == "__main__":
    main()
