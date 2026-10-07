# Team Phase 5 automatic request-to-mission verification

**Date:** 2026-10-08, Asia/Manila.  
**Branch:** `fix/jared/Fixing-RoutingOptimization`.  
**HEAD:** `7cc9467629d469b0a92ef6c59d63654b8fd70c47`.  
**Verdict:** Partially verified. Backend/database automatic request-to-mission flow works for the core happy path and several negative cases. Fresh browser acceptance is unverified because no Browser instance was available. Several defects remain.

No commits, pushes, PRs, GitHub comments, runtime-code changes, dependency changes, or UI changes were made.

## Baseline

Initial working tree was clean: `git status --short` produced no tracked changes.

Observed local services and packages:

- Backend API under verification: `http://127.0.0.1:8038/api/v1`.
- Frontend production preview built with `VITE_API_URL=http://127.0.0.1:8038/api/v1`: `http://127.0.0.1:5238/`.
- Existing normal MongoDB container was present on `27017`; it was not used.
- Installed routing package resolved to this checkout: `routing/src/resqph_routing/__init__.py`, with `find_shortest_distance_route` available.
- Account creation and login are frontend localStorage role simulation only, through `resqph.auth.user`. There is no demonstrated backend account persistence.

## Disposable MongoDB

Created container: `resqph_verify_mongo_20261008`, image `mongo:8.0`, host port `127.0.0.1:27038`, replica set `resqph_verify_rs`.

Sanitized settings used:

```text
RUN_MONGODB_INTEGRATION=1
MONGODB_INTEGRATION_URI=mongodb://127.0.0.1:27038/?replicaSet=resqph_verify_rs&directConnection=true
MONGODB_URI=mongodb://127.0.0.1:27038/?replicaSet=resqph_verify_rs&directConnection=true
MONGODB_DATABASE=resqph_verify_auto_e2e_20261008
FRONTEND_ORIGINS=http://127.0.0.1:5238,http://localhost:5238
```

Replica-set proof:

- `hello.setName`: `resqph_verify_rs`.
- `hello.isWritablePrimary`: `true`.
- `replSetGetStatus.ok`: `1`.
- member: `localhost:27017`, `PRIMARY`, health `1`.

Transaction proof from host PyMongo:

- Committed transaction inserted one probe document; persisted count was `1`.
- Aborted transaction inserted then aborted one probe document; persisted count was `0`.

## Core Automatic Flow

Synthetic citizen request:

- Citizen: `verify.citizen@example.test`.
- Request: `request-f7f8668f8f254e4383540c66066eee6a`.
- Mission: `mission-e2349d3f6d124db3b53af0b700e314a1`.
- Assigned team/rescuer: `team-central-sampaloc-lacson-hq`.

Create response was HTTP `201`, `status=assigned`, `version=2`, with `assigned_team_id` and `mission_id`.

Persisted records:

- `rescue_requests`: 1.
- `missions`: 1.
- `mission_status_events`: 0 before lifecycle updates.
- `rescuers`: 8.
- One active mission for the request and one active mission for the selected team.
- Request history: `pending -> assigned`.
- Team state: `availability=assigned`, linked request and mission IDs set.

The mission stored a `route-found` result:

- `route_id=route-66282e72911144a1`.
- `distance_m=42.63130224225942`.
- edge: `ubelt-v1:104973035:73007247:0`.
- snapped origin distance: `852.753m`.
- snapped destination distance: `800.653m`.

Independent route ranking with the current route-distance policy selected the same team. However, three teams tied on the same one-edge road distance and the selected path depends on large snapping distances near the configured `900m` limit. This verifies the configured policy, not real station connectivity.

## Rescuer Receipt And Tracking

API verification:

- `GET /missions?assigned_to=me&status=assigned,en-route,arrived` as `team-central-sampaloc-lacson-hq`: HTTP `200`, one mission.
- `GET /missions/{mission_id}` as `wrong-team`: HTTP `404 mission_not_found`.
- `GET /missions/{mission_id}/tracking`: HTTP `200`, route geometry present, initial marker present.
- `POST /missions/{mission_id}/tracking/control {"action":"start"}`: HTTP `200`, `simulation_status=running`.
- A follow-up tracking read after about one second returned a different position and `progress_ratio=0.23664458123604312`.

Browser acceptance was not verified. The Browser plugin returned `No browser is available`.

