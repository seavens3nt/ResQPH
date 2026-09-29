# ResQPH project dashboard

**Last updated:** 2026-09-29
**Decision owner:** Ranee

| Active delivery phase | Parallel review | Health | Current goal |
|---|---|---|---|
| Team 1 — Mapping and Geospatial Pipeline | Team 3 — AI/ML package ready for review | At risk | Merge the evidence repair without enabling the external model, then complete the U-Belt graph pipeline |

## Phase progress

| Phase | Status | Gate focus |
|---|---|---|
| Project Foundation 1 | Completed and verified | Scope, contracts, fixtures, and evidence |
| Project Foundation 2 | Completed and verified | Persistent request-to-mission workflow |
| Team 1 — Mapping and Geospatial | In progress | Reproducible bounded graph, stable IDs, controlled flood join |
| Team 2 — Flood-Aware Routing | Planned | Deterministic A*, penalties, exclusions, explanations |
| Team 3 — AI/ML | Ready for review | External evidence accepted; runtime integration deferred |
| Team 4 — Limited Offline | Planned | One cached mission and one queued update |
| Team 5 — Integration and Presentation | Planned | Verified end-to-end demo and reconciled academic outputs |

## Evidence snapshot

| Area | Result | Interpretation |
|---|---|---|
| Frontend lint | Passed with 5 warnings | No lint errors; warnings are recorded technical debt outside this ML repair |
| Frontend tests | 98 passed | Existing interface regression suite is green |
| Frontend build | Passed | TypeScript and Vite production build succeeded |
| Backend Ruff | Passed | Core and adapter style checks clean |
| Backend Pytest | 44 passed, 2 skipped | Adapter gates and fallback verified; skipped tests are MongoDB integration cases |
| External ML Pytest | 21 passed | Package, artifacts, checksums, ETL smoke, and models load consistently |
| ML runtime | Disabled | External model is not contract-compatible |
| Mapping | Not yet gate-verified | Active critical-path work |
| Routing | Not yet started | Blocked by accepted graph/schema |

## Ownership now

| Owner | Work | Status |
|---|---|---|
| Ranee | Phase 3 review, backend boundary, status and gate decision | Ready for review |
| Matthew | External ML evidence; Team 1 graph/flood pipeline | ML ready for review; mapping in progress |
| Jared | Team 1 backend fixture loader | Ready to start from accepted schema |
| Elle | Map UI and controlled-scenario states | Ready to start from accepted fixture |
| Clarence | Map presentation, accessibility, and error states | Ready to start from accepted fixture |

## Immediate actions

1. Open the Phase 3 readiness pull request and require frontend, backend, and
   ML evidence checks.
2. Keep `ML_ENABLED=false`; do not add XGBoost to core backend requirements.
3. Continue Team Phase 1 without expanding to routing or offline work.

## Navigation

- [Current status](STATUS.md)
- [Roadmap](ROADMAP.md)
- [Phase guides](phases/README.md)
- [Architecture](ARCHITECTURE.md)
- [Team responsibilities](TEAM.md)
- [Development setup](SETUP.md)
- [Contribution rules](../CONTRIBUTING.md)
