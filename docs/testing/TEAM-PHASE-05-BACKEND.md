# Team Phase 5 backend acceptance evidence

**Issue:** #73 — Jared Noel (`@AshenDary`)
**Branch:** `test/73-backend-acceptance`
**Scope:** API/database negative regression and safe local operational checks.
**Allowed paths changed:** `backend/tests/test_phase5_acceptance.py`, `docs/testing/TEAM-PHASE-05-BACKEND.md`.

## Accepted baseline

- `origin/main`: `df5a29ddf3ec280b76abbc2a096579727d736693`.
- PR #69, `fix(offline): complete Team Phase 4 gate and prepare Team Phase 5`, merged 2026-10-04T18:04:52Z.
- Issue #64 is closed with `status:completed-and-verified`.
- Hosted main CI for `df5a29d`: run `37222997330`, workflow `CI`, conclusion `success`, created 2026-10-04T18:04:55Z, updated 2026-10-04T18:06:47Z.
- PR #69 checks before merge: `frontend`, `backend`, and `ml-evidence` all `SUCCESS`.

This is hosted CI evidence only. Local test runs below are separate.

## Environment

- Python: `backend/.venv/bin/python`, CPython 3.12.14 from `uv venv --python 3.12 .venv`.
- Backend dependency install: `uv pip install --python .venv/bin/python -r requirements.txt -r requirements-dev.txt`.
- Pytest: 9.1.1.
- Ruff: 0.16.10.
- MongoDB: Docker container `resqph-issue73-mongodb`, image `mongo:8.0`, server version 8.0.32, single-node replica set `rs0`, published at `127.0.0.1:27019`.
- Mongo URI used in tests: `mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true`.
- Runtime ML remained disabled by default (`ML_ENABLED=false` equivalent settings path); no model artifact was loaded.

## Disposable database procedure

Use one of these prefixes, matching the test file being run:

```bash
DB="resqph_issue73_backend_$(date +%Y%m%d%H%M%S)"
DB="resqph_issue62_offline_$(date +%Y%m%d%H%M%S)"
DB="resqph_issue15_api_test_$(date +%Y%m%d%H%M%S)"
```

The Phase 5 fixture refuses to run unless the database name matches `resqph_issue73_backend_[A-Za-z0-9_]+`, the server is a replica set, and the database does not already exist. The fixture patches the accepted application settings to the disposable database, enters the production FastAPI lifespan, initializes indexes and synthetic teams, then drops only that disposable database during cleanup.

Cleanup check:

```bash
docker exec resqph-issue73-mongodb mongosh --quiet --eval \
  'db.adminCommand({listDatabases: 1}).databases.map(d => d.name).filter(n => n.startsWith("resqph_issue")).join("\n")'
```

Observed result: empty output after the runs below.

## Acceptance matrix

| Case | Contract source | Existing coverage | New Phase 5 coverage | Real MongoDB required | Observed outcome |
|---|---|---|---|---|---|
| Invalid rescue-request input | API contract, MVP scope | Request/schema tests | `test_phase5_invalid_inputs_and_roles_leave_database_unchanged` | Yes | `422 validation_error`, no rescue request inserted |
| Missing or prohibited role | API role simulation | Role/request tests | Missing role and volunteer create request checks | Yes | `403 demo_role_required` or `403 forbidden`, no write |
| Valid request creation | API lifecycle | Phase 2 full slice | Phase 5 lifecycle test | Yes | Request stored as `pending`, version 1, synthetic history |
| Atomic assignment | Lifecycle, MongoDB consistency boundary | Assignment unit and Mongo tests | Lifecycle test plus dependency rollback test | Yes | Success path writes request, mission, team; failure path rolls back all three |
| Mission status progression | Lifecycle | Mission/offline tests | Strict accepted lifecycle test | Yes | Mission reaches `completed`, version 4, 3 immutable events |
| Request mirrors mission progression | Lifecycle | Not fully covered | Strict accepted lifecycle test | Yes | **Defect:** request stays `assigned`, version 2 |
| Ordered immutable history | Lifecycle/offline | Mission/offline tests | Lifecycle test stores first event then verifies unchanged after completion | Yes | Mission event history ordered and first event unchanged |
| Duplicate assignment | API/lifecycle conflict | Assignment tests | Phase 5 negative test | Yes | `409 duplicate_assignment`, second team remains available |
| Same event replay | Offline contract | Offline tests | Phase 5 negative test | Yes | Same event id/body returns current mission, one event stored |
| Conflicting event-id reuse | Offline contract | Offline Mongo tests | Phase 5 negative test | Yes | `409 duplicate_event`, one event stored |
| Stale version | Lifecycle/offline | Mission/offline tests | Phase 5 negative test | Yes | `409 stale_mission_version`, no event stored |
| Wrong/reassigned actor | Lifecycle/offline | Role/offline tests | Wrong actor and reassigned original actor checks | Yes | `403 forbidden`, no extra write |
| Invalid/skipped/repeated transitions | Lifecycle | Mission/offline tests | Skipped and repeated checks | Yes | `409 invalid_transition`, no extra write |
| Dependency failure envelope | API error envelope | Assignment Mongo rollback catches some DB failures | Phase 5 dependency failure injection through production `AssignmentService` | Yes | **Defect:** rollback succeeds, but response is `500` instead of documented `503 database_unavailable` envelope |
| OpenAPI paths/schemas | API/routing/ML contracts | Route/request OpenAPI tests | Phase 5 OpenAPI smoke | No | Required paths and `ErrorEnvelope` schema present; assignment documents 201/403/404/409/422/503 |
| CORS accepted config | API operational boundary | Not central in earlier tests | Allowed and blocked preflight checks | No | `localhost:5173` allowed; unlisted origin blocked |
| Startup/index initialization | Database setup | Database lifecycle tests | Production FastAPI lifespan in Mongo fixture | Yes | App starts, indexes/synthetic teams initialized, fixture cleanup drops DB |

