# Phase 1 — Requirements and Data Validation

## Decision and implementation guide

| Field | Value |
|---|---|
| Phase lead | Ranee (`@seavens3nt`) |
| Members | Ranee, Jared Noel, Elle, Matthew Trinitaria, Clarence |
| Dates | TBD |
| Current status | Ready for review — Approve with conditions |
| Phase theme | Decide and validate before building |

## 1. Phase goal

Turn the proposal into an approved, testable, and technically realistic MVP. By the end of Phase 1, the team must agree on the users, workflows, terminology, study area, datasets, database/domain design, API and component contracts, routing assumptions, ML feasibility, rule-based fallback, risks, and acceptance scenarios.

Phase 1 is complete only when the outputs agree with one another. A polished wireframe is not useful if the backend contract cannot support it; a dataset is not usable until its license, coverage, CRS, age, resolution, and limitations are recorded.

## 2. Phase review checklist

Ranee finalized the outstanding Phase 1 decisions asynchronously on 2026-09-22. A separate meeting is not required. The checklist remains the review structure for Issue #12 and its pull request.

### Opening — 10 minutes

- Restate the problem and academic-prototype disclaimer.
- Confirm all five members' primary and supporting responsibilities.
- Confirm that GitHub Issues and the GitHub Project are the ticketing and status sources of truth.
- Review the Project Foundation and new team-phase structure.

### Scope and users — 25 minutes

- Approve citizen, coordinator, and rescuer roles.
- Choose consistent terminology: coordinator or dispatcher.
- Confirm basic role simulation is used and is never described as production authentication.
- Agree on MVP outcomes, non-goals, success criteria, and final demonstration boundary.

### Main workflows — 30 minutes

- Walk through request submission, review, assignment, route request, mission updates, rerouting, completion, and history.
- Agree on allowed request and mission statuses and invalid transitions.
- Identify validation, error, empty, no-route, stale, offline, conflict, and success states.

### Study area and data — 30 minutes

- Inspect the approved `ubelt-pilot-v1` GeoJSON and confirm processing stays within its project-defined WGS 84 boundary.
- Review road, flood, elevation, administrative boundary, facility, and possible ML data sources.
- Record license, coverage, date, resolution, CRS, format, size, accessibility, quality, and intended use.
- Decide which sources are accepted, need testing, need replacement, or are unavailable.

### Architecture and contracts — 30 minutes

- Align UI actions with API operations, domain records, MongoDB collections, and status history.
- Agree on GeoJSON longitude/latitude order, timestamps, identifiers, errors, and versioned API paths.
- Agree on the routing and risk input/output contracts and non-ML fallback.
- Identify transaction boundaries and cross-component dependencies.

### Planning and close — 20 minutes

- Convert only approved outputs into small GitHub Issues.
- Set primary owner, support, dependencies, priority, acceptance criteria, and verification for Sprint 01 candidates.
- Record decisions, open questions, blockers, risks, and next review.
- Do not begin feature implementation while a required upstream decision remains unresolved.

## 3. Relevant technology stack

Phase 1 mostly produces decisions, contracts, diagrams, metadata, and small validation scripts or samples. The approved implementation stack constrains those artifacts:

| Area | Approved stack | Phase 1 use |
|---|---|---|
| Frontend | React, TypeScript, Vite, Leaflet/React Leaflet, Axios, TanStack Query, Dexie, Zod | Define pages, components, client states, API types, map needs, validation, and offline boundaries. |
| Backend | Python 3.12, FastAPI, Pydantic, async PyMongo | Define domain models, endpoints, validation, error shape, transactions, and integration adapters. |
| Database | MongoDB 8 replica set through Docker Compose | Define collections, document examples, indexes, geospatial fields, history, and transaction candidates. |
| Routing/geospatial | OSMnx, NetworkX, GeoPandas, Shapely, PyProj, Rasterio | Validate data compatibility and define graph/route contracts; no final routing implementation yet. |
| AI/ML | pandas, NumPy, scikit-learn, joblib | Define the required Logistic Regression and Random Forest experiment, rule fallback, and evidence gate; XGBoost is excluded. |
| Documentation | Markdown, Mermaid or exported diagrams, GitHub | Keep reviewed decisions and evidence in version control. |
| Ticketing | GitHub Issues and GitHub Project | Track ownership, dependencies, status, acceptance criteria, reviews, and blockers. |

