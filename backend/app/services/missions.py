from datetime import UTC, datetime
from itertools import pairwise
from typing import ClassVar

from pymongo.asynchronous.client_session import AsyncClientSession

from app.models.mission import Mission, MissionStatus
from app.models.mission_status_event import MissionStatusEvent
from app.repositories.mission_status_events import (
    DuplicateMissionStatusEventError,
    MissionStatusEventRepository,
)
from app.repositories.missions import MissionLifecycleConflictError, MissionRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.common import serialize_utc
from app.schemas.missions import (
    DemoActor,
    MissionResponse,
    MissionStatusEventCreate,
    MissionTrackingResponse,
)


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
        request_repository: RescueRequestRepository | None = None,
    ) -> None:
        self._missions = mission_repository
        self._events = event_repository
        self._requests = request_repository

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

    async def get_tracking(
        self,
        mission_id: str,
        actor: DemoActor,
    ) -> MissionTrackingResponse:
        mission = await self._get_visible_mission(mission_id, actor)
        return self._tracking_response(mission, utc_now())

    async def control_tracking(
        self,
        mission_id: str,
        action: str,
        actor: DemoActor,
    ) -> MissionTrackingResponse:
        mission = await self._get_operable_tracking_mission(mission_id, actor)
        now = utc_now()
        tracking = dict(mission.tracking_state or {})
        status = tracking.get("status", "not_started")
        elapsed = _elapsed_tracking_seconds(mission, now)

        if action == "start":
            if status != "running":
                tracking = {
                    "status": "running",
                    "started_at": serialize_utc(now),
                    "elapsed_before_pause_s": 0.0,
                }
        elif action == "pause":
            if status == "running":
                tracking = {
                    **tracking,
                    "status": "paused",
                    "paused_at": serialize_utc(now),
                    "elapsed_before_pause_s": elapsed,
                }
        elif action == "resume":
            if status == "paused":
                tracking = {
                    **tracking,
                    "status": "running",
                    "started_at": serialize_utc(now),
                    "paused_at": None,
                    "elapsed_before_pause_s": elapsed,
                }
        elif action == "reset":
            tracking = {"status": "not_started", "elapsed_before_pause_s": 0.0}
        else:
            raise MissionServiceError(
                422,
                "invalid_tracking_control",
                "Unsupported tracking control action.",
                [{"field": "action", "reason": "expected start, pause, resume, or reset"}],
            )

        updated = await self._missions.update_tracking_state(mission.id, tracking, now)
        if updated is None:
            raise MissionServiceError(404, "mission_not_found", "Mission is unavailable.")
        return self._tracking_response(updated, now)

    async def create_status_event(
        self,
        mission_id: str,
        payload: MissionStatusEventCreate,
        actor: DemoActor,
    ) -> MissionResponse:
        mission = await self._get_operable_mission(
            mission_id, payload.new_status, actor
        )

        existing_event = await self._events.get_by_event_id(payload.event_id)
        if existing_event is not None:
            self._validate_idempotent_retry(existing_event, mission_id, payload, actor)
            return await self._to_response(mission)

        if mission.version != payload.expected_mission_version:
            raise MissionServiceError(
                409,
                "stale_mission_version",
                "Mission status was not changed because the expected version is stale.",
                [
                    {
                        "field": "expected_mission_version",
                        "reason": f"current version is {mission.version}",
                    }
                ],
            )

        expected_next = self._next_status.get(mission.status)
        if expected_next != payload.new_status:
            raise MissionServiceError(
                409,
                "invalid_transition",
                f"Mission cannot move from {mission.status} to {payload.new_status}.",
                [
                    {
                        "field": "new_status",
                        "reason": f"expected {expected_next or 'terminal state'}",
                    }
                ],
            )

        recorded_at = utc_now()
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

        async def persist_transition(
            session: AsyncClientSession,
        ) -> tuple[Mission, MissionStatusEvent | None]:
            transaction_event = await self._events.get_by_event_id(
                payload.event_id,
                session=session,
            )
            if transaction_event is not None:
                self._validate_idempotent_retry(
                    transaction_event, mission_id, payload, actor
                )
                return mission, transaction_event

            updated_mission = await self._missions.update_status_if_current(
                mission_id=mission.id,
                expected_version=payload.expected_mission_version,
                prior_status=mission.status,
                new_status=payload.new_status,
                recorded_at=recorded_at,
                session=session,
            )
            if updated_mission is None:
                raise MissionServiceError(
                    409,
                    "mission_conflict",
                    "Mission status was not changed because the current state no longer matches the request.",
                )
            await self._events.append(event, session=session)
            return updated_mission, None

        try:
            await self._events.ensure_indexes()
            updated_mission, transaction_event = await self._events.run_in_transaction(
                persist_transition
            )
        except MissionLifecycleConflictError:
            raise MissionServiceError(
                409,
                "lifecycle_conflict",
                "Status was not changed because the linked request or team no longer matches the mission.",
            ) from None
        except DuplicateMissionStatusEventError:
            existing_event = await self._events.get_by_event_id(payload.event_id)
            if existing_event is not None:
                self._validate_idempotent_retry(
                    existing_event, mission_id, payload, actor
                )
                current_mission = await self._missions.get_by_id(mission_id)
                if current_mission is None:
                    raise MissionServiceError(
                        404, "mission_not_found", "Mission is unavailable."
                    )
                return await self._to_response(current_mission)
            raise MissionServiceError(
                409,
                "duplicate_event",
                "Status event id was already used.",
                [{"field": "event_id", "reason": "duplicate idempotency key"}],
            )

        if transaction_event is not None:
            current_mission = await self._missions.get_by_id(mission_id)
            if current_mission is None:
                raise MissionServiceError(
                    404, "mission_not_found", "Mission is unavailable."
                )
            return await self._to_response(current_mission)

        return await self._to_response(updated_mission)

    async def _get_visible_mission(self, mission_id: str, actor: DemoActor) -> Mission:
        mission = await self._missions.get_by_id(mission_id)
        if mission is None:
            raise MissionServiceError(
                404, "mission_not_found", "Mission is unavailable."
            )

        if actor.role == "rescuer":
            if mission.is_assigned_to(actor.user_id):
                return mission
            raise MissionServiceError(
                404, "mission_not_found", "Mission is unavailable."
            )

        if actor.role == "coordinator":
            return mission

        if actor.role == "citizen" and self._requests is not None:
            request = await self._requests.get_by_id(mission.request_id)
            if request is not None and request.citizen_id == actor.user_id:
                return mission
            raise MissionServiceError(404, "mission_not_found", "Mission is unavailable.")

        raise MissionServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to retrieve missions.",
            [{"field": "X-Demo-Role", "reason": "expected rescuer or coordinator"}],
        )

    async def _get_operable_tracking_mission(
        self,
        mission_id: str,
        actor: DemoActor,
    ) -> Mission:
        mission = await self._get_visible_mission(mission_id, actor)
        if actor.role in {"rescuer", "coordinator"}:
            if mission.status in {"cancelled", "completed"}:
                raise MissionServiceError(
                    409,
                    "tracking_terminal",
                    "Tracking controls are unavailable after mission cancellation or completion.",
                )
            if actor.role == "rescuer" and not mission.is_assigned_to(actor.user_id):
                raise MissionServiceError(
                    403,
                    "forbidden",
                    "Only the assigned simulated rescuer may control tracking.",
                )
            return mission
        raise MissionServiceError(
            403,
            "forbidden",
            "Simulated role is not allowed to control mission tracking.",
        )

    async def cancel_mission(
        self, mission_id: str, expected_version: int, reason: str, actor: DemoActor
    ) -> MissionResponse:
        if actor.role != "coordinator":
            raise MissionServiceError(
                403, "forbidden", "Only a coordinator may cancel an assigned mission."
            )
        mission = await self._get_visible_mission(mission_id, actor)
        if mission.status != "assigned" or mission.version != expected_version:
            raise MissionServiceError(
                409,
                "cancellation_conflict",
                "Only a current assigned mission may be cancelled before travel.",
            )
        now = utc_now()
        event = MissionStatusEvent(
            event_id=f"cancel-{mission_id}-{expected_version}",
            mission_id=mission_id,
            prior_status="assigned",
            new_status="cancelled",
            actor_id=actor.user_id,
            actor_role=actor.role,
            source="online",
            server_recorded_at=now,
            note=reason,
        )

        async def persist(session: AsyncClientSession) -> Mission:
            updated = await self._missions.update_status_if_current(
                mission_id, expected_version, "assigned", "cancelled", now, session
            )
            if updated is None:
                raise MissionServiceError(
                    409,
                    "mission_conflict",
                    "Mission changed; cancellation was not stored.",
                )
            await self._missions.record_cancellation_reason(
                mission.request_id, reason, now, session
            )
            await self._events.append(event, session=session)
            return updated

        try:
            updated = await self._events.run_in_transaction(persist)
        except MissionLifecycleConflictError:
            raise MissionServiceError(
                409, "lifecycle_conflict", "Linked request or team changed; cancellation was not stored."
            ) from None
        return await self._to_response(updated)
    async def _get_operable_mission(
        self,
        mission_id: str,
        new_status: MissionStatus,
        actor: DemoActor,
    ) -> Mission:
        mission = await self._missions.get_by_id(mission_id)
        if mission is None:
            raise MissionServiceError(
                404, "mission_not_found", "Mission is unavailable."
            )

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
            and same_utc_instant(
                existing_event.client_recorded_at, payload.client_recorded_at
            )
            and existing_event.note == payload.note
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

    def _tracking_response(self, mission: Mission, now: datetime) -> MissionTrackingResponse:
        route = mission.latest_route_result if isinstance(mission.latest_route_result, dict) else None
        if not route or route.get("status") != "route-found":
            return MissionTrackingResponse(
                mission_id=mission.id,
                request_id=mission.request_id,
                team_id=mission.team_id,
                simulation_status="unavailable",
                position=None,
                timestamp=serialize_utc(now) or "",
                progress_ratio=0.0,
                remaining_distance_m=0.0,
                estimated_remaining_time_s=0.0,
                total_distance_m=0.0,
                total_travel_time_s=0.0,
                warnings=["No accepted route is attached to this simulated mission."],
            )
        total_distance = float(route.get("distance_m") or 0.0)
        total_time = float(route.get("estimated_time_s") or 0.0)
        elapsed = _elapsed_tracking_seconds(mission, now)
        progress = 1.0 if total_time <= 0 else max(0.0, min(1.0, elapsed / total_time))
        geometry = route.get("geometry") if isinstance(route.get("geometry"), dict) else None
        position = _interpolate_linestring(geometry, progress) if geometry else None
        tracking = mission.tracking_state or {}
        simulation_status = str(tracking.get("status", "not_started"))
        if progress >= 1.0 and simulation_status == "running":
            simulation_status = "arrived_at_destination"
        if mission.status in {"cancelled", "completed"}:
            simulation_status = mission.status
        return MissionTrackingResponse(
            mission_id=mission.id,
            request_id=mission.request_id,
            team_id=mission.team_id,
            simulation_status=simulation_status,
            position=position,
            timestamp=serialize_utc(now) or "",
            route_id=route.get("route_id"),
            route_geometry=geometry,
            progress_ratio=progress,
            remaining_distance_m=round(total_distance * (1.0 - progress), 3),
            estimated_remaining_time_s=round(total_time * (1.0 - progress), 3),
            total_distance_m=total_distance,
            total_travel_time_s=total_time,
            warnings=route.get("warnings", []),
        )


