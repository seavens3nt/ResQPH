"""Repository-only harness: production mission service/rules are not mocked."""

import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

from app.models.mission import Mission, MissionStatus
from app.models.mission_status_event import MissionStatusEvent
from app.repositories.mission_status_events import DuplicateMissionStatusEventError
from app.services.missions import MissionServiceError

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data/samples/offline-mission.example.json"


def load_offline_fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open(encoding="utf-8") as stream:
        fixture = json.load(stream)
    assert fixture["schema_version"] == 1
    assert fixture["actor_id"] == fixture["mission"]["assigned_rescuer_id"]
    assert fixture["pending_event"]["missionId"] == fixture["mission"]["id"]
    assert fixture["pending_event"]["localId"] == fixture["pending_event"]["body"]["event_id"]
    return deepcopy(fixture)


def get_test_headers(actor_id: str = "rescuer-alpha", role: str = "rescuer") -> dict[str, str]:
    return {"X-Demo-User-Id": actor_id, "X-Demo-Role": role}


def get_offline_event_payload(fixture: dict[str, Any]) -> dict[str, Any]:
    return deepcopy(fixture["pending_event"]["body"])


class OfflineMissionRepository:
    """Storage adapter only; authorization/transitions belong to MissionService."""

    def __init__(self, fixture: dict[str, Any]) -> None:
        mission = Mission.model_validate(fixture["mission"])
        self.missions = {mission.id: mission}
        self.unavailable = False

    async def get_by_id(self, mission_id: str) -> Mission | None:
        if self.unavailable:
            raise MissionServiceError(503, "dependency_unavailable", "Controlled storage outage.")
        return self.missions.get(mission_id)

    async def update_status_if_current(
        self, mission_id: str, expected_version: int, prior_status: MissionStatus,
        new_status: MissionStatus, recorded_at: datetime, session: Any = None,
    ) -> Mission | None:
        mission = self.missions.get(mission_id)
        if mission is None or mission.version != expected_version or mission.status != prior_status:
            return None
        fields: dict[str, Any] = {"status": new_status, "version": mission.version + 1, "updated_at": recorded_at}
        if new_status == "completed":
            fields["completed_at"] = recorded_at
        updated = mission.model_copy(update=fields)
        self.missions[mission_id] = updated
        return updated


class OfflineEventRepository:
    """In-memory unique-event/rollback harness, not MongoDB transaction evidence."""

    def __init__(self, missions: OfflineMissionRepository) -> None:
        self.missions = missions
        self.events: dict[str, MissionStatusEvent] = {}
        self.fail_on_append = False

    async def ensure_indexes(self) -> None:
        pass

    async def get_by_event_id(self, event_id: str, session: Any = None) -> MissionStatusEvent | None:
        return self.events.get(event_id)

    async def list_for_mission(self, mission_id: str) -> list[MissionStatusEvent]:
        return sorted(
            (event for event in self.events.values() if event.mission_id == mission_id),
            key=lambda event: event.server_recorded_at,
        )

    async def append(self, event: MissionStatusEvent, session: Any = None) -> MissionStatusEvent:
        if self.fail_on_append:
            raise MissionServiceError(503, "dependency_unavailable", "Controlled event write failure.")
        if event.event_id in self.events:
            raise DuplicateMissionStatusEventError
        self.events[event.event_id] = event
        return event

    async def run_in_transaction(self, callback: Any) -> Any:
        mission_snapshot = deepcopy(self.missions.missions)
        event_snapshot = deepcopy(self.events)
        try:
            return await callback(None)
        except Exception:
            self.missions.missions.clear()
            self.missions.missions.update(mission_snapshot)
            self.events.clear()
            self.events.update(event_snapshot)
            raise