## 4. Phase architecture

### Runtime boundary being designed

```text
Citizen / Coordinator / Rescuer UI
              |
              | versioned JSON/GeoJSON contract
              v
        FastAPI application
              |
      +-------+----------+
      |                  |
      v                  v
MongoDB records    Routing adapter
                         |
                 deterministic A*/Dijkstra
                         |
                 rule-risk fallback
                         |
                 optional evaluated ML
```

### Phase 1 information flow

```text
User workflow + wireframe
          |
          v
Domain terms + status transitions
          |
     +----+---------+
     v              v
API contract   MongoDB schema
     |              |
     +------+-------+
            v
Routing/data/ML contracts
            |
            v
Acceptance scenarios and future Issues
```

The backend is one modular FastAPI application at this stage. Routing and ML keep separate code and ownership boundaries but are not independently deployed services unless later evidence justifies that complexity.

## 5. GitHub and coding rules

### GitHub Project workflow

Use:

`Backlog -> Ready -> In Progress -> In Review -> Blocked -> Done`

Recommended fields: **Phase, Sprint, Area, Priority, Owner, Support, Effort, Status**.

### Issue readiness

An Issue moves to **Ready** only when it has:

- One clear and appropriately small objective.
- The official phase and primary component.
- One primary owner and any supporting contributors.
- Testable acceptance criteria.
- Known dependencies and blockers.
- Verification or review instructions.
- No unapproved scope hidden inside the description.

### Branches and pull requests

- Branch from the latest `main`.
- Use `feature/<issue-number>-short-description`, `fix/<issue-number>-short-description`, `docs/<issue-number>-short-description`, or `test/<issue-number>-short-description`. Existing `research/`, `data/`, and `setup/` prefixes are also valid.
- Keep one primary purpose per Issue and one Issue, or tightly related ticket group, per branch.
- Do not push directly to `main` during normal development.
- Link the Issue in the pull request and request at least one teammate review when possible.
- Report checks, screenshots/diagrams, sanitized samples, risks, and limitations relevant to the change.
- Update contracts and documentation in the same change when behavior or architecture changes.

### Data and security rules

- Never commit passwords, tokens, private keys, or real `.env` files.
- Never commit real private contact details, precise personal emergency locations, or operational rescue records.
- Use synthetic or sanitized rescue scenarios.
- Do not commit large raw/processed datasets or generated model artifacts to ordinary Git history.
- Commit dataset metadata, source/acquisition instructions, transformations, checks, and small test fixtures.
- Do not describe controlled or historical hazard information as live data.

### Engineering rules

- Deterministic A* or Dijkstra comes before ML-assisted routing.
- A rule-based risk fallback is mandatory and independently testable.
- Model output may contribute a bounded, explainable penalty but cannot override deterministic impassability rules or human decisions.
- Use consistent ISO 8601 timestamps with an agreed timezone policy.
- GeoJSON coordinates are `[longitude, latitude]`.
- Validate data at component boundaries and define a common error response.

## 6. Expected Phase 1 file architecture

The following is the target artifact layout at the end of Phase 1. These files should be created through their approved GitHub Issues; they are not all required to exist at the start of the phase.

