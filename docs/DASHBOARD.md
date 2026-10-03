# ResQPH project dashboard

**Last updated:** 2026-10-04
**Decision owner:** Ranee

| Active phase | Health | Current goal |
|---|---|---|
| Team 3 — AI/ML reconciliation | On track | Ranee-only post-routing verification; runtime ML remains disabled |

## Phase progress

| Phase | Status | Gate focus |
|---|---|---|
| Project Foundation 1 | Completed and verified | Scope, contracts, fixtures, and evidence |
| Project Foundation 2 | Completed and verified | Persistent request-to-mission workflow |
| Team 1 — Mapping and Geospatial | Completed and verified | Reproducible bounded graph, stable IDs, controlled flood join |
| Team 2 — Flood-Aware Routing | Completed and verified | A*, penalties, exclusions, no-route, explanations, API/UI integration |
| Team 3 — AI/ML | Completed with conditions; reconciliation ready | External evidence accepted; Ranee verifies the completed route still fails closed |
| Team 4 — Limited Offline | Planned | One cached mission and one queued update |
| Team 5 — Integration and Presentation | Planned | Verified end-to-end demo and reconciled academic outputs |

## Team Phase 2 evidence snapshot

| Area | Result |
|---|---|
| Routing tests | 136 passed |
| Backend tests | 115 passed; 2 environment-gated skips |
| Cross-layer route acceptance | 2 passed |
| Frontend tests | 183 passed |
| Frontend build | Passed with non-blocking bundle-size advisory |
| Gate | Approved |

## Active ownership

| Owner | Team Phase 3 package | Status |
|---|---|---|
| Ranee | Post-routing ML fallback verification and evidence reconciliation | Ready to start |
| Matthew | No new package; accepted external experiment remains preserved | Completed |
| Jared | No Team Phase 3 package | Not assigned |
| Clarence | No Team Phase 3 package | Not assigned |
| Elle | No Team Phase 3 package | Not assigned |

## Immediate actions

1. Ranee pulls the Team Phase 2 gate revision from `main` and follows the single assigned Team Phase 3 closeout issue.
2. Keep `ML_ENABLED=false`; verify rejected/missing ML leaves route costs deterministic and explicit.
3. Update only the inconsistent evidence/status records and close the milestone after verification.

## Navigation

- [Current status](STATUS.md)
- [Roadmap](ROADMAP.md)
- [Team Phase 3](phases/TEAM-PHASE-03.md)
- [Architecture](ARCHITECTURE.md)
- [Team responsibilities](TEAM.md)
- [Development setup](SETUP.md)
- [Contribution rules](../CONTRIBUTING.md)
