# ResQPH project status

**Last updated:** 2026-10-03

| Field | Current value |
|---|---|
| Active delivery phase | Team Phase 2 — Flood-Aware Routing |
| Overall health | On track within the constrained MVP |
| Current goal | Complete deterministic A*, route API integration, and truthful accessible route presentation with runtime ML disabled |

## Completed and verified

- Project Foundation Phases 1 and 2, including the persistent request,
  assignment, mission, role, and status workflow.
- Team Phase 1 bounded U-Belt pipeline: 912 nodes, 2,168 directed edges,
  stable identifiers, controlled flood join, metadata, and reproducible fixtures.
- Authoritative backend geospatial loading and frontend 30-edge/10-record map consumption.
- Accessible map legend, notices, layer summary, failure states, and text alternative.
- Team Phase 3 external XGBoost evidence accepted with runtime integration deferred.

## Active work

### Team Phase 2 — Flood-Aware Routing

- Matthew: deterministic A*, rule costs, exclusions, known-graph tests, and explanations.
- Jared: validated backend routing endpoint and adapter.
- Ranee: phase gate plus Elle's temporarily reassigned route client/map-overlay package.
- Clarence: accessible route result, fallback, warning, and no-route presentation.

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
| Routing | Ruff passed; 59 tests passed |
| Backend | Ruff passed; 73 tests passed; 2 MongoDB integration tests skipped |
| Frontend | Lint passed with 4 pre-existing warnings; 155 tests passed; production build passed |
| Fixtures | 10 JSON/GeoJSON files parsed |
| Team Phase 1 gate | Approved |

## Links

- [Dashboard](DASHBOARD.md)
- [Roadmap](ROADMAP.md)
- [Team Phase 1 gate](phases/TEAM-PHASE-01-GATE.md)
- [Team Phase 1 evidence](testing/TEAM-PHASE-01-EVIDENCE.md)
- [Team Phase 2 guide](phases/TEAM-PHASE-02.md)
- [GitHub Issues](https://github.com/seavens3nt/ResQPH/issues)
- [GitHub Actions](https://github.com/seavens3nt/ResQPH/actions)
