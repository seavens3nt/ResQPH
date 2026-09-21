# ResQPH project status

**Last updated:** 2026-09-22

| Field | Current value |
|---|---|
| Current phase | Project Foundation Phase 2 — Core Application |
| Current sprint | Foundation Phase 2 — ready to start |
| Overall health | Foundation is merged and verified; implementation remains early and must follow the time-constrained priority order |
| Current goal | Build one persistent rescue-request-to-mission vertical slice before optional enrichment. |

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

## Immediate next actions

1. Create Project Foundation Phase 2 work packages from the locked API, schema, lifecycle, UI, and test contracts.
2. Implement one sanitized rescue request through coordinator assignment and rescuer status update.
3. Connect the core lifecycle to MongoDB and add conflict/transaction tests.
4. Replace remaining prototype-only mocks only when their backing API is ready; do not widen scope.
5. Keep Team Phases 1–5 planned until Ranee accepts the active gate.

## Project administration notes

- The Phase 1 completion date is 2026-09-22; its start date was not recorded.
- Future phase dates must be set when Ranee has the actual course deadline and team availability; no date is invented in this foundation.
- GitHub Issues, pull requests, and milestones are the current ticketing source of truth. A GitHub Project board is optional and not required for Phase 1 completion.

## Active blockers

No foundation decision blocks Phase 2. The exact course deadline and member availability are still not recorded, so the roadmap uses dependency and priority gates rather than invented calendar dates.

## Major risks

- Public datasets may be stale, incomplete, incompatible, or redistribution-restricted.
- The prototype can become too broad if authentication, prediction, nationwide coverage, or external-agency integration enters the MVP.
- Frontend, backend, routing, and ML can diverge without early contract approval.
- ML labels may be insufficient; the rule-based fallback must remain demonstrable.
- Offline synchronization and changing route conditions create conflict and stale-data risks.
- Existing frontend behavior is largely prototype/local state; UI completeness must not be reported as backend integration.

## Latest demonstration

Phase 1 foundation: the project can trace the sanitized rescue lifecycle through UI states, API/domain/schema behavior, controlled hazard joining, deterministic routing expectations, ML/fallback boundaries, offline behavior, and acceptance evidence. Runtime feature implementation remains assigned to later phases.

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
- [Phase 1 gate](phases/PHASE-01-GATE.md)
- [Phase 1 evidence](testing/PHASE-01-EVIDENCE.md)
- [Sprint 01](sprints/SPRINT-01.md)