## Lifecycle

Allowed status transitions passed:

- `assigned -> en-route`: HTTP `200`, mission version `2`, history length `1`.
- `en-route -> arrived`: HTTP `200`, mission version `3`, history length `2`.
- `arrived -> completed`: HTTP `200`, mission version `4`, history length `3`.

Retrying each accepted `event_id` returned HTTP `200` without version or history growth.

Persisted final state:

- Request status `completed`, version `5`, history `pending -> assigned -> en-route -> arrived -> completed`.
- Mission status `completed`, version `4`, `completed_at` set.
- Team availability `available`, assignment links cleared, version `5`.
- Exactly 3 immutable mission status events.

Negative lifecycle checks:

- Wrong rescuer update: HTTP `403 forbidden`, unchanged state.
- Invalid skipped transition `assigned -> completed`: HTTP `409 invalid_transition`.
- Reusing an accepted `event_id` with changed body: HTTP `409 duplicate_event`.
- Repeated terminal transition: HTTP `409 invalid_transition`.
- Active-list refresh after completion excluded the completed mission.

## Retry, Concurrency, No Route, And Authorization

Duplicate submission / lost response:

- There is no request idempotency key or duplicate-submission contract.
- Reposting the same payload from the same citizen produced 2 rescue requests and 2 missions.
- Proposed repair: add explicit request idempotency semantics before claiming lost-response safety.

Concurrent requests with one usable team:

- Two overlapping API submissions were issued with only `team-david-fire-rescue-hq` available.
- Result: one assigned request/mission, one pending request with no mission.
- Active missions for the limited team: `1`.

No eligible team:

- With all teams unavailable, create returned HTTP `201`, request `pending`, no mission, no team.

Valid no-route:

- With one available team at `[120.9938198, 14.5977093]` and destination `[121.0036128, 14.6117538]`, create returned HTTP `201`, request `pending`, no mission.
- Recommendations returned no candidates and an exclusion for the available team with `controlled_impassability_disconnected_destination`.

Dependency/authorization:

- Missing rescue-request role header: HTTP `403 demo_role_required`, no request created.
- Stale manual assignment on a pending request: HTTP `409 stale_request_version`, unchanged request.
- Route endpoint with invalid scenario failed validation with HTTP `422`.
- Mission list without demo headers returned HTTP `403 forbidden`; note that mission routes still implement a separate permissive header parser that defaults unsupported roles to `citizen` before service-level denial.

Rollback:

- Existing injected assignment-failure test no longer reaches its intended seam after automatic assignment, because request creation already creates a mission. The old suite now fails and must be updated for auto-assignment or supplied with a pending request fixture.
- Existing real MongoDB offline rollback suite still passed: `15 passed`.

## Team Seeding

Startup seeded 8 rescuers:

- Legacy `team-alpha`, `team-bravo`, and `team-charlie` exist but have `station_id=null`, `base_location=null`, and `current_location=null`.
- Station-catalog teams have station fields and locations.

Repeated initialization:

- Preserved assignment state and availability on a station team.
- Overwrote a manually moved `current_location` back to the station fixture point.

Proposed repair: update seeding so all active demo teams have consistent station fields, and repeated startup does not overwrite moving `current_location` / `position_updated_at` for existing teams unless explicitly resetting fixtures.

## Map And Tracking Diagnosis

Backend tracking is authoritative and moves:

- Tracking responses include route geometry and changing positions after `start`.
- Tracking does not automatically complete the mission.

Frontend code path:

- Rescuer API mission card calls `getMissionTracking` every 3 seconds and renders `MissionTrackingMap`.
- `MissionTrackingMap` draws backend route geometry and moves a Leaflet circle marker; follow/recenter is a checkbox that pans when `follow` is enabled and disables follow on drag/zoom.
- Citizen status view calls `getMissionTracking` and displays tracking metrics, but does not render a map marker.
- Legacy `MissionContext` still contains fixture missions and route maps for non-API demo branches; API missions are intended to render separately through `offline.mission`.

Confirmed frontend/API mismatch by code and API:

- Backend permits `request_summary.situation_summary=null`.
- Frontend offline mission schema requires `situation_summary: z.string()`.
- API probe with omitted summary returned a mission with `request_summary.situation_summary=null`, which the frontend offline cache validator would reject.

Browser-only items not verified:

