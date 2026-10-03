# ResQPH project dashboard

**Last updated:** 2026-10-04
**Decision owner:** Ranee

| Phase | Status | Gate focus |
|---|---|---|
| Project Foundation 1–2 | Completed and verified | Scope/contracts and persistent lifecycle |
| Team 1 — Mapping | Completed and verified | Bounded graph and controlled fixture integration |
| Team 2 — Routing | Completed and verified | Deterministic engine through API/UI |
| Team 3 — AI/ML | Completed and verified with conditions | External evidence accepted; runtime integration deferred |
| Team 4 — Limited Offline | Ready to start; active | One durable mission and one pending update |
| Team 5 — Integration and Presentation | Planned | Complete controlled demo and academic outputs |

## Active packages

| Owner | Package | Status |
|---|---|---|
| Elle | Durable cache/queue/controller and rescuer wiring | Ready to start; resumed |
| Clarence | Accessible offline presentation | Ready to start |
| Jared | Backend replay and persistence acceptance | Ready to start |
| Matthew | Repeatable acceptance checks and demo matrix | Ready to start |
| Ranee | Integration review and final gate | Ready to start |

All packages consume locked contracts/fixtures. No personal handoffs or
member-to-member approval are required.

## Verification checkpoint

PR #58 and post-merge main CI passed. Local evidence: 121 backend/integration
tests passed with 2 environment skips; isolated ML 21 passed; 5 digests matched.
Team Phase 3 is complete. Durable offline behavior has not yet been implemented.

## Start here

1. Read [Team Phase 4](phases/TEAM-PHASE-04.md) and your assigned GitHub issue.
2. Pull accepted `main`; use the issue branch and exact owned files.
3. Attach repeatable evidence to one focused PR; Ranee reviews and merges.

- [Status](STATUS.md)
- [Roadmap](ROADMAP.md)
- [Setup](SETUP.md)
- [Team](TEAM.md)
- [Contribution rules](../CONTRIBUTING.md)
