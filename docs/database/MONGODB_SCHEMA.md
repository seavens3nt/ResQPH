# MongoDB schema and consistency contract

**Status:** Draft for Phase 1 review
**Last updated:** 2026-09-21

## Shared rules

- Store MongoDB `_id` internally and expose a stable opaque string `id` through the API.
- Use UTC timestamps for `created_at`, `updated_at`, observed data, and server-recorded events.
- Store geographic points as GeoJSON `{ "type": "Point", "coordinates": [longitude, latitude] }`.
- Preserve request and mission history. Normal application operations do not hard-delete completed or cancelled records.
- Use schema validation in Pydantic and MongoDB-compatible document validation where practical.
- Use optimistic versions on lifecycle records to reject stale writes.
- Store only synthetic or sanitized records during development and demonstration.

## Collections

### `users`

Prototype identity and role record.

Required: `id`, `display_name`, `role`, `is_active`, `created_at`, `updated_at`.

Indexes: unique `id`; optional unique normalized demo login identifier.

### `rescuers`

Team profile and current availability.

Required: `id`, `team_name`, `unit_type`, `member_count`, `has_medical_unit`, `availability`, `version`, timestamps.

Optional: sanitized lead name, contact placeholder, last known GeoJSON point, location timestamp.

Indexes: unique `id`; availability; `last_location` as `2dsphere` only when nearby queries are implemented.

### `rescue_requests`

Citizen-submitted assistance request.

Required: `id`, simulated `citizen_id`, `location`, `headcount`, vulnerability list, medical-needs flag, reported flood level, situation summary, `status`, `version`, timestamps.

Optional: assigned team and mission references, sanitized details, cancellation reason.

Indexes: unique `id`; status plus creation time; simulated citizen plus creation time; `location.point` as `2dsphere`.

### `missions`

Assignment connecting one request and one team.

Required: `id`, `request_id`, `team_id`, `status`, `version`, `assigned_at`, timestamps.

Optional: active route result reference, completion summary, rescuer notes.

Indexes: unique `id`; unique partial index preventing more than one active mission per `request_id`; team plus status; request reference.

### `mission_status_events`

Append-only lifecycle history and offline idempotency record.

Required: `event_id`, `mission_id`, prior status, new status, actor ID/role, source, server timestamp.

Optional: client timestamp and sanitized note.

Indexes: unique `event_id`; mission plus server timestamp.

### `location_updates`

Timestamped operational location samples when location tracking is demonstrated.

Required: `id`, entity type, entity ID, GeoJSON point, source, observed time, received time.

Indexes: entity plus observed time; point as `2dsphere`. Define retention before enabling high-frequency updates.

### `flood_reports`

Controlled, historical, or manually reported hazard observation.

Required: `id`, GeoJSON point, hazard type, severity, source type, verification state, observed time, timestamps.

Optional: flood depth, reporter demo ID, sanitized note, scenario ID, source reference.

Indexes: point as `2dsphere`; verification plus observed time; scenario ID.

### `sync_events`

Server-side receipt and result of the single supported queued client action.

Required: client event ID, device/demo user ID, mission ID, action type, payload digest, received time, result status.

Indexes: unique client event ID; mission plus received time.

## Assignment consistency boundary

The following changes must succeed together or have no effect:

1. Confirm request is `pending` at the expected version.
2. Confirm team is available at the expected version.
3. Create the mission as `assigned`.
4. Change the request to `assigned` and record mission/team references.
5. Change team availability to assigned.
6. Append assignment history.

MongoDB transaction support is available through the local replica-set configuration. Tests must force a mid-operation failure and confirm that no partial assignment remains.

## Completion consistency boundary

Completing a mission must update the mission, request, team availability, and history consistently. A duplicate completion event with the same idempotency key returns the original result rather than creating another transition.

## Open schema decisions

- Final retention period for location updates
- Whether route results are embedded in missions or referenced from a separate collection
- Exact study-boundary validation method
- Whether cancellation after assignment creates a dedicated mission-cancelled state
