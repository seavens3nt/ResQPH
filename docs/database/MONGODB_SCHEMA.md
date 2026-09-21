# MongoDB schema and consistency contract

**Status:** Completed and verified Phase 1 contract baseline
**Last updated:** 2026-09-22

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

### `route_results`

Versioned route-evaluation record referenced by a mission rather than embedded as an unbounded history array.

Required: `id`, mission ID, scenario ID/version, algorithm, route geometry, edge IDs, distance, estimated time, total cost, cost breakdown, fallback flag, warnings, explanation, source/scenario timestamp, and creation time.

Optional: accepted model name/version and bounded model contribution.

Indexes: unique `id`; mission plus creation time; scenario ID/version. Route records use the same retention policy as their mission unless a later storage decision explicitly changes it.

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

## Locked Phase 1 schema decisions

- High-frequency `location_updates` use a 30-day TTL in the academic prototype. Mission/request history, status events, and final route evidence are not deleted by that TTL.
- Route evaluations are stored in `route_results`; `missions` reference the latest accepted route and may keep small summary fields.
- Rescue and hazard points are validated against the `ubelt-pilot-v1` polygon loaded from the versioned boundary fixture. Outside-boundary input returns the common `422` error and is not stored.
- Coordinator cancellation while a mission is still `assigned` changes both request and mission to `cancelled`, restores team availability, and appends history in one transaction. Cancellation after `en-route` is not part of the MVP workflow.
