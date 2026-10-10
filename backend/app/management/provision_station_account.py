from __future__ import annotations

import asyncio
import getpass
import logging
import re
import sys
from datetime import UTC, datetime
from uuid import uuid4

from pymongo import AsyncMongoClient
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.schemas.auth import AccountRegister
from app.security.passwords import hash_password
from app.services.stations import station_by_id

logger = logging.getLogger(__name__)


async def provision(email: str, name: str, station_id: str, password: str) -> None:
    station = station_by_id(station_id)
    if station is None:
        raise ValueError("Unknown station ID.")
    normalized_email = email.strip().lower()
    validated = AccountRegister(name=name, email=normalized_email, password=password)
    normalized_email = str(validated.email)
    name = validated.name
    client = AsyncMongoClient(settings.mongodb_uri)
    try:
        database = client[settings.mongodb_database]
        accounts = database["accounts"]
        await accounts.create_index("email", unique=True, name="uq_account_email")
        await accounts.create_index("id", unique=True, name="uq_account_id")
        await accounts.create_index(
            "station_id", unique=True, name="uq_station_account",
            partialFilterExpression={"station_id": {"$type": "string"}},
        )
        if await accounts.find_one({"station_id": station_id}):
            raise ValueError("This station already has a provisioned login.")
        now = datetime.now(UTC)
        try:
            await accounts.insert_one({
                "id": f"account-{uuid4().hex}",
                "email": normalized_email,
                "name": name,
                "role": "rescuer",
                "password_hash": hash_password(password),
                "phone": None,
                "station_id": station_id,
                "created_at": now,
                "updated_at": now,
            })
        except DuplicateKeyError as exc:
            raise ValueError("An account already exists for this email or station.") from exc
        logger.info("Provisioned station account for %s (%s).", station["name"], station_id)
    finally:
        await client.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python -m app.management.provision_station_account EMAIL NAME STATION_ID")
    email, name, station_id = sys.argv[1:]
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise SystemExit("Enter a valid email address.")
    password = getpass.getpass("New station password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match.")
    if len(password.strip()) < 12:
        raise SystemExit("Password must contain at least 12 non-blank characters.")
    try:
        asyncio.run(provision(email, name, station_id, password))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
