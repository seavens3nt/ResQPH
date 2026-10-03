# Team Phase 2 verification evidence

**Status:** Completed and verified

**Evidence date:** 2026-10-04

**Gate owner:** Ranee

## Accepted delivery

| Package | Accepted pull request |
|---|---|
| Backend routing boundary | PR #50 |
| Route client and map overlay | PR #51 |
| Deterministic routing engine | PR #52 |
| Accessible route presentation | PR #53 |
| Engine-to-API-to-UI integration | PR #55 |

## Verification results

| Area | Result |
|---|---|
| Routing Ruff | Passed |
| Routing tests | 136 passed |
| Backend Ruff | Passed |
| Backend tests | 115 passed; 2 environment-gated MongoDB tests skipped |
| Cross-layer route acceptance | 2 passed |
| Frontend lint | Completed with 4 pre-existing non-blocking warnings |
| Frontend tests | 183 passed |
| Frontend production build | Passed with a non-blocking bundle-size advisory |
| Production dependency audit | 0 vulnerabilities |
| JSON/GeoJSON fixtures | 10 parsed successfully |
| GitHub CI on PR #55 | Frontend, backend, and ML evidence jobs passed |

## Behaviors verified

- The accepted A* package returns the same result for identical controlled inputs.
- Deterministic flood penalties and impassable-edge exclusion affect the selected path.
- The route API returns server-produced geometry, costs, explanations, warnings,
  scenario time, and stable no-route responses.
- The coordinator UI requests the controlled route, renders route/no-route/error
  states, and passes only returned geometry to the map overlay.
- No-route responses contain no substitute geometry.
- Runtime ML contributes zero route cost, exposes no model version, and clearly
  reports deterministic fallback.

## Evidence limits

- The data and route are controlled academic fixtures, not live navigation.
- The two skipped backend tests require the optional MongoDB integration environment;
  their existing unit/service coverage remains green.
- Automated component and contract checks passed. A separate browser screenshot or
  human visual-acceptance record was not produced for this gate.
- The external Ondoy model remains incompatible with the U-Belt runtime contract and
  was not enabled.
