# ResQPH project roadmap

This roadmap organizes ResQPH around the seven phases in the approved proposal. It describes outcomes and constraints; GitHub Issues will contain the detailed, assigned work. Phase and sprint dates remain **TBD** until the team approves them.

## Delivery model

- **Ticketing source of truth:** GitHub Issues.
- **Work visualization:** GitHub Project using `Backlog -> Ready -> In Progress -> In Review -> Blocked -> Done`.
- **Recommended fields:** Phase, Sprint, Area, Priority, Owner, Support, Effort, and Status.
- **Iteration:** lightweight Scrum planning/review/retrospective with continuous Kanban status updates.
- **Phase rule:** a phase can span multiple sprints and exits only when its criteria are demonstrated.
- **Safety rule:** the system remains an academic prototype using synthetic/sanitized rescue records and controlled flood scenarios.

## Cross-phase constraints

1. The first release covers one approved Metro Manila study area, not nationwide deployment.
2. Public/open data must be evaluated for license, coverage, CRS, resolution, age, uncertainty, and reproducibility.
3. A* or Dijkstra must provide the deterministic routing baseline before ML-assisted routing.
4. A rule-based road-risk fallback remains available even if an ML model is integrated.
5. The interface must distinguish live, stale, cached, simulated, and pending-sync information.
6. No claim of official flood forecasting, guaranteed safety, or government emergency integration is permitted.
7. Large datasets, generated models, credentials, and private emergency information stay outside ordinary Git history.

---

## Phase 1 — Requirements and Data Validation

**Dates:** TBD
**Lead:** Ranee
**Support:** All members

### Goal

Approve a realistic MVP and prove that its users, workflows, study area, data, domain model, component contracts, and fallbacks are coherent before feature implementation.

### Main workstreams and owners

- Scope, terminology, decisions, risks, backend domain/API draft — Ranee.
- Backend boundaries, validation, errors, and integrations — Jared.
- User workflows, wireframes, UI states, accessibility — Elle.
- ML/data feasibility, metrics, and rule baseline — Matthew.
- Study area, geospatial datasets, and routing contract — Clarence.

### Required inputs

Original proposal; team/instructor constraints; user-role assumptions; potential study areas; public road, flood, elevation, and boundary sources; existing architecture and repository setup.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Approved user journeys, low-fidelity wireframes, navigation, map expectations, and loading/empty/error/offline/stale/success states. |
| Backend | Domain glossary, workflow/status transitions, endpoint outline, validation/error conventions, integration boundaries, and transaction candidates. |
| Database | Proposed collections, representative sanitized documents, relationships, indexes, geospatial rules, retention, and soft-delete/history decisions. |
| Routing/geospatial | Approved or shortlisted study boundary; dataset register; CRS/format/coverage findings; route input/output contract; deterministic assumptions. |
| AI/ML | Feasibility note, candidate target/features/labels/metrics, leakage risks, rule-based baseline, and train/do-not-train decision criteria. |
| Testing/docs | Requirements traceability, acceptance scenarios, test strategy, decision log, risk register, and reviewed Phase 1 artifacts. |

### Dependencies and realistic constraints

- Team/instructor approval is needed for the MVP and study area.
- Dataset discovery does not guarantee usability or redistribution rights.
- Authentication may be minimized or deferred if it distracts from the academic core; the decision must be explicit.
- No model training should start without a meaningful target and defensible data split.
- API/schema detail should follow workflow and terminology approval.

### Exit criteria

- MVP, non-goals, success criteria, terminology, and roles are approved.
- One study area is approved or a documented decision path and blocker exist.
- Critical datasets are accepted, replaced, or explicitly marked unavailable.
- User workflows and wireframes agree with the domain/API/schema draft.
- Routing and ML integration have explicit inputs, outputs, fallbacks, and limitations.
- Phase risks, open decisions, owners, and later tickets are recorded.

### End-of-phase demonstration

Walk through one synthetic rescue scenario using the workflow diagrams and wireframes, then show how the same scenario maps to the API/schema draft, study-area data, deterministic route contract, and rule-based risk fallback.

Detailed guide: [Phase 1 — Requirements and Data Validation](phases/PHASE-01.md).

---

## Phase 2 — Core Application

**Dates:** TBD
**Lead:** Ranee
**Support:** Jared and Elle

### Goal

Deliver a testable rescue-request and mission lifecycle backed by MongoDB, with only the authentication and authorization required by the approved MVP.