## Commands and results

Standard backend checks:

```bash
cd backend
.venv/bin/python -m ruff check app tests ../tests/integration
.venv/bin/python -m pytest tests ../tests/integration
```

Observed:

- Ruff: passed.
- Pytest: 182 collected; **161 passed, 21 skipped, 1 warning**.
- Skips are MongoDB-gated tests when `RUN_MONGODB_INTEGRATION` is not set.
- Warning: Starlette deprecation from `fastapi.testclient` importing `httpx` via current test dependency set.

Focused Phase 5 acceptance without Mongo:

```bash
cd backend
.venv/bin/python -m pytest tests/test_phase5_acceptance.py -q
```

Observed: **1 passed, 4 skipped, 1 warning**. The skipped tests require real MongoDB.

Focused Phase 5 acceptance with MongoDB:

```bash
cd backend
DB="resqph_issue73_backend_$(date +%Y%m%d%H%M%S)"
RUN_MONGODB_INTEGRATION=1 \
MONGODB_INTEGRATION_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' \
MONGODB_INTEGRATION_DATABASE="$DB" \
.venv/bin/python -m pytest tests/test_phase5_acceptance.py -q
```

Observed: **3 passed, 2 failed, 1 warning**.

Failures:

1. `test_phase5_real_mongodb_lifecycle_updates_request_mission_and_history`
   - Expected: linked rescue request reaches `completed`, version 5, history `pending -> assigned -> en-route -> arrived -> completed`.
   - Observed: mission reaches `completed`, version 4, three ordered events; linked request remains `assigned`, version 2.
   - Runtime boundary: `backend/app/services/missions.py::MissionService.create_status_event` updates only `missions` and `mission_status_events`; it does not update `rescue_requests`.

2. `test_phase5_assignment_dependency_failure_returns_envelope_and_rolls_back`
   - Expected: forced mission insert dependency failure returns documented `503 database_unavailable` error envelope.
   - Observed: request, team and mission writes roll back correctly, but HTTP response is `500 Internal Server Error`.
   - Runtime boundary: `backend/app/services/assignments.py::AssignmentService.assign_team` catches `PyMongoError` outside `session.with_transaction`, but the injected failure through the transaction path is not converted to the documented envelope.

Phase 4 opt-in MongoDB evidence repeated:

```bash
cd backend
DB="resqph_issue62_offline_$(date +%Y%m%d%H%M%S)"
RUN_MONGODB_INTEGRATION=1 \
MONGODB_INTEGRATION_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' \
MONGODB_INTEGRATION_DATABASE="$DB" \
.venv/bin/python -m pytest tests/test_offline_sync_mongodb.py -q
```

Observed: **15 passed**.

```bash
cd backend
DB="resqph_issue15_api_test_$(date +%Y%m%d%H%M%S)"
RUN_MONGODB_INTEGRATION=1 \
MONGODB_INTEGRATION_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' \
MONGODB_INTEGRATION_DATABASE="$DB" \
MONGODB_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' \
MONGODB_DATABASE="$DB" \
.venv/bin/python -m pytest tests/test_assignment_mongodb.py -q
```

Observed: **2 passed, 1 warning**.

Broader Phase 4-style opt-in run, excluding the separately handled full assignment slice and the new Issue #73 tests because they require different disposable database prefixes:

```bash
cd backend
DB="resqph_issue62_offline_$(date +%Y%m%d%H%M%S)"
RUN_MONGODB_INTEGRATION=1 \
MONGODB_INTEGRATION_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' \
MONGODB_INTEGRATION_DATABASE="$DB" \
.venv/bin/python -m pytest tests ../tests/integration \
  -k 'not test_full_fastapi_request_to_assignment_slice_against_mongodb and not phase5'
```

