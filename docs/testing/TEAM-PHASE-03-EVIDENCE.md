# Team Phase 3 verification evidence

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
