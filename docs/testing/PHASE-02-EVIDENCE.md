# Foundation Phase 2 verification evidence

**Verified:** 2026-09-29

**Baseline:** `21a779d` plus the gate-test extension on `chore/19-phase-2-gate`

**Data policy:** synthetic or sanitized records only

## What was verified

The opt-in FastAPI/MongoDB integration test now covers:

- citizen request creation;
- coordinator pending-queue retrieval;
- atomic team assignment;
- authoritative citizen request retrieval;
- assigned-rescuer mission retrieval;
- one valid `assigned -> en-route` status event;
- persisted mission version and status-history evidence; and
- successful operation with `latest_route_result = null`.

The remaining automated suites cover outside-boundary input, invalid roles, invalid/skipped/backward transitions, stale versions, duplicate assignments and events, transactional rollback, loading/empty/error UI states, API contract behavior, and non-production notices.

## Reproducible backend commands

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

For the full opt-in database run, start a disposable MongoDB 8 single-node replica set on local port `27018`, initialize replica set `rs0`, and run:

```powershell
$env:RUN_MONGODB_INTEGRATION = "1"
$env:MONGODB_INTEGRATION_URI = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true"
$env:MONGODB_INTEGRATION_DATABASE = "resqph_issue15_api_test_phase2_gate"
$env:MONGODB_URI = $env:MONGODB_INTEGRATION_URI
$env:MONGODB_DATABASE = $env:MONGODB_INTEGRATION_DATABASE
.\.venv\Scripts\python.exe -m pytest
```

Expected result for the verified baseline: `35 passed`.

## Reproducible frontend commands

From `frontend`:

```powershell
npm ci
npm run lint
npm test -- --run
npm run build
```

Verified result: `8` test files and `98` tests passed; the production build passed. Lint completed with five existing warnings and no errors. The large-chunk advisory is a later optimization item, not a Phase 2 correctness blocker.

## ML evidence boundary

Matthew reports that the completed Ondoy 2009 XGBoost model achieved ROC-AUC `0.97` and recall `0.92` and produced a smaller artifact than Random Forest. This record deliberately labels those values as **not independently verified**. Team Phase 3 must import or reference the immutable artifact and supply dataset provenance, feature/target schema, leakage-safe split evidence, environment versions, checksums, reproducible metrics, error analysis, and fallback tests before runtime integration is accepted.

**Later review note (2026-09-29):** Team Phase 3 imported and tested the
package, but the preserved evaluation used a random row split and the external
target/features do not match the U-Belt runtime contract. The experiment is
accepted as exploratory evidence; runtime integration remains deferred. See
[`TEAM-PHASE-03-EVIDENCE.md`](TEAM-PHASE-03-EVIDENCE.md).

## Gate interpretation

These results support `Approve` for Foundation Phase 2. They do not verify the mapping pipeline, A* routing, model artifact, model-to-routing adapter, or persistent offline queue; those remain explicit later-phase gates.
