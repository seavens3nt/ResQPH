from __future__ import annotations

import asyncio
import getpass
import re
import sys
from datetime import UTC, datetime

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.schemas.auth import AccountRegister
from app.security.passwords import hash_password
from app.services.stations import station_by_id


async def reset_password(
    email: str,
    station_id: str,
    password: str,
    *,
    allow_active_work: bool = False,
    new_email: str | None = None,
) -> None:
    station = station_by_id(station_id)
    if station is None:
        raise ValueError("Unknown station ID.")
    client = AsyncMongoClient(settings.mongodb_uri)
    try:
        database = client[settings.mongodb_database]
        target_email = str(AccountRegister(
            name=station["name"], email=new_email or email, password=password,
        ).email)
        async with client.start_session() as session:  # noqa: SIM117
            async with await session.start_transaction():
                accounts = database["accounts"]
                account = await accounts.find_one(
                    {"email": email.strip().lower(), "role": "rescuer", "station_id": station_id},
                    {"id": 1}, session=session,
                )
                if account is None:
                    raise ValueError("No existing station account matched that email and station; no account was created or changed.")
                email_owner = await accounts.find_one({"email": target_email}, {"id": 1}, session=session)
                if email_owner and email_owner.get("id") != account["id"]:
                    raise ValueError("Target email belongs to another account; no changes were made.")
                active_states = {"$in": ["assigned", "en-route", "arrived"]}
                active_missions = await database["missions"].count_documents(
                    {"station_id": station_id, "status": active_states}, session=session,
                )
                active_requests = await database["rescue_requests"].count_documents(
                    {"assigned_station_id": station_id, "status": active_states}, session=session,
                )
                if (active_missions or active_requests) and not allow_active_work:
                    raise ValueError("Station has active work; password and sessions were not changed.")
                result = await accounts.update_one(
                    {"id": account["id"], "email": email.strip().lower(), "station_id": station_id},
                    {"$set": {
                        "email": target_email,
                        "password_hash": hash_password(password),
                        "updated_at": datetime.now(UTC),
                    }},
                    session=session,
                )
                if result.modified_count != 1:
                    raise ValueError("Station account changed during reset; no changes were made.")
                await database["auth_sessions"].delete_many({"account_id": account["id"]}, session=session)
    finally:
        await client.close()


def main() -> None:
    arguments = sys.argv[1:]
    allow_active_work = "--allow-active-work" in arguments
    arguments = [argument for argument in arguments if argument != "--allow-active-work"]
    new_email = None
    if "--new-email" in arguments:
        index = arguments.index("--new-email")
        if index + 1 >= len(arguments):
            raise SystemExit("--new-email requires an email address.")
        new_email = arguments[index + 1]
        del arguments[index:index + 2]
    if len(arguments) != 2:
        raise SystemExit("Usage: python -m app.management.reset_station_password [--allow-active-work] [--new-email EMAIL] EMAIL STATION_ID")
    email, station_id = arguments
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or (new_email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", new_email)):
        raise SystemExit("Enter a valid email address.")
    password = getpass.getpass("New station password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match.")
    if len(password.strip()) < 12:
        raise SystemExit("Password must contain at least 12 non-blank characters.")
    try:
        asyncio.run(reset_password(
            email, station_id, password, allow_active_work=allow_active_work, new_email=new_email,
        ))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
