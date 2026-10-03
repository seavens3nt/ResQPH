# ResQPH project roadmap

**Status:** Team Phase 3 completed; Team Phase 4 ready to start
**Decision owner:** Ranee
**Last updated:** 2026-10-04

## Delivery structure

Ranee completed the Project Foundation through PR #25, Team Phase 1 through
the accepted mapping gate, and Team Phase 2 through PR #55 and its routing
gate. Matthew's early Team Phase 3 experiment was accepted as external
exploratory evidence with runtime integration deferred. The post-routing reconciliation is merged through PR #58; Team Phase 4 is active.

Because delivery time is constrained, every phase must protect the smallest end-to-end demonstration. Deterministic rescue coordination and rule-based A* routing are the critical path. ML experimentation remains required, while runtime ML integration and optional data enrichment are conditional and must not block that path.

```text
Project Foundation Phase 1 — Requirements and Data Validation
Project Foundation Phase 2 — Core Application
        |
        v
Team Phase 1 — Mapping and Geospatial Pipeline
        |
        v
Team Phase 2 — Flood-Aware Routing
        |
        v
Team Phase 3 — AI/ML Road-Risk Component
        |
        v
Team Phase 4 — Limited Offline Support
        |
        v
Team Phase 5 — Integration, Testing, and Presentation
```

## Cross-phase constraints

1. The study area is the project-defined U-Belt pilot area, City of Manila, using the approved WGS 84 bounding box.
2. Flood conditions are controlled or historical; the system does not claim live prediction.
3. A* and rule-based penalties must work before ML is integrated.
4. XGBoost is accepted as completed external exploratory evidence under D-019 and D-020; its artifact is not U-Belt runtime-compatible or routing-approved.
5. Model output may add a bounded penalty but cannot override impassability rules or human decisions.
6. Offline support is limited to one cached assigned mission and one queued status update.
7. The interface distinguishes simulated, historical, cached, stale, and pending-sync information.
8. Only synthetic or sanitized rescue records may be committed or demonstrated.
9. No phase advances because of a calendar date or issue closure alone; Ranee approves inspected gate evidence.
10. Basic role simulation is the approved MVP boundary; production authentication is excluded.
11. Tier 1 in [`MVP_SCOPE.md`](requirements/MVP_SCOPE.md) is completed before optional Tier 3 work begins.
12. Frontend labels must identify controlled/simulated data and may not claim live monitoring, official dispatch, nationwide coverage, or a guaranteed safe route.

## Project Foundation Phase 1 — Requirements and Data Validation

**Status:** Completed and verified
**Lead:** Ranee

### Goal

Lock a coherent MVP, exact boundary, workflows, datasets, API/database/routing/ML/offline contracts, risks, and acceptance evidence before core implementation.

### Required outputs

- Approved MVP scope and exclusions
- Exact study-area polygon or bounding box
- Rescue and mission lifecycle rules
- API and MongoDB contracts
- Dataset register and sample feasibility evidence
- Routing and rule-risk contract
- ML target, features, split, metrics, and fallback plan
- Offline cache/synchronization contract
- UI state expectations and wireframe review
- Risk register, test strategy, and acceptance scenarios
- Basic role-simulation decision and limitation

### Gate

Ranee recorded `Approve` on 2026-09-22 after verifying the locked foundation and evidence in [`PHASE-01-GATE.md`](phases/PHASE-01-GATE.md). PR #13 is merged into `main`, so Project Foundation Phase 2 is `Ready to start`. Later implementation tests are exit criteria for their own phases, not unfinished Phase 1 decisions.

## Project Foundation Phase 2 — Core Application

**Status:** Completed and verified through PRs #21–#25
**Lead:** Ranee
**Backend review/support:** Jared
**Frontend contract review/support:** Elle and Clarence

### Goal

Deliver a persistent, testable rescue-request and mission lifecycle that works without map, routing, or ML availability.

### Exit evidence

- Basic role simulation with explicit prototype limitations
- Rescue-request validation and CRUD
- Coordinator queue and atomic mission assignment
- Rescuer mission retrieval and valid status transitions
- MongoDB indexes, history, conflicts, and transaction tests
- Sanitized seed scenario
- Frontend API integration for the core lifecycle
- OpenAPI and contract tests

### Time-box fallback

If capacity is lower than expected, complete one citizen request through coordinator assignment and rescuer status updates before adding extra CRUD variations, analytics, or visual polish. Routing, ML, and offline components may use their locked adapters and fixtures while the core lifecycle is implemented.

## Team Phase 1 — Mapping and Geospatial Pipeline

**Status:** Completed and verified through PRs #39–#43 and the Team Phase 1 gate
**Accountable geospatial owner:** Matthew
**Backend integration support:** Jared

The bounded OSM road graph, stable edge identifiers, controlled scenario join,
metadata, backend loader, map layers, legends, source/time labels, and small
reproducible fixtures are accepted. See the Team Phase 1 gate and evidence.

## Team Phase 2 — Flood-Aware Routing

**Status:** Completed and verified through PRs #50–#53 and #55
**Accountable routing owner:** Matthew
**Backend integration support:** Jared

The accepted A* engine, deterministic flood/passability penalties,
impassable-edge exclusion, no-route behavior, route explanations, backend
adapter, route client, accessible presentation, and map overlay now run as one
verified controlled-scenario path. Runtime ML remains disabled.

## Team Phase 3 — AI/ML Road-Risk Component

**Status:** Completed and verified with conditions through PRs #31 and #58
**Accountable owner:** Matthew
**Support:** Ranee and Jared

Package and verify the completed XGBoost experiment, including provenance,
artifact integrity, the actual random-row evaluation boundary, error analysis,
stable inference output, and missing/malformed/incompatible-model fallback.
The external artifact is not compatible with the U-Belt runtime contract.

The accepted gate treats the experiment as a non-integrated academic result
and the backend adapter as a safe fallback boundary. The rule-based route
remains the accepted application behavior. See
[`TEAM-PHASE-03.md`](phases/TEAM-PHASE-03.md).

Ranee completed the post-routing reconciliation through PR #58. All required
PR and post-merge main CI passed; the artifact remains outside runtime.

## Team Phase 4 — Limited Offline Support

**Status:** Ready to start; active delivery phase
**Accountable backend owner:** Ranee
**Frontend controller/storage owner:** Elle
**Presentation owner:** Clarence
**Backend acceptance:** Jared
**Repeatable acceptance scenarios:** Matthew

Cache one assigned mission, show data age, queue one next-valid status event,
synchronize idempotently, and display conflict/failure states. The packages are
ready to start from [the locked phase guide](phases/TEAM-PHASE-04.md).

## Team Phase 5 — Integration, Testing, and Presentation

**Status:** Planned
**Gate owner:** Ranee
**Participants:** All members

Verify the complete rescue scenario, failure and fallback cases, accessibility, performance within agreed targets, privacy, data/source labels, deployment or reliable local-demo instructions, rollback, documentation, paper alignment, backup video, and rehearsals. No unverified feature enters the final presentation.

## Critical path

```text
Scope and exact boundary
  -> workflow/status rules
  -> API and database contracts
  -> core lifecycle
  -> geospatial edge identifiers
  -> deterministic routing
  -> bounded ML integration
  -> offline behavior
  -> end-to-end verification and presentation
```

## Resolved ownership

Ranee assigned Matthew as the accountable owner for the geospatial pipeline and deterministic routing. Jared supports the backend integration boundary, while Ranee retains scope and gate authority. Elle and Clarence own the frontend and map-interface presentation at their approved interfaces.