- Whether the actual assigned mission map appears in the running UI.
- Whether tracking network requests fire from the browser.
- Whether marker movement is visible.
- Whether citizen and rescuer views show consistent progress.
- Whether fixture data conceals backend errors in a real session.

Manual browser steps:

1. Start backend with the disposable database and `FRONTEND_ORIGINS=http://127.0.0.1:5238`.
2. Build and preview frontend with `VITE_API_URL=http://127.0.0.1:8038/api/v1`.
3. In one fresh browser context, log in as a citizen and submit a request with a non-empty situation summary.
4. In a separate browser context, log in as rescuer using the selected team ID from the API response, e.g. `team-central-sampaloc-lacson-hq`.
5. Confirm the mission appears without app restart and survives refresh.
6. Open DevTools network and confirm `/missions?assigned_to=me`, `/missions/{id}/tracking`, and `/missions/{id}/tracking/control` calls.
7. Start tracking and observe marker movement and follow toggle behavior.
8. Progress statuses through completion, then refresh both contexts and compare API state.
9. Repeat with the situation summary omitted to confirm the current frontend validation failure.

## Checks

Backend:

- `python -m pytest -q` from `backend/`: `143 passed, 23 skipped, 1 warning`.
- `python -m ruff check app tests ../tests/integration` from `backend/`: failed with 27 existing import-order findings.
- `RUN_MONGODB_INTEGRATION=1 python -m pytest tests/test_phase5_acceptance.py -q`: `2 passed, 5 failed`. Failures are due to tests still expecting pending/manual assignment or rollback seam after request creation, while current create auto-assigns.
- `RUN_MONGODB_INTEGRATION=1 python -m pytest tests/test_assignment_mongodb.py -q`: `1 passed, 1 failed`. Failure is the same pending/manual-assignment drift.
- `RUN_MONGODB_INTEGRATION=1 python -m pytest tests/test_offline_sync_mongodb.py -q`: `15 passed`.

Frontend:

- `npm run lint`: passed with 4 existing warnings.
- `npm test -- --run --pool forks --maxWorkers 1`: 29 files, 249 tests passed; repeated Node localStorage experimental warnings.
- `VITE_API_URL=http://127.0.0.1:8038/api/v1 npm run build`: passed; existing large chunk warning at `897.73 kB`.

## Named Defects And Proposed Repairs

1. No request idempotency for duplicate/lost-response submissions.
   - Affects automatic request creation.
   - Proposed repair: add a client-generated idempotency key and unique persistence contract, or explicitly document no retry safety.

2. Assignment/routing validation errors can leak as HTTP 500 after the request is persisted.
   - Affected files: `backend/app/services/assignments.py`, `backend/app/services/rescue_requests.py`.
   - Evidence: out-of-bound team `current_location` produced HTTP `500`, while the request remained persisted pending.
   - Proposed repair: catch route input validation in team ranking, exclude that team with a stable reason, and preserve HTTP `201 pending` or a documented envelope.

3. Station seeding is inconsistent and repeated startup overwrites moving positions.
   - Affected file: `backend/app/repositories/rescuers.py`.
   - Proposed repair: retire or enrich legacy `team-alpha/bravo/charlie` fixtures, and use `$setOnInsert` or guarded updates for `current_location`.

4. Frontend offline/API schema mismatch for nullable `situation_summary`.
   - Affected file: `frontend/src/features/offline/offlineStore.ts`.
   - Proposed repair: accept `z.string().nullable().optional()` and sanitize display fallback.

5. Existing MongoDB acceptance tests are stale for automatic assignment.
   - Affected files: `backend/tests/test_phase5_acceptance.py`, `backend/tests/test_assignment_mongodb.py`.
   - Proposed repair: update fixtures to either verify auto-assigned create responses or seed pending requests directly for manual assignment/rollback cases.

6. Browser acceptance remains unverified in this run.
   - Cause: no Browser instance available to Codex.
   - Proposed repair: rerun with Browser/Chrome tooling connected and follow the manual matrix above.

## Cleanup

The following task-created resources should be removed after review:

- Stop backend process on port `8038`.
- Stop frontend preview on port `5238`.
- Stop container `resqph_verify_mongo_20261008`; it was started with `--rm`.
- Disposable database names used only the `resqph_verify_*`, `resqph_issue73_backend_*`, `resqph_issue15_api_test_*`, and `resqph_issue62_offline_*` prefixes.
