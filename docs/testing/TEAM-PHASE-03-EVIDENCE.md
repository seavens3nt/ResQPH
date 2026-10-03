# Team Phase 3 verification evidence

## 2026-10-04 post-routing reconciliation — Issue #57

The reconciliation is completed and verified through merged PR #58 at `8f2a7ea`.

- Backend and cross-component suites: **121 passed, 2 MongoDB-environment skips**.
- Ruff across backend and integration tests: passed.
- Isolated Ondoy experiment: **21 passed**.
- All five SHA-256 manifest entries match the committed files.
- Four new cross-component cases cover disabled ML, a missing artifact,
  checksum rejection, and the actual committed incompatible Ondoy metadata.
- Every case prevents model deserialization, preserves the same route with ML
  requested or omitted, reports zero ML cost and no runtime model version,
  and preserves explicit no-route without geometry.
- CI now runs the complete integration-test directory on every PR.

The route API deliberately does not consume the inference adapter yet. These
checks prove its isolation from rejected ML and the adapter's rejection before
deserialization; they do not establish accepted-model routing or new accuracy.
`ML_ENABLED=false` remains the example/default. The two skipped tests require
a MongoDB replica-set environment and are unrelated to this reconciliation.
PR #58 and post-merge main CI passed all frontend, backend and ML evidence jobs.
Issue #57 is closed; Ranee approved the final Phase 3 closeout on 2026-10-04.

**Status:** Completed and verified with conditions

**Evidence date:** 2026-09-29

**Owner:** Matthew
**Verification performed by:** Codex for Ranee's review

## Local results

| Area | Command | Result |
|---|---|---|
| Frontend lint | `npm run lint` from `frontend/` | Passed with 5 non-blocking warnings |
| Frontend tests | `npm test -- --run` from `frontend/` | 98 passed |
| Frontend build | `npm run build` from `frontend/` | Passed |
| Backend lint | `python -m ruff check app tests` from `backend/` | Passed |
| Backend tests | `python -m pytest` from `backend/` | 44 passed, 2 MongoDB tests skipped |
| External ML tests | `python -m pytest` from the Ondoy experiment directory | 21 passed |
| Artifact manifest | SHA-256 recalculation for all five listed files | All matched |

## Defects corrected

- Prevented the seven-value external feature vector from being mistaken for
  the differently defined U-Belt runtime vector.
- Added checksum and metadata validation before deserialization.
- Corrected the surrogate test and metadata to Random Forest rather than
  XGBoost.
- Rebuilt the stale checksum manifest.
- Added missing experiment setup/reproduction documentation.
- Reclassified the random-row evaluation as exploratory rather than
  leakage-safe.
- Recorded precision, confusion counts, false positives, and false negatives.
- Moved the backend adapter from `services/` to the architectural
  `integrations/` boundary.
- Added stable fallback reasons and fixed model identity after prediction
  failure.
- Added ML environment variables to `backend/.env.example` with ML disabled.
- Added a dedicated ML evidence CI job.

## Evidence boundary

The tests establish package integrity, executable code, stable contracts, and
safe fallback behavior. They do not reproduce training from raw data and do not
validate U-Belt predictive accuracy. The runtime classifier remains disabled.

## Merge gate

[PR #31](https://github.com/seavens3nt/ResQPH/pull/31) passed its frontend,
backend, and ML evidence checks on 2026-09-29. This evidence becomes
`Completed and verified with conditions` because Ranee reviewed and merged the
pull request, verified `main`, and recorded the gate decision in closed
[Issue #37](https://github.com/seavens3nt/ResQPH/issues/37). Runtime integration
remains deferred.
