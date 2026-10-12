from __future__ import annotations

import argparse
import asyncio
import json
import logging
from collections import Counter
from functools import partial
from pathlib import Path
from typing import Any

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.services.stations import station_by_id

logger = logging.getLogger(__name__)


async def _link_one(
    session: Any,
    *,
    database: Any,
    request_id: str | None,
    mission_id: str,
    team_id: str,
    station_id: str,
) -> int:
    mission_result = await database["missions"].update_one(
        {"id": mission_id, "team_id": team_id, "station_id": {"$in": [None, ""]}},
        {"$set": {"station_id": station_id}},
        session=session,
    )
    if mission_result.modified_count != 1:
        return 0
    request_result = await database["rescue_requests"].update_one(
        {"id": request_id, "assigned_team_id": team_id, "assigned_station_id": {"$in": [None, ""]}},
        {"$set": {"assigned_station_id": station_id}},
        session=session,
    )
    return request_result.modified_count


def read_mapping(path: Path) -> dict[str, str]:
    document = json.loads(path.read_text())
    mapping = document.get("team_to_station_id") if isinstance(document, dict) else None
    if not isinstance(mapping, dict) or any(not isinstance(team, str) or not isinstance(station, str) for team, station in mapping.items()):
        raise ValueError("Mapping file must contain a team_to_station_id object of strings.")
    for station_id in mapping.values():
        if station_by_id(station_id) is None:
            raise ValueError(f"Unknown station ID in mapping: {station_id}")
    return mapping


async def run_migration(mapping: dict[str, str], *, apply: bool, disposable_name: str | None) -> dict[str, int]:
    if apply and (not disposable_name or settings.mongodb_database != disposable_name or "disposable" not in disposable_name.lower()):
        raise ValueError("Apply requires --disposable-database matching MONGODB_DATABASE and containing 'disposable'.")
    client = AsyncMongoClient(settings.mongodb_uri)
    try:
        database = client[settings.mongodb_database]
        missions = [item async for item in database["missions"].find({})]
        active = [item for item in missions if item.get("status") in {"assigned", "en-route", "arrived"}]
        existing_active_stations = {item.get("station_id") for item in active if item.get("station_id")}
        planned_active = [mapping[item["team_id"]] for item in active if not item.get("station_id") and item.get("team_id") in mapping]
        collisions = [station for station, count in Counter(planned_active).items() if count > 1 or station in existing_active_stations]
        counts = {
            "missions_scanned": len(missions),
            "missions_linked": sum(1 for item in missions if not item.get("station_id") and item.get("team_id") in mapping),
            "unmapped_legacy_missions": sum(1 for item in missions if not item.get("station_id") and item.get("team_id") not in mapping),
            "active_station_collisions": len(collisions),
            "requests_linked": 0,
        }
        if not apply:
            logger.info("Dry run for %s: %s", settings.mongodb_database, counts)
            return counts
        if collisions:
            raise ValueError(f"Active missions would exceed station capacity; migration refused for {len(collisions)} station(s).")

        async with client.start_session() as session:
            for mission in missions:
                team_id = mission.get("team_id")
                station_id = mapping.get(team_id)
                if not station_id or mission.get("station_id"):
                    continue

                operation = partial(
                    _link_one,
                    database=database,
                    request_id=mission.get("request_id"),
                    mission_id=mission["id"],
                    team_id=team_id,
                    station_id=station_id,
                )
                counts["requests_linked"] += await session.with_transaction(operation)
        logger.info("Applied explicit station links in %s: %s", settings.mongodb_database, counts)
        return counts
    finally:
        await client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview or apply explicit legacy team-to-station metadata links.")
    parser.add_argument("--mapping-file", required=True, type=Path)
    parser.add_argument("--apply", action="store_true", help="Apply links; dry run is the default.")
    parser.add_argument("--disposable-database", help="Must exactly match MONGODB_DATABASE and include 'disposable'.")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    try:
        mapping = read_mapping(args.mapping_file)
        asyncio.run(run_migration(mapping, apply=args.apply, disposable_name=args.disposable_database))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
