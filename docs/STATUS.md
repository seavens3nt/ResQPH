# ResQPH project status

**Last updated:** 2026-10-04

| Field | Current value |
|---|---|
| Active delivery phase | Team Phase 3 — Ranee-only post-routing reconciliation |
| Overall health | On track within the constrained MVP |
| Current goal | Reconfirm the accepted ML evidence against the completed routing path without enabling the incompatible artifact |

## Completed and verified

- Project Foundation Phases 1 and 2, including the persistent request,
  assignment, mission, role, and status workflow.
- Team Phase 1 bounded U-Belt pipeline: 912 nodes, 2,168 directed edges,
  stable identifiers, controlled flood join, metadata, and reproducible fixtures.
- Authoritative backend geospatial loading and frontend 30-edge/10-record map consumption.
- Accessible map legend, notices, layer summary, failure states, and text alternative.
- Team Phase 3 external XGBoost evidence accepted with runtime integration deferred.
- Team Phase 2 deterministic A* route engine, backend boundary, route client,
  accessible presentation, map overlay, explicit no-route behavior, and disabled-ML fallback.

## Active work

### Team Phase 3 — Ranee-only reconciliation

- The academic ML package and conditional gate were already accepted through PR #31 and Issue #37.
- Ranee's Issue #57 reconciliation is ready for review: four ML artifact states preserve deterministic routes and explicit no-route; the evidence is recorded and PR merge remains pending.
- No other member receives a Team Phase 3 package unless Ranee changes this decision.

## Locked constraints

- A* and deterministic rules must work without a trained model.
- Severe or impassable edges are excluded before search.
- No-route must remain explicit from engine through UI; no invented substitute path.
- Runtime ML stays disabled and contributes zero route cost.
- Only the U-Belt pilot and controlled/historical scenarios are in scope.
- Exact course deadline and weekly availability remain unrecorded; no dates are invented.

## Latest verification

| Area | Result |
|---|---|
| Routing | Ruff passed; 136 tests passed |
| Backend | Ruff passed; 115 tests passed; 2 MongoDB integration tests skipped |
| Cross-layer route and ML fallback acceptance | 6 tests passed; backend plus integration total: 121 passed, 2 skipped |
| External ML experiment | 21 passed; all 5 manifest digests matched |
| Frontend | Lint completed with 4 pre-existing warnings; 183 tests passed; production build passed |
| Fixtures | 10 JSON/GeoJSON files parsed |
| Production dependency audit | 0 vulnerabilities |
| Team Phase 2 gate | Approved |

## Links

- [Dashboard](DASHBOARD.md)
- [Roadmap](ROADMAP.md)
- [Team Phase 1 gate](phases/TEAM-PHASE-01-GATE.md)
- [Team Phase 1 evidence](testing/TEAM-PHASE-01-EVIDENCE.md)
- [Team Phase 2 guide](phases/TEAM-PHASE-02.md)
- [Team Phase 2 gate](phases/TEAM-PHASE-02-GATE.md)
- [GitHub Issues](https://github.com/seavens3nt/ResQPH/issues)
- [GitHub Actions](https://github.com/seavens3nt/ResQPH/actions)
