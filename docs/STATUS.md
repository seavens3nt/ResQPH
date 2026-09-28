# ResQPH project status

**Last updated:** 2026-09-29

| Field | Current value |
|---|---|
| Current phase | Project Foundation Phase 2 — gate verified; Team Phase 1 opens after the gate record merges |
| Current sprint | Foundation Phase 2 — closeout |
| Overall health | Core request-to-mission lifecycle is merged and verified; routing, mapping, model packaging, and offline persistence remain later-phase work |
| Current goal | Merge the Phase 2 gate record, then open Team Phase 1 mapping/geospatial work without widening scope. |

## Completed setup

- [x] Repository foundation and contribution workflow
- [x] Frontend, backend, routing, ML, data, docs, and integration-test structure
- [x] React/TypeScript/Vite frontend scaffold
- [x] FastAPI backend health endpoint and tests
- [x] Docker Compose MongoDB 8 single-node replica-set setup
- [x] Local development environment confirmed working
- [x] GitHub templates and CI workflow
- [x] Team responsibilities documented
- [x] Project-management, phase, sprint, status, and editor documentation prepared on the current branch

## Completed and verified foundation

- U-Belt scope, boundary, source/fallback decisions, role simulation, ownership, and exclusions.
- Lifecycle, API, MongoDB, routing, ML, offline, UI-state, accessibility, testing, and acceptance contracts.
- Reproducible OSM feasibility evidence, controlled flood and stable-join fixture, known routing graph, ML schema, and role wireframes.
- Final Phase 1 decision log, risk register, evidence record, roadmap, and gate approval.
- No later application feature is considered complete merely because its foundation is locked.

## Completed and verified core application

- PR #24: request validation, persistence, study-area enforcement, atomic assignment, rollback/conflict handling, and MongoDB integration coverage.
- PR #21: mission visibility, ordered status transitions, idempotent history events, optimistic version checks, and role enforcement.
- PR #22: citizen submission and authoritative request-status UI.
- PR #23: coordinator queue/assignment and rescuer mission/status UI aligned to the backend contract.
- Backend Ruff/Pytest, frontend lint/tests/build, both GitHub checks, and a sanitized full API flow against a real MongoDB replica set passed on 2026-09-29.
- The real-MongoDB gate flow succeeds with `latest_route_result = null`, proving routing and ML are not required for the core lifecycle.

## Immediate next actions

1. Merge the Foundation Phase 2 gate record and evidence.
2. Open Team Phase 1 for the bounded U-Belt OSM/geospatial pipeline.
3. Preserve the stable `edge_id` join contract and controlled-scenario labels.
4. Package Matthew's completed XGBoost experiment for independent repository review; do not claim its reported metrics as verified yet.
5. Keep rule-based risk available and keep runtime model use optional until Ranee accepts the evidence package.

## Project administration notes

- The Phase 1 completion date is 2026-09-22; its start date was not recorded.
- Future phase dates must be set when Ranee has the actual course deadline and team availability; no date is invented in this foundation.
- GitHub Issues, pull requests, and milestones are the current ticketing source of truth. A GitHub Project board is optional and not required for Phase 1 completion.

## Active blockers

No technical blocker remains for the Foundation Phase 2 gate. Team Phase 1 must not claim the externally trained XGBoost artifact or reported metrics as repository-verified until provenance, split, schema, artifact metadata, and reproducible evaluation evidence are reviewed. The exact course deadline and member availability are still not recorded, so the roadmap uses dependency and priority gates rather than invented calendar dates.

## Major risks

- Public datasets may be stale, incomplete, incompatible, or redistribution-restricted.
- The prototype can become too broad if authentication, prediction, nationwide coverage, or external-agency integration enters the MVP.
- Frontend, backend, routing, and ML can diverge without early contract approval.
- ML labels may be insufficient; the rule-based fallback must remain demonstrable.
- Offline synchronization and changing route conditions create conflict and stale-data risks.
- Existing frontend behavior is largely prototype/local state; UI completeness must not be reported as backend integration.

## Latest demonstration

Foundation Phase 2: a sanitized citizen request is persisted, listed for a coordinator, atomically assigned, retrieved by the assigned rescuer, and advanced to `en-route` against a real MongoDB replica set. Role, validation, duplicate/conflict, rollback, and lifecycle tests pass. Mapping, routing, model integration, and persistent offline behavior remain later-phase deliverables.

## Links

- GitHub Project: **To be added**
- Milestones: [GitHub milestones](https://github.com/seavens3nt/ResQPH/milestones)
- Issues: [GitHub Issues](https://github.com/seavens3nt/ResQPH/issues)
- Pull requests: [GitHub pull requests](https://github.com/seavens3nt/ResQPH/pulls)
- CI: [GitHub Actions](https://github.com/seavens3nt/ResQPH/actions)
- [Dashboard](DASHBOARD.md)
- [Roadmap](ROADMAP.md)
- [Phase 1 guide](phases/PHASE-01.md)
- [Phase 2 guide](phases/PHASE-02.md)
- [Team Phase 1 guide](phases/TEAM-PHASE-01.md)
- [Phase 1 gate](phases/PHASE-01-GATE.md)
- [Phase 2 gate](phases/PHASE-02-GATE.md)
- [Phase 1 evidence](testing/PHASE-01-EVIDENCE.md)
- [Phase 2 evidence](testing/PHASE-02-EVIDENCE.md)
- [Sprint 01](sprints/SPRINT-01.md)