def utc_now() -> datetime:
    return datetime.now(UTC)


def same_utc_instant(left: datetime | None, right: datetime | None) -> bool:
    """Compare replay timestamps at BSON Date's persisted millisecond precision."""
    if left is None or right is None:
        return left is None and right is None
    return bson_utc_millisecond(left) == bson_utc_millisecond(right)


def bson_utc_millisecond(value: datetime) -> datetime:
    # MongoDB BSON Date stores UTC milliseconds, not Python microseconds.
    # https://www.mongodb.com/docs/manual/reference/bson-types/#date
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    normalized = value.astimezone(UTC)
    return normalized.replace(microsecond=(normalized.microsecond // 1000) * 1000)


def _elapsed_tracking_seconds(mission: Mission, now: datetime) -> float:
    tracking = mission.tracking_state or {}
    elapsed_before = float(tracking.get("elapsed_before_pause_s") or 0.0)
    if tracking.get("status") != "running":
        return elapsed_before
    started_at = _parse_utc(str(tracking.get("started_at") or ""))
    if started_at is None:
        return elapsed_before
    return max(0.0, elapsed_before + (now - started_at).total_seconds())


def _parse_utc(value: str) -> datetime | None:
    if not value.endswith("Z"):
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _interpolate_linestring(geometry: dict, progress: float) -> dict:
    coordinates = geometry.get("coordinates", [])
    if not isinstance(coordinates, list) or not coordinates:
        return {"type": "Point", "coordinates": [0.0, 0.0]}
    if progress <= 0 or len(coordinates) == 1:
        return {"type": "Point", "coordinates": coordinates[0]}
    if progress >= 1:
        return {"type": "Point", "coordinates": coordinates[-1]}
    lengths: list[float] = []
    total = 0.0
    for start, end in pairwise(coordinates):
        length = _meters_between(start, end)
        lengths.append(length)
        total += length
    target = total * progress
    traveled = 0.0
    for index, length in enumerate(lengths):
        if traveled + length >= target:
            start = coordinates[index]
            end = coordinates[index + 1]
            ratio = 0.0 if length <= 0 else (target - traveled) / length
            return {
                "type": "Point",
                "coordinates": [
                    start[0] + (end[0] - start[0]) * ratio,
                    start[1] + (end[1] - start[1]) * ratio,
                ],
            }
        traveled += length
    return {"type": "Point", "coordinates": coordinates[-1]}


def _meters_between(left: list[float], right: list[float]) -> float:
    import math

    latitude = (left[1] + right[1]) / 2
    dx = (right[0] - left[0]) * 111_320 * math.cos(math.radians(latitude))
    dy = (right[1] - left[1]) * 110_540
    return math.hypot(dx, dy)