```text
ResQPH/
├── docs/
│   ├── requirements/
│   │   ├── MVP_SCOPE.md
│   │   ├── REQUIREMENTS.md
│   │   ├── GLOSSARY.md
│   │   └── ACCEPTANCE_SCENARIOS.md
│   ├── workflows/
│   │   ├── CITIZEN_WORKFLOW.md
│   │   ├── COORDINATOR_WORKFLOW.md
│   │   ├── RESCUER_WORKFLOW.md
│   │   └── STATUS_TRANSITIONS.md
│   ├── ui/
│   │   ├── WIREFRAMES.md
│   │   └── UI_STATES.md
│   ├── api/
│   │   └── API_CONTRACT.md
│   ├── database/
│   │   └── MONGODB_SCHEMA.md
│   ├── data/
│   │   └── DATASET_REGISTER.md
│   ├── routing/
│   │   └── ROUTING_CONTRACT.md
│   ├── ml/
│   │   └── ML_FEASIBILITY.md
│   ├── testing/
│   │   └── TEST_STRATEGY.md
│   ├── decisions/
│   │   └── DECISION_LOG.md
│   ├── risks/
│   │   └── RISK_REGISTER.md
│   └── phases/
│       └── PHASE-01.md
├── data/
│   ├── metadata/
│   │   ├── road-network.md
│   │   ├── flood-hazard.md
│   │   ├── elevation.md
│   │   └── study-area.md
│   └── samples/
│       ├── rescue-request.example.json
│       └── road-edge.example.geojson
└── tests/
    └── integration/
        └── scenarios/
            └── rescue-lifecycle.md
```

If one artifact is small, it may be combined with a closely related document after team agreement. Do not create empty files only to imitate the tree.

## 7. File and folder rules

### Documentation

- Use descriptive headings, decisions, owners, sources, assumptions, limitations, and last-updated dates.
- Use relative links between repository documents.
- Diagrams must remain editable: Mermaid in Markdown or source plus exported image. Do not commit an image without its editable source when practical.
- Use `TBD` rather than inventing dates, requirements, sources, or performance numbers.
- A decision record states the question, options, evidence, decision, reason, owner, date, and consequences.

### Frontend contracts

- Planned React components use `PascalCase.tsx`; hooks use `useSomething.ts`; API/utilities use descriptive `camelCase.ts` names.
- UI state names must map to backend/domain terms instead of inventing competing statuses.
- Every key view documents loading, empty, error, offline, stale, Pending Sync, unauthorized when applicable, and success states.
- A map-only interaction needs an accessible text/list alternative for essential information.

### Backend and database contracts

- Python modules and tests use `snake_case.py`; tests start with `test_`.
- API endpoints use the `/api/v1` prefix already established by the scaffold.
- Request/response examples must be sanitized and agree with Pydantic/MongoDB naming decisions.
- Store status history and prefer archive/soft-delete behavior for important operational records.
- Define unique and geospatial indexes from query needs, not guesswork.
- Assignment operations that update several records must identify their validation and transaction boundary.

### Data, routing, and ML

- Record source URL, publisher, license, access date, coverage, data period, CRS, resolution/scale, format, size, important fields, processing, checks, and limitations.
- Preserve source files outside Git; processing must be repeatable and must not silently edit source data.
- Use stable road-edge identifiers so routing, data, and ML can join the same segments.
- Store small fixtures only in `data/samples/`; never use them as evidence of full-area accuracy.
- Notebooks support exploration; reusable transformations and evaluation logic belong in `ml/src/` or `routing/` modules.
- ML artifacts are generated outputs, not source code. Record how they are produced and versioned.

## 8. Member delegation

Assignments below define Phase 1 ownership. The documentation baseline is tracked by Issue #12; future implementation work receives separate executable issues only after the applicable gate permits it.

### Member 1 — Ranee: project manager, primary backend, AI/ML and UI/UX support

1. Finalize and record the requirements and scope decisions.
2. Finalize the MVP, non-goals, terminology, success criteria, and approval record.
3. Define citizen, coordinator, and rescuer workflows with Elle.
4. Draft the initial backend domain model, request/mission statuses, and transition rules.
5. Draft the API contract outline and MongoDB transaction candidates.
6. Coordinate technical decisions across frontend, backend, data, routing, and ML.
7. Review UI/UX, dataset, routing, and AI/ML feasibility.
8. Maintain the decision log, risk register, dependencies, blockers, status, and sprint readiness.
9. Prevent feature work from starting when required scope or contract decisions remain unresolved.

**Expected evidence:** approved scope; recorded decisions; domain/status draft; API outline; risk/decision updates; reviewed Phase 1 plan.

### Member 2 — Jared Noel: primary backend and integration, secondary AI/ML