### Main workstreams and owners

- Backend/API, MongoDB transactions, state rules — Ranee with Jared.
- Citizen/coordinator/rescuer application flows — Elle.
- Contract and integration testing — Jared with Ranee and Elle.

### Required inputs

Approved Phase 1 scope, workflows, wireframes, domain model, API contract, database schema, privacy rules, and sample scenarios.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Citizen request/status views, coordinator queue/assignment view, rescuer mission/status view, validation feedback, and API integration. |
| Backend | Versioned request, mission, assignment, and status/history endpoints; validation; errors; transaction handling; generated API documentation. |
| Database | Implemented collections/indexes; consistent request/mission history; sanitized seed/sample data; tested transaction boundaries. |
| Routing/geospatial | Contract stub or adapter returning a clearly identified placeholder route until routing is implemented. |
| AI/ML | Rule-risk adapter interface or neutral fallback; no trained-model dependency. |
| Testing/docs | Unit/API/component tests, main lifecycle integration test, updated contracts and setup/demo instructions. |

### Dependencies and realistic constraints

- Do not embed routing or model logic inside CRUD endpoints.
- Avoid complex production identity features unless Phase 1 requires them.
- Status transitions and assignment must reject invalid or conflicting changes.
- Synthetic contact/location data only.

### Exit criteria

- A request can be created, validated, stored, viewed, assigned, updated through allowed statuses, completed, and retained in history.
- Invalid transitions and partial assignment failures are tested.
- Frontend and backend use the same approved contract.
- The core lifecycle works without routing or ML availability.

### End-of-phase demonstration

Submit a synthetic request, assign it, update the mission as a rescuer, show its status/history in all relevant views, and demonstrate rejected invalid input or transition.

---

## Phase 3 — Mapping and Geospatial Pipeline

**Dates:** TBD
**Lead:** Clarence
**Support:** Elle, Ranee, Jared, and Matthew

### Goal

Produce a reproducible study-area geospatial pipeline and display validated road, flood, elevation, mission, and location context on the map.

### Main workstreams and owners

- Data acquisition, CRS alignment, clipping, validation, road-graph attributes — Clarence with Matthew.
- Leaflet map, layers, legends, interaction, accessibility — Elle with Clarence.
- Geospatial API/storage boundaries and queries — Ranee with Jared.

### Required inputs

Approved boundary and dataset register, dataset licenses/acquisition steps, coordinate policy, map wireframes, API/schema contracts, and sanitized sample records.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Responsive Leaflet map, study boundary, request/rescuer markers, flood context, layer controls, legends, data-time/source indicators, and accessible non-map details. |
| Backend | Versioned endpoints or static-asset contracts for geographic layers, bounding-box/nearby queries where required, validation and response-size limits. |
| Database | GeoJSON storage conventions and necessary `2dsphere` indexes for operational location queries. |
| Routing/geospatial | Reproducible download/process scripts, metadata, aligned/clipped layers, validated road graph, small test fixture, and quality report. |
| AI/ML | Feature-availability report tied to processed road segments; no model integration required. |
| Testing/docs | CRS/coordinate/coverage checks, map component tests, pipeline reproduction guide, attributions, and limitations. |

### Dependencies and realistic constraints

- Never commit large source/processed layers to normal Git history.
- GeoJSON coordinates are longitude then latitude; projected CRS may be needed for distance/area operations.
- Browser rendering requires simplified/clipped data and bounded payloads.
- Hazard and elevation resolution may not support road-level certainty.

### Exit criteria

- A teammate can reproduce a small study-area road graph and geographic layers from documented sources.
- Coordinate, coverage, license, and quality checks pass or limitations are accepted.
- The map presents mission context and distinguishes layer sources/timestamps.
- Routing-required edge identifiers and attributes are stable.

### End-of-phase demonstration

Rebuild the small test fixture, open the study-area map, toggle layers, inspect a road/mission location, and show data source, timestamp, CRS transformation, and known limitations.

---

## Phase 4 — Routing

**Dates:** TBD
**Lead:** Clarence
**Support:** Ranee, Jared, and Matthew

### Goal

Implement deterministic routing first, then add explainable flood, elevation, passability, and rule-risk effects plus controlled dynamic rerouting.

### Main workstreams and owners

- Graph costs, A*/Dijkstra, passability, scenarios, route explanations — Clarence.
- Backend route endpoint, validation, caching/error boundaries — Ranee with Jared.
- Risk formulation/evaluation support — Matthew.
- Route display and warnings — Elle as integration support.

