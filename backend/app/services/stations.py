from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
STATION_FIXTURE = REPOSITORY_ROOT / "data" / "samples" / "simulated-rescue-stations.json"


@lru_cache(maxsize=1)
def load_station_catalog() -> dict[str, Any]:
    payload = json.loads(STATION_FIXTURE.read_text(encoding="utf-8"))
    return {
        "fixture_notice": payload["fixture_notice"],
        "stations": list(payload["stations"]),
    }


def station_by_team_id(team_id: str) -> dict[str, Any] | None:
    for station in load_station_catalog()["stations"]:
        if station["team_id"] == team_id:
            return station
    return None
