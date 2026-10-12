"""Provision an isolated local demo through the existing authentication services."""

import asyncio
import logging
import os
import re
import secrets
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.db.setup import initialize_database
from app.management.provision_station_account import provision
from app.schemas.auth import AccountRegister
from app.services.auth import AuthService
from app.services.stations import load_station_catalog

logger = logging.getLogger(__name__)
STATION_EMAILS = [
    "sampaloc@example.test",
    "algeciras@example.test",
    "lacson@example.test",
    "iverson@example.test",
    "david@example.test",
]
STATION_NAMES = [
    "Sampaloc Fire Station",
    "Central Sampaloc Fire and Rescue Volunteer Brigade",
    "Central Sampaloc Fire and Rescue Brigade Headquarters",
    "Iverson Fire and Rescue Volunteer",
    "David Fire and Rescue Volunteer Inc. Headquarters",
]


def validate_demo_target(name: str, uri: str) -> None:
    if not re.fullmatch(r"resqph_demo_[A-Za-z0-9_]+", name):
        raise ValueError(
            "Refusing a normal database: explicitly select resqph_demo_* ."
        )
    if urlparse(uri).hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Demo provisioning requires a local MongoDB replica set.")


async def provision_demo(readme: Path) -> tuple[int, int]:
    validate_demo_target(settings.mongodb_database, settings.mongodb_uri)
    root = Path(__file__).resolve().parents[3]
    if readme.resolve() != root / "local-demo" / "README.md":
        raise ValueError("Credentials must stay in local-demo/README.md.")
    if (
        await asyncio.to_thread(
            subprocess.run,
            ["git", "check-ignore", "-q", str(readme)],
            cwd=root,
            check=False,
        )
    ).returncode:
        raise ValueError("Ignore local-demo/ before provisioning.")
    if (
        await asyncio.to_thread(
            subprocess.check_output, ["git", "ls-files", "--", str(readme)], cwd=root
        )
    ).strip():
        raise ValueError("Credential README must not be tracked.")
    readme.parent.mkdir(mode=0o700, exist_ok=True)
    os.chmod(readme.parent, 0o700)
    if readme.exists():
        os.chmod(readme, 0o600)
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    created = preserved = 0
    rows: list[tuple[str, str, str, str]] = []
    try:
        hello = await client.admin.command("hello")
        if not hello.get("setName"):
            raise ValueError("Transactions require a replica set.")
        database = client[settings.mongodb_database]
        # Reuse is allowed only for this exact managed environment; never reset data.
        marker = await database["demo_environment"].find_one({"id": "managed-demo"})
        if (
            settings.mongodb_database in await client.list_database_names()
            and marker is None
        ):
            raise ValueError(
                "Existing database is not this managed demo; choose a fresh demo name."
            )
        await initialize_database(database)
        await database["demo_environment"].update_one(
            {"id": "managed-demo"},
            {"$setOnInsert": {"database": settings.mongodb_database}},
            upsert=True,
        )
        catalog = load_station_catalog()["stations"]
        intended = [
            ("citizen", f"citizen{i}@example.test", f"Demo citizen {i}", None)
            for i in range(1, 6)
        ]
        for name, email in zip(STATION_NAMES, STATION_EMAILS, strict=True):
            station = next(station for station in catalog if station["name"] == name)
            intended.append(("rescuer", email, name, station["station_id"]))
        for role, email, name, station_id in intended:
            account = await database.accounts.find_one({"email": email})
            if account:
                if account["role"] != role or account.get("station_id") != station_id:
                    raise ValueError(
                        "Existing demo account membership differs; refusing to change it."
                    )
                preserved += 1
                continue
            password = "Demo-" + secrets.token_hex(6)
            if role == "citizen":
                await AuthService(database).register_citizen(
                    AccountRegister(name=name, email=email, password=password)
                )
            else:
                await provision(email, name, station_id, password)
            # Save each newly created login immediately, even if a later account fails.
            descriptor = os.open(readme, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(descriptor, "w") as output:
                output.write(
                    f"\nDemo provisioning recovery ({settings.mongodb_database}):\nStation: {name if station_id else 'Citizen'}\nEmail: {email}\nPassword: {password}\n"
                )
            os.chmod(readme, 0o600)
            rows.append(
                (role, email, password, name if station_id else "Citizen — no station")
            )
            created += 1

        # Prove a multi-document transaction commits, leaving no operational records.
        async def probe(session):
            await database.demo_environment.update_one(
                {"id": "managed-demo"},
                {"$set": {"transactions_verified": True}},
                session=session,
            )
            await database.demo_environment.update_one(
                {"id": "probe"},
                {"$set": {"verified": True}},
                upsert=True,
                session=session,
            )
            await database.demo_environment.delete_one({"id": "probe"}, session=session)

        async with client.start_session() as session:
            await session.with_transaction(probe)
        if rows:
            text = f"\n\n## Fresh demo environment — 2026-10-12\n\nLocal simulated testing only. Database: `{settings.mongodb_database}`.\nLogin: http://localhost:5173/login\n\n| Role | Email | Password | Station |\n|---|---|---|---|\n"
            text += "".join(
                f"| {role} | {email} | {password} | {name} |\n"
                for role, email, password, name in rows
            )
            text += """
Start this environment from the repository root:

```sh
MONGODB_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_DATABASE=resqph_demo_20261012 bash ./dev.sh
```

To switch back, stop these dev servers and run `bash ./dev.sh` without the database override. The original backend/.env values were not changed. Old accounts remain in the original developer database. Git checkout on another machine does not copy database accounts.

Choose Citizen for citizen logins; for station accounts choose Rescuer and the exact station listed in the table. Use separate browser profiles for citizen and rescuer; cookies are shared between tabs in one profile. Prefer new profiles for this database to avoid old app queues. Never clear all browser storage. Existing failed events must be inspected and explicitly reconciled/discarded in the app before any scoped cleanup; discarding only removes that account's local attempt and retains a recovery record. Local storage cleanup does not delete server accounts.

Repeat provisioning without changing existing passwords/membership:

```sh
cd backend
MONGODB_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_DATABASE=resqph_demo_20261012 .venv/bin/python -m app.management.provision_demo_accounts
```

Existing password-reset command (interactive, only after deciding to reset):

```sh
MONGODB_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_DATABASE=resqph_demo_20261012 .venv/bin/python -m app.management.reset_station_password EMAIL STATION_ID
```

There is no destructive demo reset command. To restart fresh, choose another resqph_demo_* database and provision it explicitly. This command refuses default/normal databases and never drops accounts, requests or missions. Existing active demo records are retained on rerun.

Walkthrough: citizen login → confirm a synthetic U-Belt request → observe assignment → log into the matching station in the separate profile → Accept & Start → Arrived → provide completion details → confirm completion. Check citizen status, immutable history and released station capacity. Log out, log back in and refresh. Use another citizen to check ownership isolation. Citizen cancellation is available only while pending. For failure/recovery testing use a separate disposable database, not this reusable demo database.
"""
            descriptor = os.open(readme, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(descriptor, "w") as output:
                output.write(text)
            os.chmod(readme, 0o600)
        return created, preserved
    finally:
        await client.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    readme = Path(__file__).resolve().parents[3] / "local-demo" / "README.md"
    created, preserved = asyncio.run(provision_demo(readme))
    logger.info(
        "Demo database %s: %s accounts created, %s preserved. Credentials are in ignored local-demo/README.md.",
        settings.mongodb_database,
        created,
        preserved,
    )


if __name__ == "__main__":
    main()