### Required inputs

Validated road graph and edge attributes, route contract, controlled flood scenarios, request/rescuer coordinates, fallback rules, and agreed performance target.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Route geometry, summary, warnings, avoided-risk explanation, no-route state, scenario/time indicator, and reroute change presentation. |
| Backend | Validated routing endpoint/adapter, consistent error/no-route responses, route metadata, and integration tests. |
| Database | Optional route request/result or scenario references needed for reproducibility/history, without duplicating large graphs unnecessarily. |
| Routing/geospatial | Shortest-route baseline; weighted flood-aware route; impassable-edge exclusion; dynamic recalculation; explainable cost breakdown. |
| AI/ML | Rule-risk penalty interface and stable future model-adapter boundary; ML remains optional. |
| Testing/docs | Known-graph unit tests, unreachable destinations, coordinate snapping, scenario comparisons, performance evidence, formula/config documentation. |

### Dependencies and realistic constraints

- A* heuristics must remain admissible for the chosen cost or fall back to Dijkstra.
- Risk weights and thresholds are prototype assumptions, not safety guarantees.
- Snap distance and no-route behavior must be bounded and explicit.
- Dynamic rerouting uses controlled updates, not claimed live flood prediction.

### Exit criteria

- Baseline routes match known expected paths on test graphs.
- Increasing hazard changes cost/route predictably; impassable edges are never used.
- The response explains distance/time and material penalties.
- A safe failure occurs when no valid route exists.
- The backend and frontend demonstrate rerouting without ML.

### End-of-phase demonstration

Compare shortest and flood-aware routes for the same mission, make one segment impassable in a controlled scenario, reroute, and explain why the result changed.

---

## Phase 5 — AI/ML

**Dates:** TBD
**Lead:** Matthew
**Support:** Ranee, Clarence, and Jared

### Goal

Determine whether available evidence supports a useful road-risk/passability model and integrate it only when it improves on the documented rule baseline without breaking explainability or fallback behavior.

### Main workstreams and owners

- Dataset design, preprocessing, baselines, experiments, metrics, error analysis — Matthew.
- Routing-cost translation — Clarence with Matthew.
- Backend inference adapter/fallback — Ranee with Jared.
- Risk explanation display — Elle as integration support.

### Required inputs

Approved target, feature/label definitions, leakage-safe split plan, processed data, routing contract, rule baseline, evaluation criteria, and resource limits.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Clear risk contribution, uncertainty/limitation notice, model/fallback indicator when useful; no opaque “AI-safe” claim. |
| Backend | Versioned inference adapter, schema validation, timeout/error fallback, model metadata, and deterministic behavior when unavailable. |
| Database | Minimal approved prediction/model-version metadata only when needed for evaluation or reproducibility. |
| Routing/geospatial | Bounded model penalty combined with deterministic constraints; impassability and human decisions remain authoritative. |
| AI/ML | Reproducible dataset preparation, rule baseline, candidate model experiments, held-out evaluation, error analysis, model card, and integration recommendation. |
| Testing/docs | Reproducibility test, fallback/unavailable/malformed cases, baseline comparison, subgroup/scenario errors, dependency/artifact instructions. |

### Dependencies and realistic constraints

- The valid result may be “do not integrate ML” if labels, coverage, generalization, or improvement are inadequate.
- Prevent temporal/spatial leakage and document the split strategy.
- Prefer manageable, explainable models; XGBoost is not in the approved baseline dependencies unless separately approved.
- Generated artifacts stay outside ordinary Git unless small and explicitly approved.

### Exit criteria

- The rule baseline and evaluation protocol are reproducible.
- Candidate results are compared on relevant held-out data with error analysis, not accuracy alone.
- The team records an integrate/do-not-integrate decision and limitations.
- If integrated, the adapter is versioned, explainable, bounded, and safely falls back.

### End-of-phase demonstration

Show the rule baseline and evaluation report. If approved, compare one route with and without the model penalty and then disable the model to prove fallback. If rejected, demonstrate the evidence-based fallback-only decision.

---

## Phase 6 — Offline Simulation

**Dates:** TBD
**Lead:** Ranee
**Support:** Jared and Elle

### Goal

Demonstrate limited, transparent operation during temporary connectivity loss and validated synchronization after reconnection.

### Main workstreams and owners

- Offline policy, synchronization API, conflict validation — Ranee with Jared.
- IndexedDB/Dexie cache, queued UI, stale/pending indicators — Elle.
- Route/scenario cache limits — Clarence as needed.

