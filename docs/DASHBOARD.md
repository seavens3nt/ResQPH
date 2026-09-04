# ResQPH project dashboard

**Last updated:** 2026-09-05
**Source of truth for ticket status:** GitHub Issues and the GitHub Project

| Current phase | Current sprint | Health | Current goal |
|---|---|---|---|
| Phase 1 — Requirements and Data Validation | Sprint 01 planned; dates TBD | Green: setup; Amber: decisions/data | Approve scope, study area, workflows, data feasibility, contracts, and fallbacks. |

## Immediate next actions

1. Team-review [Phase 1](phases/PHASE-01.md).
2. Approve the study area, MVP boundaries, terminology, and authentication decision.
3. Convert approved candidate work into GitHub Issues and select the Sprint 01 scope.
4. Begin reviewed workflow, wireframe, contract, and data-validation artifacts.

## Blockers and risks

| Type | Item | Status/response |
|---|---|---|
| Blocker | No confirmed blocker | Monitor open Phase 1 decisions. |
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
| Matthew Trinitaria (`@matthew-sudo2`) | AI/ML and data evaluation | Data validation and routing |
| Clarence (`@ClarenceArillo`) | Geospatial data and routing | UI/UX |

## Phase progress

| Phase | Status | Exit focus |
|---|---|---|
| 1 — Requirements and Data Validation | Ready to begin | Approved MVP, workflows, study area, datasets, schema, contracts, and fallback |
| 2 — Core Application | Not started | Complete testable rescue-request and mission lifecycle |
| 3 — Mapping and Geospatial Pipeline | Not started | Reproducible map/data pipeline for the study area |
| 4 — Routing | Not started | Deterministic then flood-aware explainable routing |
| 5 — AI/ML | Not started | Evaluated model or documented fallback-only decision |
| 6 — Offline Simulation | Not started | Cached mission and validated queued synchronization |
| 7 — Integration and Testing | Not started | Demonstrable end-to-end scenarios and documented limitations |

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
