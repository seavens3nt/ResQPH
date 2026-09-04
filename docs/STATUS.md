# ResQPH project status

**Last updated:** 2026-09-05

| Field | Current value |
|---|---|
| Current phase | Phase 1 — Requirements and Data Validation |
| Current sprint | Sprint 01 — planned; dates TBD |
| Overall health | Green for repository readiness; Amber for unresolved scope/data decisions |
| Current goal | Approve the MVP, study area, data feasibility, workflows, contracts, and fallbacks before feature implementation. |

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

## Work in progress

- Phase 1 planning and team approval.
- No application feature is considered complete based on the current repository evidence.

## Immediate next actions

1. Review and approve the Phase 1 guide with all five members.
2. Decide the exact study-area boundary and MVP authentication requirement.
3. Convert approved Phase 1 candidate work into small GitHub Issues.
4. Add Issues to the GitHub Project and select the Sprint 01 scope.
5. Begin workflows, wireframes, contracts, and dataset validation in parallel where dependencies allow.

## Decisions needed

| Decision | Owner | Needed by |
|---|---|---|
| Exact Metro Manila study-area boundary | Ranee with Clarence | TBD |
| Coordinator versus dispatcher terminology | Ranee with Elle and Jared | TBD |
| Authentication required for the prototype or deferred | Ranee with Jared | TBD |
| Approved road, flood, elevation, and boundary datasets | Clarence with Matthew | TBD |
| Phase/sprint schedule and final deadline | Ranee with team/instructor | TBD |
| GitHub Project URL and Sprint 01 milestone | Ranee | TBD |

## Active blockers

No confirmed technical blocker is recorded. Study-area, dataset, and scheduling decisions remain open and may block later implementation.

## Major risks

- Public datasets may be stale, incomplete, incompatible, or redistribution-restricted.
- The prototype can become too broad if authentication, prediction, nationwide coverage, or external-agency integration enters the MVP.
- Frontend, backend, routing, and ML can diverge without early contract approval.
- ML labels may be insufficient; the rule-based fallback must remain demonstrable.
- Offline synchronization and changing route conditions create conflict and stale-data risks.

## Latest demonstration

Development foundation: the frontend and backend scaffolds run locally, the API health check is testable, and MongoDB runs through Docker Compose. The Phase 1 artifact demonstration is pending.

## Links

- GitHub Project: **To be added**
- Milestones: [GitHub milestones](https://github.com/seavens3nt/ResQPH/milestones)
- Issues: [GitHub Issues](https://github.com/seavens3nt/ResQPH/issues)
- Pull requests: [GitHub pull requests](https://github.com/seavens3nt/ResQPH/pulls)
- CI: [GitHub Actions](https://github.com/seavens3nt/ResQPH/actions)
- [Dashboard](DASHBOARD.md)
- [Roadmap](ROADMAP.md)
- [Phase 1 guide](phases/PHASE-01.md)
- [Sprint 01](sprints/SPRINT-01.md)
