# ResQPH project status

**Last updated:** 2026-09-22

| Field | Current value |
|---|---|
| Current phase | Project Foundation Phase 1 — Ready for review |
| Current sprint | Foundation Phase 1 — gate decision: Approve with conditions; dates TBD |
| Overall health | On track for Core Application; At risk for unverified flood-data, routing, ML-label, UI-evidence, and review conditions |
| Current goal | Merge the approved U-Belt scope and contract baseline, then open only eligible Core Application work. |

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

## Ready for review

- Phase 1 scope, decision, lifecycle, acceptance, and contract artifacts.
- U-Belt boundary, basic role simulation, and Matthew's geospatial/routing ownership are decided.
- The gate is `Approve with conditions`; dataset feasibility and affected-member review remain under validation.
- No application feature is considered complete based on the current repository evidence.

## Immediate next actions

1. Review and merge the Phase 1 documentation PR after affected-member comments are addressed.
2. Prepare Project Foundation Phase 2 work packages against the approved API, schema, workflow, and basic role-simulation baseline.
3. Validate candidate flood-data access, coverage, CRS, restrictions, and sample compatibility.
4. Reproduce the U-Belt OSM extraction and road-edge fixture before Team Phase 1 acceptance.
5. Keep ML training and final routing weights blocked until their evidence conditions pass.

## Decisions needed

| Decision | Owner | Needed by |
|---|---|---|
| Approved flood/elevation sources or explicit synthetic fallback | Matthew; Ranee decides | Before hazard-data integration |
| Final rule penalties and ML target/labels | Matthew; Ranee approves | Before routing acceptance/model training |
| Phase/sprint schedule and final deadline | Ranee with team/instructor | TBD |
| GitHub Project URL and Sprint 01 milestone | Ranee | TBD |

## Active blockers

No confirmed blocker prevents eligible Core Application preparation after the Phase 1 documentation PR merges. Flood-data integration, model training, and routing acceptance remain conditionally blocked by the [Phase 1 gate](phases/PHASE-01-GATE.md).

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