Observed: 182 collected; 176 selected; **176 passed, 6 deselected, 1 warning**.

## API and operational findings

- OpenAPI exposes the accepted rescue request, assignment, mission status-event, routing, and ML road-risk paths.
- `ErrorEnvelope` exists in generated schemas.
- Assignment OpenAPI documents the accepted 201/403/404/409/422/503 response set.
- CORS allows the accepted local frontend origin `http://localhost:5173` and rejects `https://example.invalid`.
- The mission routes produce the error envelope at runtime through their local handler, but their route decorators do not explicitly list the same error response models as request/assignment/routing routes. This is an OpenAPI documentation gap to consider after the two blocking runtime defects.
- Startup through FastAPI lifespan initializes MongoDB indexes and synthetic teams in the disposable database.
- Routing and ML checks stayed within accepted boundaries: deterministic route/no-route contracts are inspected through OpenAPI and existing tests; runtime ML remains disabled and no live or guaranteed-safe navigation claim is made.

## Simulated versus persisted

- Verified with real persistence: request creation, assignment success, mission status success, event replay/conflict, stale version rejection, wrong/reassigned actor rejection, invalid transition rejection, assignment rollback, index initialization, cleanup.
- Simulated failure injection: the assignment dependency failure uses a custom `AssignmentRepository.create_mission` that raises `PyMongoError` while retaining production `AssignmentService`, real request repository, real rescuer repository, real MongoDB transaction, and production route execution.
- Not verified as passing: accepted request status mirroring mission progression; documented 503 envelope for the injected assignment transaction failure.

## Product defects for Ranee-scoped repair

1. **Request lifecycle does not follow mission lifecycle after assignment.**
   - Affected file/function: `backend/app/services/missions.py::MissionService.create_status_event`.
   - Expected: accepted mission status transitions update the linked rescue request to `en-route`, `arrived`, and `completed` with version/history in the same accepted consistency boundary.
   - Observed: mission reaches `completed`; request remains `assigned`, version 2.
   - Reproduce: run the focused Phase 5 MongoDB command above.

2. **Assignment dependency failure does not return the documented error envelope.**
   - Affected file/function: `backend/app/services/assignments.py::AssignmentService.assign_team`.
   - Expected: dependency failure returns HTTP `503` with `error.code == "database_unavailable"`.
   - Observed: transaction rollback succeeds, but API returns HTTP `500`.
   - Reproduce: run the focused Phase 5 MongoDB command above.

## Current verdict

**Not ready for PR review.** The new acceptance tests and evidence are locally useful, but Issue #73 acceptance is incomplete until the two runtime defects above are repaired in the proper owner boundary and the focused Phase 5 MongoDB command passes.

No local commits were created because the relevant acceptance checks do not pass.

## Manual PR draft

Title:

```text
test(backend): add Phase 5 API and MongoDB acceptance evidence
```

Description:

```markdown
Closes #73

## Summary
- Added Phase 5 backend acceptance tests for OpenAPI/CORS, invalid input and role rejection, real MongoDB lifecycle, replay/conflict/stale/actor/transition rejections, and assignment rollback.
- Added repeatable backend evidence with baseline CI, commands, MongoDB setup, cleanup procedure, observed results, and limitations.

## Changed files
- backend/tests/test_phase5_acceptance.py
- docs/testing/TEAM-PHASE-05-BACKEND.md

## Observed results
- Hosted main CI baseline at df5a29d is green.
- Ruff: `python -m ruff check app tests ../tests/integration` passed.
- Standard backend/integration pytest: 161 passed, 21 skipped, 1 warning.
- Existing Phase 4 MongoDB offline suite: 15 passed.
- Existing assignment MongoDB suite: 2 passed, 1 warning.
- Broad Phase 4-style opt-in MongoDB run: 176 passed, 6 deselected, 1 warning.
- Focused Phase 5 MongoDB acceptance: 3 passed, 2 failed, 1 warning.

## Blocking defects
- Request records remain `assigned` after the linked mission reaches `completed`; expected request lifecycle/history to progress through `en-route`, `arrived`, and `completed`.
- Forced assignment transaction dependency failure rolls back database writes but returns HTTP 500 instead of the documented 503 error envelope.

## Checklist
- [x] Baseline main revision and hosted CI recorded
- [x] Local Ruff run recorded
- [x] Standard backend/integration pytest recorded
- [x] Real MongoDB opt-in evidence recorded
- [x] Disposable database cleanup confirmed
- [ ] Focused Phase 5 MongoDB acceptance passes
- [ ] CI observed on this branch
- [ ] Reviewer approval
- [ ] Merge
```
