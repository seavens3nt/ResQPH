# Project Foundation Phase 2 — Core Application

**Status:** Ready to start  
**Decision and gate owner:** Ranee  
**Priority authority:** [`../requirements/MVP_SCOPE.md`](../requirements/MVP_SCOPE.md)  
**Inputs:** Phase 1 contracts, fixtures, wireframes, and gate evidence merged through PR #13

## Objective

Implement one persistent, testable vertical slice from a simulated citizen role through rescue-request creation, coordinator assignment, rescuer mission retrieval, valid mission-status updates, and citizen status viewing. The slice must work without routing, ML, or external flood-data services.

This phase protects the core application under the project's time constraint. Extra CRUD variations, analytics, visual effects, and future-phase behavior do not enter the phase until the vertical slice passes.

## Entry conditions

- Phase 1 gate is `Approve` and its files are on `main`.
- [`../requirements/MVP_SCOPE.md`](../requirements/MVP_SCOPE.md), [`../api/API_CONTRACT.md`](../api/API_CONTRACT.md), [`../database/MONGODB_SCHEMA.md`](../database/MONGODB_SCHEMA.md), and [`../workflows/RESCUE_LIFECYCLE.md`](../workflows/RESCUE_LIFECYCLE.md) are authoritative.
- MongoDB runs as the repository's single-node replica set.
- All records used in development and tests are synthetic or sanitized.
- Basic role simulation is visibly identified as non-production authentication.

## Minimum vertical slice

1. A simulated citizen creates one valid request inside `ubelt-pilot-v1`.
2. FastAPI validates and stores it in MongoDB as `pending`.
3. A simulated coordinator views the pending request and assigns one available team atomically.
4. The assignment creates one mission, changes the request to `assigned`, and reserves the team in one transaction.
5. The assigned rescuer retrieves the mission and advances it through only the next valid transition.
6. The citizen sees the authoritative updated request state.
7. Invalid roles, invalid transitions, stale versions, duplicate assignment, and outside-boundary input return the locked error contract without partial writes.

## Member work packages

### Ranee — Core backend and phase integration

**Owned files**

- `backend/app/main.py`
- `backend/app/core/`
- `backend/app/db/`
- `backend/app/api/dependencies/demo_role.py`
- `backend/app/models/rescue_request.py`
- `backend/app/models/rescuer.py`
- `backend/app/repositories/rescue_requests.py`
- `backend/app/repositories/rescuers.py`
- `backend/app/repositories/assignments.py`
- `backend/app/services/rescue_requests.py`
- `backend/app/services/assignments.py`
- `backend/app/schemas/common.py`
- `backend/app/schemas/rescue_requests.py`
- `backend/app/schemas/assignments.py`
- `backend/app/api/routes/rescue_requests.py`
- `backend/app/api/routes/assignments.py`
- corresponding request/assignment `backend/tests/test_*.py` files

**Required output**

- MongoDB lifecycle and index setup
- Rescue-request validation, create/list/get, and permitted cancellation
- Atomic assignment transaction and conflict behavior
- Boundary validation using the committed study-area fixture
- Sanitized seed/test records
- OpenAPI responses matching the contract

**Boundary**

Do not implement routing, ML training, or frontend presentation inside backend modules. Use a future adapter boundary when a route result is not yet available.

### Jared — Mission lifecycle and integration backend

**Owned files**

- `backend/app/services/missions.py`
- `backend/app/api/routes/missions.py`
- `backend/app/models/mission.py`
- `backend/app/models/mission_status_event.py`
- `backend/app/repositories/missions.py`
- `backend/app/repositories/mission_status_events.py`
- `backend/app/schemas/missions.py`
- `backend/tests/test_missions.py`
- `backend/tests/test_role_simulation.py`

**Required output**

- Mission list/get for the assigned rescuer
- Valid `assigned -> en-route -> arrived -> completed` transitions
- `403`, `409`, and `422` behavior from the common error envelope
- Optimistic-version conflict protection
- Mission-status history records
- Backend tests proving no skipped, repeated, backward, or stale transition succeeds

**Boundary**

Do not edit frontend, routing, or ML directories, `backend/app/main.py`, or the Ranee-owned request/assignment files. Contract changes require Ranee's decision before implementation.

### Elle — Citizen request and tracking flow

**Owned files**

- `frontend/src/features/requests/`
- `frontend/src/api/rescueRequests.ts`
- `frontend/src/pages/dashboard/views/CitizenView.tsx`
- citizen-specific files under `frontend/src/pages/dashboard/views/citizen/`
- `frontend/src/pages/dashboard/views/citizen/CitizenRequestFlow.test.tsx`

**Required output**

- Citizen request form connected to the approved API client
- Validation, loading, success, system-error, and outside-boundary states
- Request-status view using authoritative API state
- Visible controlled-scenario and non-production role-simulation notices
- Responsive and keyboard-accessible behavior

**Boundary**

Do not edit backend, routing, ML, coordinator/rescuer, or `frontend/src/features/missions/` files. Do not add live-data, guaranteed-safety, or official-dispatch claims.

### Clarence — Coordinator and rescuer core views

**Owned files**

- coordinator-specific files under `frontend/src/pages/dashboard/views/coordinator/`
- rescuer-specific files under `frontend/src/pages/dashboard/views/rescuer/`
- `frontend/src/pages/dashboard/views/CoordinatorView.tsx`
- `frontend/src/pages/dashboard/views/RescuerView.tsx`
- `frontend/src/api/assignments.ts`
- `frontend/src/api/missions.ts`
- `frontend/src/features/missions/`
- reusable components needed only by these flows under `frontend/src/components/ui/`
- `frontend/src/pages/dashboard/views/coordinator/CoordinatorAssignmentFlow.test.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerMissionFlow.test.tsx`

**Required output**

- Pending-request queue and assignment action
- Assignment-conflict and unavailable-team states
- Assigned mission view and next-valid status action
- Loading, empty, unauthorized, conflict, and system-error states
- Responsive and keyboard-accessible behavior

**Boundary**

Do not implement route algorithms in the frontend and do not edit backend, ML, `CitizenView.tsx`, or `frontend/src/features/requests/` files. Route presentation remains fixture-based until Team Phase 2 provides the accepted adapter.

### Matthew — Contract review only during this phase

Matthew does not need to begin geospatial, routing, or ML implementation to unblock the core lifecycle. He may review the route adapter boundary and Phase 1 fixtures, but his executable work opens in Team Phase 1 after this gate. This prevents his later three-phase ownership from becoming an early capacity bottleneck.

## Required verification

### Backend

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

Required evidence includes successful-path tests plus role, validation, transaction rollback, duplicate assignment, invalid transition, stale version, and outside-boundary cases.

### Frontend

```powershell
Set-Location frontend
npm ci
npm run lint
npm test
npm run build
```

Required evidence includes request submission, authoritative status rendering, assignment conflict, mission transition, loading, empty, error, and non-production notice states.

### Integration

Run the minimum vertical slice against the Docker MongoDB service and record sanitized request, mission, and status identifiers. Verify that the workflow still succeeds when route and ML adapters are unavailable.

## Exit gate

Ranee chooses one result:

- `Approve`: the vertical slice and required failure cases pass and the accepted behavior is merged.
- `Approve with conditions`: only named, non-critical corrections remain with owners and deadlines.
- `Do not approve`: persistence, transaction consistency, authorization, lifecycle, or demonstrability is not yet reliable.

Team Phase 1 opens only after the Foundation Phase 2 gate is accepted. Optional Tier 3 work is not a Phase 2 exit requirement.
