# Project Foundation Phase 2 gate

**Decision:** Approve

**Decision owner:** Ranee

**Decision date:** 2026-09-29

**Implementation baseline:** `21a779d` (PR #23 merged into `main`)

## Gate conclusion

The Foundation Phase 2 core application is accepted. The repository now demonstrates one persistent, sanitized request-to-mission vertical slice without depending on mapping, routing, ML, or offline persistence:

1. A simulated citizen submits a valid request inside `ubelt-pilot-v1`.
2. FastAPI validates and persists the request in MongoDB.
3. A simulated coordinator lists the pending request and atomically assigns `team-alpha`.
4. The transaction creates one mission, changes the request to `assigned`, and reserves the team.
5. The assigned rescuer retrieves the mission and advances it from `assigned` to `en-route`.
6. The citizen retrieves the authoritative `assigned` request state.
7. The mission flow remains valid while `latest_route_result` is `null`, proving that later routing and ML adapters do not block the core lifecycle.

## Accepted implementation packages

| Package | Evidence | Result |
|---|---|---|
| Core request, study-area, persistence, and atomic assignment | PR #24, merge `a926088` | Accepted |
| Mission lifecycle, role enforcement, idempotency, and history | PR #21, merge `316b9e2` | Accepted |
| Citizen request and authoritative status UI | PR #22, merge `9341340` | Accepted |
| Coordinator queue/assignment and rescuer mission/status UI | PR #23, merge `21a779d` | Accepted after backend-contract corrections |

## Required checks

- Backend Ruff: passed.
- Backend Pytest without the opt-in database suite: `33 passed, 2 skipped`.
- Backend Pytest with the disposable MongoDB replica-set integration database: `35 passed`.
- Frontend tests: `8` files and `98` tests passed.
- Frontend production build: passed; the bundle-size advisory is non-blocking.
- Frontend lint: completed with five existing warnings and no errors.
- PR #23 GitHub checks: `2/2` passed before merge.

Detailed evidence and reproducible commands are in [`../testing/PHASE-02-EVIDENCE.md`](../testing/PHASE-02-EVIDENCE.md).

## Scope conditions carried forward

- Team Phase 1 is the next executable phase and is limited to the bounded U-Belt mapping/geospatial pipeline.
- Basic role simulation remains non-production authentication.
- Controlled/historical flood scenarios must not be represented as live prediction.
- The deterministic rule-based risk calculation remains mandatory.
- XGBoost is the accepted candidate experiment under D-019, but its team-reported ROC-AUC `0.97` and recall `0.92` are not repository-verified until the evidence package is reproduced and reviewed.
- No routing, ML, offline, government-integration, guaranteed-safety, nationwide, or actual-emergency-readiness claim is approved by this gate.

## Administrative boundary

This gate approves the technical phase. GitHub Issue #19 and any remaining implementation issue are not treated as closed merely because this document exists; issue state must match merged evidence and Ranee's explicit administrative decision.
