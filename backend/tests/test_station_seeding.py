from typing import Any

import pytest

from app.repositories.rescuers import RescuerRepository
from app.services.stations import load_station_catalog


class MemoryCollection:
    def __init__(self, records: list[dict[str, Any]]) -> None:
        self.records = {record["id"]: record for record in records}

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> None:
        key = query["id"]
        if key not in self.records:
            if not upsert:
                return
            self.records[key] = {**update.get("$setOnInsert", {}), **update.get("$set", {})}
        else:
            self.records[key].update(update.get("$set", {}))


class MemoryDatabase:
    def __init__(self, collection: MemoryCollection) -> None:
        self.collection = collection

    def __getitem__(self, name: str) -> MemoryCollection:
        assert name == "rescuers"
        return self.collection


@pytest.mark.asyncio
async def test_station_seed_preserves_existing_position_availability_and_assignment() -> None:
    catalog = load_station_catalog()["stations"]
    station = catalog[0]
    moving_position = {"type": "Point", "coordinates": [120.9933, 14.6079]}
    collection = MemoryCollection([{
        "id": station["team_id"],
        "current_location": moving_position,
        "availability": "assigned",
        "assigned_mission_id": "mission-in-progress",
        "version": 7,
    }])

    await RescuerRepository(MemoryDatabase(collection)).ensure_synthetic_teams()

    existing = collection.records[station["team_id"]]
    assert existing["current_location"] == moving_position
    assert existing["availability"] == "assigned"
    assert existing["assigned_mission_id"] == "mission-in-progress"
    assert existing["version"] == 7
    assert set(collection.records) == {item["team_id"] for item in catalog}
    assert not {"team-alpha", "team-bravo", "team-charlie"}.intersection(collection.records)
    for new_station in catalog[1:]:
        team = collection.records[new_station["team_id"]]
        assert team["availability"] == "available"
        assert team["current_location"] == new_station["point"]
