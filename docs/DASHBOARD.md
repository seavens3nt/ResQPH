# ResQPH project dashboard

**Last updated:** 2026-10-03
**Decision owner:** Ranee

| Active phase | Health | Current goal |
|---|---|---|
| Team 2 — Flood-Aware Routing | On track | Deterministic, explainable A* from engine through API and UI |

## Phase progress

| Phase | Status | Gate focus |
|---|---|---|
| Project Foundation 1 | Completed and verified | Scope, contracts, fixtures, and evidence |
| Project Foundation 2 | Completed and verified | Persistent request-to-mission workflow |
| Team 1 — Mapping and Geospatial | Completed and verified | Reproducible bounded graph, stable IDs, controlled flood join |
| Team 2 — Flood-Aware Routing | Ready to start | A*, penalties, exclusions, no-route, explanations, API/UI integration |
| Team 3 — AI/ML | Completed with conditions | External evidence accepted; runtime integration deferred |
| Team 4 — Limited Offline | Planned | One cached mission and one queued update |
| Team 5 — Integration and Presentation | Planned | Verified end-to-end demo and reconciled academic outputs |

## Team Phase 1 evidence snapshot

| Area | Result |
|---|---|
| Graph extraction | 912 nodes; 2,168 directed edges |
| Controlled join | 10 matched; 0 rejected |
| Committed map fixture | 30 road edges; 10 controlled records |
| Routing tests | 59 passed |
| Backend tests | 73 passed; 2 environment-gated skips |
| Frontend tests | 155 passed |
| Frontend build | Passed with non-blocking bundle-size advisory |
| Gate | Approved |

## Active ownership

| Owner | Team Phase 2 package | Status |
|---|---|---|
| Ranee | Tracker/gate and temporary route client/map-overlay coverage for Elle | Ready to start |
| Matthew | Deterministic routing engine | Ready to start |
| Jared | Backend routing API boundary | Ready to start from locked response contract |
| Clarence | Accessible route presentation | Ready to start from locked response contract |
| Elle | Temporarily unavailable; no active package until Ranee reassigns one | Paused by PM decision |

## Immediate actions

1. Each active owner pulls the gate revision from `main` and creates the branch named in the assigned issue.
2. Implement only the owned files and verify against the locked fixtures.
3. Submit one focused PR with exact evidence; Ranee reviews and merges.

## Navigation

- [Current status](STATUS.md)
- [Roadmap](ROADMAP.md)
- [Team Phase 2](phases/TEAM-PHASE-02.md)
- [Architecture](ARCHITECTURE.md)
- [Team responsibilities](TEAM.md)
- [Development setup](SETUP.md)
- [Contribution rules](../CONTRIBUTING.md)