1. Review backend architecture, module boundaries, and versioned API boundary.
2. Define integration points among frontend, FastAPI, MongoDB, routing, and ML.
3. Help draft request/response contracts and representative sanitized examples.
4. Define validation, common error responses, duplicate/idempotency considerations, and failure behavior.
5. Review collection responsibilities, indexes, assignment transactions, and status-history consistency.
6. Identify integration risks and missing contract details.
7. Support technical feasibility and ML-adapter/fallback review.

**Expected evidence:** contract review; integration diagram/table; error convention; transaction notes; documented integration risks.

### Member 3 — Elle: primary UI/UX and frontend, testing/documentation support

1. Create citizen, coordinator, and rescuer workflow diagrams.
2. Produce low-fidelity wireframes for the main rescue lifecycle.
3. Define navigation, page boundaries, and reusable component expectations.
4. Define loading, empty, validation error, system error, offline, stale, Pending Sync, no-route, and success states.
5. Review mobile usability, accessibility, map interaction, and non-map alternatives.
6. Document frontend data needs and ensure each one maps to an API/domain concept.
7. Review terminology and messages with Ranee, Jared, and Clarence.

**Expected evidence:** three reviewed workflows; wireframes; page/component list; UI-state matrix; accessibility and responsive notes.

### Member 4 — Matthew Trinitaria: primary AI/ML and data evaluation; geospatial/routing owner

1. Identify possible AI/ML inputs, outputs, target/labels, features, and evaluation metrics.
2. Evaluate whether proposed data are sufficient, representative, linkable, and legally usable.
3. Define the initial non-ML road-risk baseline and the criteria for preferring a model.
4. Document data assumptions, missingness, bias, leakage risks, uncertainty, and limitations.
5. Propose spatial/temporal train-validation-test separation when supervised learning is defensible.
6. Define how an approved model result could become a bounded, explainable routing penalty.
7. Prevent premature training when validated data and a defensible target are unavailable.
8. Own the bounded OSM extraction, stable road-edge identifiers, scenario-layer join, deterministic A*, and routing verification evidence.

**Expected evidence:** ML feasibility report; data/feature/label table; rule baseline; evaluation plan; train/do-not-train criteria; reproducible road extraction; stable edge fixture; routing verification plan.

### Member 5 — Clarence: UI/UX and frontend, testing and map-interface support

1. Review citizen, volunteer, rescuer, and coordinator workflows with Elle and Ranee.
2. Review navigation, page boundaries, reusable components, responsive behavior, and accessibility.
3. Define map-interface needs for layers, legends, warnings, route explanations, and non-map alternatives.
4. Review loading, empty, validation, error, no-route, cached, stale, Pending Sync, and sync-failure states.
5. Map frontend data needs to the approved API contract without editing backend contracts independently.
6. Identify usability, mobile, and integration risks.

**Expected evidence:** reviewed UI states and workflows; frontend data-needs notes; map-interface requirements; responsive/accessibility findings.

### Resolved ownership — geospatial data and routing

Ranee assigned Matthew as accountable owner for dataset acquisition/processing, road-graph construction, and deterministic routing. Jared supports the backend integration boundary, Elle and Clarence own map/route presentation at the frontend boundary, and Ranee approves scope and gate decisions.

## 9. Expected outputs by workstream

### Project management

- Approved MVP scope and non-goals.
- Phase/sprint approach, priorities, and realistic capacity assumptions.
- Decision log, risk register, dependency list, and blocker-escalation path.
- GitHub Project configured or a documented configuration plan.
- Approved Phase 1 work converted into ready GitHub Issues; no premature bulk assignment.
- Status/dashboard updated after approval.

### Backend

- Domain glossary and main entities.
- Request and mission lifecycle/status-transition diagram.
- Draft `/api/v1` endpoint list with request, success, validation error, not-found/conflict, and no-route examples.
- Common validation and error-response convention.
- Integration boundary table for frontend, MongoDB, routing, and ML/fallback.
- Initial transaction candidates, especially mission assignment plus request-state change.

### Frontend and UI/UX

