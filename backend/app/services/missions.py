from datetime import datetime, timezone
from typing import ClassVar

from app.models.mission import Mission, MissionStatus
from app.models.mission_status_event import MissionStatusEvent
from app.repositories.mission_status_events import (
    DuplicateMissionStatusEventError,
    MissionStatusEventRepository,
)
from app.repositories.missions import MissionRepository
from app.schemas.missions import DemoActor, MissionResponse, MissionStatusEventCreate


class MissionServiceError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


class MissionService:
    _next_status: ClassVar[dict[MissionStatus, MissionStatus]] = {
        "assigned": "en-route",
        "en-route": "arrived",
        "arrived": "completed",
    }

    def __init__(
        self,
        mission_repository: MissionRepository,
        event_repository: MissionStatusEventRepository,
    ) -> None:
        self._missions = mission_repository
        self._events = event_repository

    async def list_missions(
        self,
        actor: DemoActor,
        assigned_to: str | None,
        statuses: list[MissionStatus] | None,
    ) -> list[MissionResponse]:
        if actor.role == "rescuer":
            if assigned_to != "me":
                raise MissionServiceError(
                    403,
                    "forbidden",
                    "Rescuers may only list missions assigned to themselves.",
                    [{"field": "assigned_to", "reason": "expected me"}],
                )
            missions = await self._missions.list_for_rescuer(actor.user_id, statuses)
            return [await self._to_response(mission) for mission in missions]

        if actor.role == "coordinator":
            missions = await self._missions.list_all(statuses)
            return [await self._to_response(mission) for mission in missions]

        raise MissionServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to retrieve missions.",
            [{"field": "X-Demo-Role", "reason": "expected rescuer or coordinator"}],
        )

    async def get_mission(self, mission_id: str, actor: DemoActor) -> MissionResponse:
        mission = await self._get_visible_mission(mission_id, actor)
        return await self._to_response(mission)

    async def create_status_event(
        self,
        mission_id: str,
        payload: MissionStatusEventCreate,
        actor: DemoActor,
    ) -> MissionResponse:
        mission = await self._get_operable_mission(mission_id, payload.new_status, actor)

        existing_event = await self._events.get_by_event_id(payload.event_id)
        if existing_event is not None:
            self._validate_idempotent_retry(existing_event, mission_id, payload, actor)
            return await self._to_response(mission)

        if mission.version != payload.expected_mission_version:
            raise MissionServiceError(
                409,
                "stale_mission_version",
                "Mission status was not changed because the expected version is stale.",
                [{"field": "expected_mission_version", "reason": f"current version is {mission.version}"}],
            )

        expected_next = self._next_status.get(mission.status)
        if expected_next != payload.new_status:
            raise MissionServiceError(
                409,
                "invalid_transition",
                f"Mission cannot move from {mission.status} to {payload.new_status}.",
                [{"field": "new_status", "reason": f"expected {expected_next or 'terminal state'}"}],
            )

        recorded_at = utc_now()
        updated_mission = await self._missions.update_status_if_current(
            mission_id=mission.id,
            expected_version=payload.expected_mission_version,
            prior_status=mission.status,
            new_status=payload.new_status,
            recorded_at=recorded_at,
        )
        if updated_mission is None:
            raise MissionServiceError(
                409,
                "mission_conflict",
                "Mission status was not changed because the current state no longer matches the request.",
            )

        event = MissionStatusEvent(
            event_id=payload.event_id,
            mission_id=mission.id,
            prior_status=mission.status,
            new_status=payload.new_status,
            actor_id=actor.user_id,
            actor_role=actor.role,
            source=payload.source,
            client_recorded_at=payload.client_recorded_at,
            server_recorded_at=recorded_at,
            note=payload.note,
        )
        try:
            await self._events.append(event)
        except DuplicateMissionStatusEventError:
            existing_event = await self._events.get_by_event_id(payload.event_id)
            if existing_event is not None:
                self._validate_idempotent_retry(existing_event, mission_id, payload, actor)
                return await self._to_response(updated_mission)
            raise MissionServiceError(
                409,
                "duplicate_event",
                "Status event id was already used.",
                [{"field": "event_id", "reason": "duplicate idempotency key"}],
            )

        return await self._to_response(updated_mission)

    async def _get_visible_mission(self, mission_id: str, actor: DemoActor) -> Mission:
        mission = await self._missions.get_by_id(mission_id)
        if mission is None:
            raise MissionServiceError(404, "mission_not_found", "Mission is unavailable.")

        if actor.role == "rescuer":
            if mission.is_assigned_to(actor.user_id):
                return mission
            raise MissionServiceError(404, "mission_not_found", "Mission is unavailable.")

        if actor.role == "coordinator":
            return mission

        raise MissionServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to retrieve missions.",
            [{"field": "X-Demo-Role", "reason": "expected rescuer or coordinator"}],
        )

    async def _get_operable_mission(
        self,
        mission_id: str,
        new_status: MissionStatus,
        actor: DemoActor,
    ) -> Mission:
        mission = await self._missions.get_by_id(mission_id)
        if mission is None:
            raise MissionServiceError(404, "mission_not_found", "Mission is unavailable.")

        if actor.role == "rescuer":
            if mission.is_assigned_to(actor.user_id):
                return mission
            raise MissionServiceError(
                403,
                "forbidden",
                "Only the assigned simulated rescuer may update this mission.",
            )

        if actor.role == "coordinator" and new_status == "completed":
            return mission

        raise MissionServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to update mission status.",
            [{"field": "X-Demo-Role", "reason": "expected assigned rescuer"}],
        )

    def _validate_idempotent_retry(
        self,
        existing_event: MissionStatusEvent,
        mission_id: str,
        payload: MissionStatusEventCreate,
        actor: DemoActor,
    ) -> None:
        same_accepted_event = (
            existing_event.mission_id == mission_id
            and existing_event.new_status == payload.new_status
            and existing_event.actor_id == actor.user_id
            and existing_event.actor_role == actor.role
            and existing_event.source == payload.source
        )
        if same_accepted_event:
            return

        raise MissionServiceError(
            409,
            "duplicate_event",
            "Status event id was already used for a different status event.",
            [{"field": "event_id", "reason": "conflicting idempotency key"}],
        )

    async def _to_response(self, mission: Mission) -> MissionResponse:
        events = await self._events.list_for_mission(mission.id)
        return MissionResponse.model_validate(
            {
                **mission.model_dump(),
                "status_history": [event.model_dump() for event in events],
            }
        )


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
