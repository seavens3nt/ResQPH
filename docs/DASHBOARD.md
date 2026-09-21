# ResQPH project dashboard

**Last updated:** 2026-09-22
**Source of truth for ticket status:** GitHub Issues and the GitHub Project

| Current phase | Current sprint | Health | Current goal |
|---|---|---|---|
| Project Foundation Phase 1 — Requirements and Data Validation | Ready for review; Approve with conditions | On track: Core Application; At risk: data/routing/ML/UI evidence | Merge the U-Belt scope and contract baseline, then open eligible Core Application work. |

## Immediate next actions

1. Review and merge the Phase 1 documentation PR after material corrections.
2. Prepare Foundation Phase 2 work packages using basic role simulation.
3. Reproduce the approved U-Belt road extraction and validate flood-data access/join feasibility.
4. Review low-fidelity workflows/wireframes against the UI-state contract.
5. Keep routing-weight approval and ML training behind their recorded evidence conditions.

## Blockers and risks

| Type | Item | Status/response |
|---|---|---|
| Blocker | No confirmed blocker for eligible Core Application preparation | Keep flood-data integration, routing acceptance, and model training behind the gate conditions. |
| Risk | Study area or datasets may be unsuitable | Validate coverage, CRS, resolution, age, and license before implementation. |
| Risk | Scope expansion | Enforce the approved MVP and non-goals. |
| Risk | Component contract mismatch | Review API, schema, route, and ML interfaces together. |
| Risk | Insufficient ML evidence | Use the mandatory rule-based fallback. |
| Risk | Stale/offline information | Display data age and validate queued changes after reconnection. |

## Team ownership

| Member | Primary ownership | Support |
|---|---|---|
| Ranee (`@seavens3nt`) | Project management and backend | AI/ML and UI/UX |
| Jared Noel (`@AshenDary`) | Secondary backend and integration | AI/ML |
| Elle (`@Qiuyuan26`) | UI/UX and frontend | Testing and documentation |
| Matthew Trinitaria (`@matthew-sudo2`) | AI/ML, data evaluation, geospatial pipeline, and routing | Jared supports backend integration |
| Clarence (`@ClarenceArillo`) | UI/UX and frontend | Testing and map-interface presentation |

## Phase progress

| Phase | Status | Exit focus |
|---|---|---|
| Project Foundation 1 — Requirements and Data Validation | Ready for review — Approve with conditions | Merge approved decisions and track unverified evidence conditions |
| Project Foundation 2 — Core Application | Planned | Complete persistent rescue-request and mission lifecycle |
| Team 1 — Mapping and Geospatial Pipeline | Planned | Reproducible map/data pipeline for the study area |
| Team 2 — Flood-Aware Routing | Planned | Deterministic flood-aware explainable routing |
| Team 3 — AI/ML Road-Risk Component | Planned | Evaluated Logistic Regression and Random Forest experiment plus fallback |
| Team 4 — Limited Offline Support | Planned | Cached mission and one validated queued update |
| Team 5 — Integration, Testing, and Presentation | Planned | Verified end-to-end scenarios and reconciled deliverables |

## GitHub workspace

- GitHub Project: **To be added**
- [Milestones](https://github.com/seavens3nt/ResQPH/milestones)
- [Issues](https://github.com/seavens3nt/ResQPH/issues)
- [Pull requests](https://github.com/seavens3nt/ResQPH/pulls)
- [CI](https://github.com/seavens3nt/ResQPH/actions)

Recommended workflow: `Backlog -> Ready -> In Progress -> In Review -> Blocked -> Done`

Recommended fields: Phase, Sprint, Area, Priority, Owner, Support, Effort, and Status.

## Working documents

- [Project context](PROJECT_CONTEXT.md)
- [Roadmap](ROADMAP.md)
- [Current status](STATUS.md)
- [Phase guides](phases/README.md)
- [Phase 1 guide](phases/PHASE-01.md)
- [Sprint process](sprints/README.md)
- [Sprint 01](sprints/SPRINT-01.md)
- [Development setup](SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Team responsibilities](TEAM.md)
- [Contribution workflow](../CONTRIBUTING.md)

## Update routine

Ranee updates this page and `STATUS.md` after sprint planning, major decisions, demonstrations, or material blocker changes. Individual ticket progress belongs in GitHub rather than being duplicated here.
