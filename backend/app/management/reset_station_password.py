from __future__ import annotations

import asyncio
import getpass
import re
import sys
from datetime import UTC, datetime

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.security.passwords import hash_password
from app.services.stations import station_by_id


async def reset_password(email: str, station_id: str, password: str) -> None:
    station = station_by_id(station_id)
    if station is None:
        raise ValueError("Unknown station ID.")
    client = AsyncMongoClient(settings.mongodb_uri)
    try:
        accounts = client[settings.mongodb_database]["accounts"]
        result = await accounts.update_one(
            {"email": email.strip().lower(), "role": "rescuer", "station_id": station_id},
            {"$set": {"password_hash": hash_password(password), "updated_at": datetime.now(UTC)}},
        )
        if result.modified_count != 1:
            raise ValueError("No existing station account matched that email and station; no account was created or changed.")
    finally:
        await client.close()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python -m app.management.reset_station_password EMAIL STATION_ID")
    email, station_id = sys.argv[1:]
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise SystemExit("Enter a valid email address.")
    password = getpass.getpass("New station password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match.")
    if len(password.strip()) < 12:
        raise SystemExit("Password must contain at least 12 non-blank characters.")
    try:
        asyncio.run(reset_password(email, station_id, password))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
