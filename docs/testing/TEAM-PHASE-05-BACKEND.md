# Team Phase 5 backend acceptance evidence

**Issue:** #73 — Jared Noel (`@AshenDary`); reviewer integration repair by Ranee.
**Branch:** `test/73-backend-acceptance` — PR #80.
**Reviewed main baseline:** `44a03f99fb6739ba8b854d7e07893db758dd5c54`.
**Verification date:** 2026-10-06.

## Review corrections

The original package at `f8b10ac` reported 3 passed / 2 failed in its focused
MongoDB suite. Both failures were reproduced after integrating current main.

1. **Real lifecycle defect repaired:** accepted mission transitions now update
   the linked request status/version/history and team availability within the
   same transaction as the mission and immutable event. Completion records its
   timestamp and releases the team. A changed/missing link returns
   `409 lifecycle_conflict` and rolls back all records.
2. **Failure-injection fixture repaired:** the original override supplied a
   synchronous `Database` to asynchronous repositories, producing HTTP 500
   before the intended injected `PyMongoError`. It was not evidence that the
   production assignment service mishandled that error. The override now uses
   the application's connected async database. It verifies that request/team
   writes occur inside the transaction, that the injected insert failure is
   actually reached, and that HTTP `503 database_unavailable` is returned with
   every tentative write rolled back. Production assignment handling was not
   changed or weakened.
3. Offline fixtures now include the linked request and reserved team rather
   than an orphan mission. Existing event-failure rollback coverage checks
   these linked records too.

Jared's original owned paths remain the acceptance test and this document.
Ranee's review adds the narrowly related mission repository/service repair,
offline fixture compatibility, and contract/presentation guidance updates.
No UI, trained model, dependencies, or deployment configuration are changed.

## Verified acceptance

| Check | Observed result |
|---|---|
| Invalid input / missing or prohibited demo role | 422/403; no request inserted |
| Request creation and atomic assignment | Request pending -> assigned; one mission; team reserved |
| Mission/request progression | assigned -> en-route -> arrived -> completed; ordered request history |
| Team state | assigned -> en-route -> on-scene -> available; assignment links cleared |
| Completion | Mission version 4; request/team version 5; server completion time |
| Immutable events and offline source | Three events; first event unchanged; offline-sync source retained |
| Duplicate assignment, stale version, invalid transition, wrong actor | Conflict/denial; no extra event or linked write |
| Same-ID retry / changed-body reuse | One committed transition / 409 duplicate_event |
| Reassigned original actor | 403; linked records unchanged |
| Broken request or team link | 409 lifecycle_conflict; mission/request/team/history rollback |
| Assignment dependency failure | Injected PyMongoError reached; safe 503 envelope; request/team/mission rollback |
| OpenAPI and CORS | Required paths/error schema; local configured origin allowed, unlisted origin blocked |
| Real startup | Production FastAPI lifespan; indexes and synthetic teams initialized |

## Local verification results

- Ruff, backend and cross-component integration paths: **passed**.
- Default backend/cross-component suite: **187 passed, 23 skipped**.
- Focused Phase 5 API/database suite: **7 passed, no skips**.
- Existing real-MongoDB offline suite: **15 passed, no skips**.
- Existing real-MongoDB assignment suite: **2 passed, no skips**.
- Database cleanup: no `resqph_issue*` databases remain on the task-only server.

The 23 default skips are the separately gated MongoDB cases: 6 new Phase 5,
15 offline, and 2 assignment. Each suite was run separately with its required
database prefix; do not describe default CI alone as real-database acceptance.
Two existing dependency deprecation warnings concern Starlette/httpx and the
AnyIO BlockingPortal alias. They do not indicate test failures.

Environment: Python 3.12 in the reusable audit virtual environment; native
MongoDB **8.3.7**, task-only port **27032**, single-node replica set
`resqph_pr80`. This run verifies real transaction behavior, not the Docker
image/startup procedure. Runtime ML remains disabled; all data are synthetic.

## Repeatable PowerShell checks

From the repository's `backend` directory, use a Python 3.12 virtual environment
installed from `requirements.txt` and `requirements-dev.txt`:

```powershell
$python = '.\.venv\Scripts\python.exe'
$env:PYTHONPATH = "$PWD;$PWD\..\routing\src"
Remove-Item Env:RUN_MONGODB_INTEGRATION -ErrorAction SilentlyContinue
& $python -m ruff check app tests ..\tests\integration
& $python -m pytest tests ..\tests\integration -q
```

For the task-only replica set (substitute your verified local replica-set URI):

```powershell
$env:RUN_MONGODB_INTEGRATION = '1'
$env:MONGODB_INTEGRATION_URI = 'mongodb://127.0.0.1:27032/?replicaSet=resqph_pr80'
$env:MONGODB_INTEGRATION_DATABASE = 'resqph_issue73_backend_your_unique_run'
& $python -m pytest tests/test_phase5_acceptance.py -q

$env:MONGODB_INTEGRATION_DATABASE = 'resqph_issue62_offline_your_unique_run'
& $python -m pytest tests/test_offline_sync_mongodb.py -q

$env:MONGODB_INTEGRATION_DATABASE = 'resqph_issue15_api_test_your_unique_run'
$env:MONGODB_URI = $env:MONGODB_INTEGRATION_URI
$env:MONGODB_DATABASE = $env:MONGODB_INTEGRATION_DATABASE
& $python -m pytest tests/test_assignment_mongodb.py -q
```

The Phase 5 fixture requires explicit settings, a replica set, and a fresh
database named `resqph_issue73_backend_[A-Za-z0-9_]+`. It refuses existing
databases and drops only the database it owns. Never point it at an operational
or shared database. The local review used
`..\..\repo-audit\.venv-backend-audit\Scripts\python.exe` instead of `$python`.
After checks, remove the five test-only environment variables above before
starting a normal development backend. Reset/rollback means stopping the test
process and discarding only its owned disposable database, not deleting project
records or MongoDB volumes. Code rollback should use a reviewed revert PR.

## Acceptance boundary

This evidence supports the backend package, not final MVP acceptance. A fresh
browser request must still follow the same identity/request/team/mission/route
across roles, including cache reload/replay and UI state acknowledgement.
Remaining frontend and overall integration findings under #76 and #82–#84
are not resolved by these API tests. #83's backend progression/team release
subtask is covered here; its remaining UI surfaces still require verification.
Mission error responses are handled at runtime, but their full OpenAPI response
model documentation remains an optional follow-up. No production authentication,
live flood accuracy, real emergency readiness, or runtime ML acceptance is claimed.