- Citizen, coordinator, and rescuer flow diagrams.
- Low-fidelity wireframes for request submission/tracking, request queue/assignment, and rescuer mission/route/status.
- Page, route, and reusable-component inventory.
- UI-state matrix covering loading, empty, errors, offline, stale, Pending Sync, no-route, and success.
- Map information hierarchy, legend/warning concept, accessible text alternative, and responsive notes.
- Frontend data-needs table mapped to API operations.

### Database

- Proposed `users`, `rescuers`, `rescue_requests`, `missions`, `location_updates`, `flood_reports`, optional `evacuation_centers`, and `sync_events` responsibilities.
- Representative sanitized documents and identifiers.
- Query-driven index proposal including required `2dsphere` indexes.
- Status/history, timestamp, retention, archive/soft-delete, and coordinate policies.
- Transaction and consistency notes for multi-record operations.

### AI/ML

- Clear candidate road-risk/passability target and intended routing use.
- Candidate feature/label/source table and join keys.
- Data sufficiency, bias, missingness, leakage, and representativeness assessment.
- Transparent rule-based scoring baseline and fallback.
- Proposed metrics and held-out evaluation method.
- Evidence-based train, defer, or fallback-only recommendation.

### Geospatial and routing

- Approved or shortlisted study-area boundary with decision criteria.
- Dataset register plus one metadata file per accepted/shortlisted source.
- CRS, format, coverage, resolution, currency, quality, license, and transformation findings.
- Road-edge attribute list and stable identifier strategy.
- Route request/result contract including geometry, distance/time, cost/penalty summary, data/scenario timestamp, explanation, and no-route response.
- Deterministic A*/Dijkstra baseline assumptions, passability rules, and sample-fixture plan.

### Testing

- Requirements-to-acceptance-scenario traceability.
- Synthetic main rescue-lifecycle scenario.
- Failure scenarios for invalid input, invalid transition, duplicate assignment, unavailable routing, no route, stale data, offline queue/conflict, and ML unavailability.
- Phase-specific unit, contract, integration, accessibility, data-quality, routing, and fallback test approach.
- Initial test-data/privacy policy.

### Documentation

- Project context and roadmap linked from the root README.
- Reviewed workflow, API, schema, dataset, routing, ML, test, decision, and risk documents.
- Each external source properly attributed with access and license information.
- Open items marked `TBD` with an owner or decision path.
- No conflicting terminology or duplicate source-of-truth documents.

## 10. Integration points to approve

| Producer | Consumer | Contract to settle in Phase 1 |
|---|---|---|
| Citizen UI | Backend | Rescue-request fields, coordinate capture, validation, consent/privacy message, response/status identifier. |
| Coordinator UI | Backend | Request queue/filter data, assignment command, conflict/error handling, status/history. |
| Rescuer UI | Backend | Assigned mission, route request/result, location/status update, observation, offline queue result. |
| Backend | MongoDB | Collections, identifiers, timestamps, GeoJSON, indexes, transaction boundaries, history/retention. |
| Backend | Routing | Origin/destination, scenario/data version, route geometry, distance/time, cost explanation, warnings, no-route/error. |
| Geospatial pipeline | Routing | Graph format, stable edge IDs, CRS, distance/time, flood/elevation/passability attributes, update timestamp. |
| Data pipeline | AI/ML | Join key, feature definitions, labels, missingness, split policy, provenance, version. |
| AI/ML or rules | Routing | Bounded risk score/penalty, version, reason/features, confidence/limitations, fallback behavior. |
| Offline client | Backend | Event ID, mission ID, action, client timestamp, base version, replay/idempotency, accepted/rejected/conflict response. |

## 11. Constraints and risk controls