### Required inputs

Stable mission/status contracts, online lifecycle, route response, authorized offline actions, retention limits, conflict rules, and test scenarios.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Cached assigned mission/location/route/context, timestamped queue, Pending Sync state, stale/offline banners, retry and conflict feedback. |
| Backend | Idempotent sync endpoint, validation, ordering/conflict response, audit-friendly result, and duplicate handling. |
| Database | Sync-event representation and indexes/retention as approved; consistent mission history after replay. |
| Routing/geospatial | Clearly timestamped cached route/context; no implication that an offline route reflects current conditions. |
| AI/ML | Last-known risk metadata only if required; inference must not be falsely represented as current while offline. |
| Testing/docs | Offline/reconnect/duplicate/out-of-order/rejected-event scenarios, cache-clearing/privacy tests, and limitation guide. |

### Dependencies and realistic constraints

- Scope is temporary internet interruption, not mesh/radio/satellite communications.
- Only explicitly approved actions may be queued.
- Client timestamps are evidence, not automatic authority; backend rules remain authoritative.
- Cached sensitive data require minimal retention and a clear clearing/logout policy.

### Exit criteria

- An assigned mission and essential context remain viewable without a network.
- An allowed update is queued with visible Pending Sync state.
- Reconnection sync is idempotent and produces an accepted or understandable rejected/conflict result.
- Stale information is never presented as live.

### End-of-phase demonstration

Load a mission online, disconnect, view cached details, queue a status update, reconnect, sync it once, and show both successful and conflicting/rejected outcomes.

---

## Phase 7 — Integration and Testing

**Dates:** TBD
**Lead:** Ranee
**Support:** All members

### Goal

Verify the complete prototype under normal and failure scenarios, resolve critical integration defects, document evidence and limitations, and prepare a reproducible final demonstration.

### Main workstreams and owners

- Test coordination, release scope, defect triage, final demo — Ranee.
- Backend/database/integration reliability — Ranee with Jared.
- UX, accessibility, browser/responsive flows — Elle.
- Routing/geospatial scenarios — Clarence.
- ML/fallback reproducibility and claims — Matthew.

### Required inputs

Integrated outputs from Phases 2–6, approved acceptance scenarios, sanitized test data, environment/setup guide, known-risk register, and presentation criteria.

### Expected outputs

| Area | Phase output |
|---|---|
| Frontend | Polished critical journeys, accessible/responsive states, clear failure/stale/offline/risk messaging, and final demo configuration. |
| Backend | Stable API, validation, transaction consistency, predictable failures, logs suitable for debugging without private data, and final contract docs. |
| Database | Verified indexes, consistent histories, sanitized reproducible seed/fixtures, backup/reset instructions appropriate to the prototype. |
| Routing/geospatial | Reproducible route comparisons, no-route and reroute cases, data attributions and limitations. |
| AI/ML | Reproduced evaluation, model/fallback verification, model card or fallback decision, bounded claims. |
| Testing/docs | End-to-end suite and manual scripts, defect record, traceability/results report, setup/runbook, architecture, final limitations, and demo plan. |

### Dependencies and realistic constraints

- Prioritize the main rescue workflow and credible failure behavior over unfinished extras.
- Do not hide unresolved safety, data, or reproducibility limitations.
- Tests must use sanitized/synthetic records and controlled scenarios.
- Demo dependencies need a reset/recovery plan; internet-dependent sources may be unavailable.

### Exit criteria

- Critical end-to-end scenarios pass or have documented accepted limitations.
- No open defect blocks the main demonstration or corrupts mission history.
- Deterministic routing and rule fallback work independently of ML.
- Offline, stale data, no-route, invalid transition, and data-unavailable cases are understandable.
- A new teammate can follow the setup guide and reproduce the demonstration.
- Final claims match the evidence and academic scope.

### End-of-phase demonstration

Run the full synthetic rescue workflow: request, validation, assignment, map context, deterministic/flood-aware route, controlled reroute, mission updates, temporary offline queue, reconnection sync, completion/history, and at least one safe failure/fallback case.

## Roadmap change control

Changes to phase sequence, MVP scope, stack, study area, safety claims, or major contracts require a GitHub research/decision Issue and a recorded team decision. Routine task detail belongs in Issues, while [STATUS.md](STATUS.md) and [DASHBOARD.md](DASHBOARD.md) summarize current execution.