| Constraint or risk | Realistic control |
|---|---|
| Academic schedule and five-person capacity | Approve a narrow MVP; keep dates TBD until capacity is discussed; defer extras. |
| Study-area uncertainty | Compare candidate boundaries against data compatibility and demo usefulness before approval. |
| Missing or incompatible data | Maintain accepted/alternative/unavailable status; permit rule/synthetic controlled inputs with explicit limitations. |
| Hazard data mistaken for live conditions | Label source, period, scenario, timestamp, and uncertainty in contracts and UI. |
| Scope creep into forecasting or official dispatch | Enforce project context, non-goals, and decision control. |
| API/schema/UI mismatch | Review the workflow, wireframe, API, and schema together using one synthetic scenario. |
| ML started too early | Require target, labels, leakage-safe split, baseline, metrics, and data review before training. |
| Unexplainable or unavailable model | Bound the penalty and always expose the independent rule fallback. |
| Unsafe routing implication | Use “recommended route under the selected scenario,” show reasons/limitations, and provide no-route state. |
| Private or sensitive rescue data | Use synthetic/sanitized fixtures and prohibit secrets/private records in GitHub. |
| Large datasets/model artifacts in Git | Commit metadata/scripts/samples only; document external storage and reproduction. |
| Offline conflict/staleness | Timestamp cached data and queued events; backend validates replay and returns conflicts. |

## 12. Phase completion checklist

### Scope and decisions

- [x] MVP and non-goals are approved.
- [x] User roles and coordinator/dispatcher terminology are approved.
- [x] Authentication scope is decided: basic role simulation only.
- [x] Success criteria and final U-Belt demonstration boundary are recorded.
- [x] Open decisions have owners and evidence conditions.

### Workflows and UI/UX

- [ ] Citizen, coordinator, and rescuer workflows are reviewed.
- [ ] Low-fidelity wireframes cover the main lifecycle.
- [ ] Page/component and UI-state inventories are reviewed.
- [ ] Mobile, accessibility, map, stale, offline, and no-route needs are recorded.

### Backend and database

- [ ] Domain terms and status transitions are consistent.
- [ ] API outline includes representative success and failure examples.
- [ ] MongoDB collection/document/index proposal supports the workflows.
- [ ] Assignment transaction and history/retention behavior are documented.
- [ ] Integration and common error conventions are approved.

### Data, routing, and AI/ML

- [x] Study-area boundary is approved and available as GeoJSON.
- [ ] Required dataset sources, licenses, coverage, CRS, formats, age, quality, and limitations are recorded.
- [ ] A small sample-fixture plan is approved.
- [ ] Routing input/output and deterministic baseline assumptions are approved.
- [ ] Rule-based risk fallback is documented.
- [ ] ML feasibility and train/defer/fallback-only recommendation are reviewed.

### Planning, testing, and documentation

- [x] Main and failure acceptance scenarios are written.
- [x] Risks, dependencies, and blockers are current.
- [x] Documents contain sources, owners, limitations, and explicit conditional items.
- [ ] Approved Sprint 01 work is represented by ready GitHub Issues.
- [ ] A cross-component walkthrough finds no unresolved critical contradiction.
- [ ] Phase 1 outputs are reviewed in pull requests and linked from project documentation.

## 13. Phase 1 Definition of Done

An artifact is done when its acceptance criteria are satisfied, sources and assumptions are recorded, terminology matches related artifacts, affected component owners review it, unresolved items are explicit, local links and diagrams work, sensitive/large data are absent, and the result can be used to create an implementation Issue without guessing.

The Phase 1 gate is `Approve with conditions`. The approved decisions may guide eligible Core Application preparation after the documentation PR merges, but Phase 1 is not labeled `Completed and verified` until the unchecked evidence and review conditions in [`PHASE-01-GATE.md`](PHASE-01-GATE.md) pass.

## 14. End-of-phase demonstration

Use one synthetic scenario, for example a citizen requesting help for several people within the approved study area under a controlled moderate-flood condition.

1. Show the approved MVP and non-goals.
2. Walk through the citizen, coordinator, and rescuer diagrams and wireframes.
3. Trace the request fields through the API and proposed MongoDB documents.
4. Show valid assignment/status transitions and one rejected invalid transition.
5. Display the study boundary and dataset-register evidence.
6. Trace origin, destination, road/flood/elevation attributes, and the deterministic route contract.
7. Explain the rule-based road-risk fallback and the ML train/defer decision criteria.
8. Show error, no-route, stale, offline, and Pending Sync expectations.
9. End with known constraints, decisions still marked `TBD`, approved Sprint 01 Issues, and the next review point.

The Phase 1 demonstration validates the design and evidence. It does not imply that Project Foundation Phase 2 or Team Phases 1–5 are already implemented.
