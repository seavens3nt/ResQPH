# ResQPH Project Presentation Outline — Slide-by-Slide Evidence Mapping

**Document Version:** 1.0.0  
**Phase Baseline:** Team Phase 5 Integration & Defense Preparation  
**Author:** Clarence (UI/UX and Frontend Contributor)  
**Gate Owner / Reviewer:** Ranee (Project Manager and Primary Backend Contributor)  
**Notice:** This outline structures the final academic defense and technical presentation. Neither a finished slide deck file nor a recorded video exists until physically produced during the rehearsal sessions ([`docs/presentation/REHEARSAL_CHECKLIST.md`](REHEARSAL_CHECKLIST.md)).

---

## Slide 1: Title & Project Identity

- **Main Title:** ResQPH — Flood-Aware Rescue Coordination and Routing Prototype
- **Subtitle:** An Evidence-Aligned Architecture for Disaster Response under Intermittent Connectivity
- **Academic Context:** Software Engineering 1 — 3rd Year, 1st Term, National University
- **Team Members & Roles:**
  - **Ranee Mikaella Gutierrez:** Project Manager & Primary Backend Lead
  - **Jared Noel:** Primary Backend & Integration Lead
  - **Elle:** Primary UI/UX & Frontend Lead
  - **Matthew Trinitaria:** Primary AI/ML, Geospatial & Routing Lead
  - **Clarence:** UI/UX & Frontend Contributor (Presentation & Offline Surfaces)
- **Controlled Pilot Area:** U-Belt Pilot Area, City of Manila (`ubelt-pilot-v1`)
- **Visuals:** Project brand lockup, U-Belt boundary map overlay, disclaimer badge: *"Academic Research Prototype — Not for Live Emergency Dispatch"*.

---

## Slide 2: Problem Context & Research Motivation

- **Urban Flooding Reality:** The University Belt in Manila suffers severe localized flooding during typhoons and monsoon rains, causing stranded citizens, severed transport corridors, and disrupted emergency services.
- **Coordination Challenges:**
  - Citizen rescue requests are often unstructured and lack standardized triage.
  - Dispatchers lack transparent, explainable flood-aware routing.
  - Field responders face frequent cellular outages and intermittent mobile data connectivity.
- **ResQPH Value Proposition:** A unified academic prototype connecting citizen requests, coordinator assignments, deterministic A* flood routing, and single-mission offline resilience with strict idempotency.
- **Authoritative Contract:** [`docs/requirements/MVP_SCOPE.md`](../requirements/MVP_SCOPE.md)

---

## Slide 3: Scope Boundaries & Ethical Disclosures (What ResQPH is NOT)

- **Mandatory Disclosures:**
  - **Not Live Forecasting:** Operates strictly on historical and controlled flood scenarios; no live hydrological modeling.
  - **Not Production Auth:** Prototype role simulation using headers (`X-Demo-Role`, `X-Demo-User-Id`) and client state; no production OAuth, MFA, or real identity credentials.
  - **Not Nationwide:** Confined strictly to the curated U-Belt bounding box (WGS 84: `[120.9820, 14.5960]` to `[121.0040, 14.6175]`).
  - **Not Full Offline Maps:** Service worker caches only the UI shell (`index.html`, compiled CSS/JS); map tiles and API calls are not pre-downloaded offline.
  - **Not Autonomous Dispatch:** All mission assignments require human coordinator review.
- **Evidence Reference:** [`docs/requirements/MVP_SCOPE.md`](../requirements/MVP_SCOPE.md), [`docs/decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md)

---

## Slide 4: System Architecture & Technology Stack

- **Architectural Diagram:** Three-tier modular architecture with clear contract boundaries:
  - **Client Tier:** React 18, TypeScript, Vite, React Router 6, Leaflet / React-Leaflet, Service Worker shell (`offline-shell.js`), IndexedDB (`idb`).
  - **Application Tier:** FastAPI (Python 3.12), Pydantic v2 data schemas, Uvicorn, REST API (`/api/v1`).
  - **Data Tier:** MongoDB 8.x single-node replica set with multi-document ACID transactions and geospatial 2dsphere indexing.
  - **Routing Engine:** Deterministic A* algorithm implemented in Python over an OSMnx-curated OpenStreetMap graph.
- **Member Ownership:**
  - Frontend core & maps: Elle & Clarence
  - Backend API & DB transactions: Ranee & Jared
  - Geospatial pipeline & routing algorithms: Matthew
- **Contract Reference:** [`docs/api/API_CONTRACT.md`](../api/API_CONTRACT.md), [`docs/database/DATABASE_DESIGN.md`](../database/DATABASE_DESIGN.md)

---

## Slide 5: The Rescue Lifecycle — State Machine & Atomicity

- **Lifecycle Flowchart:**
  ```text
  [Citizen Submit] -> Request: pending
                           | (Coordinator Assigns Unit)
                           v
            Request: assigned <---> Mission: assigned (Version 1)
                           | (Rescuer Begins Travel)
                           v
            Request: en-route <---> Mission: en-route (Version 2)
                           | (Rescuer Confirms Arrival)
                           v
            Request: arrived  <---> Mission: arrived  (Version 3)
                           | (Rescuer/Coordinator Completes)
                           v
            Request: completed <--> Mission: completed (Version 4)
  ```
- **Atomicity & Consistency:**
  - Multi-document MongoDB transactions ensure that request status and mission assignment change atomically.
  - Version increments (`version: 1 -> 2 -> 3 -> 4`) enforce optimistic concurrency control across all online and offline state changes.
- **Contract Reference:** [`docs/workflows/RESCUE_LIFECYCLE.md`](../workflows/RESCUE_LIFECYCLE.md)

---

## Slide 6: Flood-Aware Deterministic Routing & Cost Model

- **Primary Algorithm:** Deterministic A* routing across bounded U-Belt road graph (`ubelt-pilot-v1`).
- **Explainable Cost Formulation:**
  $$\text{Edge Cost} = \text{Base Travel Cost} + \text{Flood Penalty} + \text{Passability Penalty} + \text{Bounded ML Penalty}$$
- **Provisional Rule Table:**
  - `none`: +0 penalty
  - `low` flood: +30 cost units
  - `moderate` flood: +90 cost units
  - `high` flood: +240 cost units & hazard warning
  - `severe` or `impassable`: Complete edge exclusion (cannot be traversed)
  - `restricted` passability: +180 cost units
- **Verified Evidence:**
  - Known-graph fixture: [`data/samples/routing-known-graph.example.json`](../../data/samples/routing-known-graph.example.json)
  - Automated integration tests: `tests/integration/test_team_phase2_route_flow.py` (Passing).
- **Owner:** Matthew Trinitaria

---

## Slide 7: Exploratory AI/ML Feasibility — Reconciliation & Safe Fallback

- **Candidate Experiment:** XGBoost classifier trained on historical Ondoy 2009 Metro Manila road-flood data.
- **Reported Holdout Metrics:**
  - ROC-AUC: `0.9763`, Flooded-class Recall: `0.9231`, Flooded-class Precision: `0.2382`, F1: `0.3787` (307 false alarms, 8 false negatives).
- **Critical Evaluation & Defect Finding:**
  - Evaluated on a random row split, not a spatial/temporal split.
  - Trained on Ondoy 2009 features (`elevation_m`, `flood_depth_m`, `distance_to_evac_m`), which differ from the live U-Belt graph schema.
- **Engineering Decision (D-019 & ML Feasibility Gate):**
  - **Runtime integration is deferred.**
  - `ML_ENABLED=false` is enforced in backend runtime.
  - The routing engine executes deterministic rule-based safety penalties as an autonomous fallback.
  - Model cannot dominate safety exclusions or remove flood warnings.
- **Contract & Evidence:** [`docs/ml/ML_FEASIBILITY.md`](../ml/ML_FEASIBILITY.md)

---

## Slide 8: Limited Offline Architecture — Contract & Storage

- **Core Constraints (Tier 2 Resilience):**
  - Exactly **one** assigned mission cached per rescuer.
  - At most **one** next-valid status update queued while disconnected.
  - No offline request creation, no batch events, no automatic conflict merging.
- **Client Storage Architecture:**
  - **IndexedDB Stores:** `missions` (keyed by rescuer actor ID) and `offlineQueue` (keyed by actor ID).
  - **Service Worker (`offline-shell.js`):** Production caching of static UI assets (`index.html`, bundled JS, CSS); zero caching of dynamic API routes or map tiles.
- **Status Metadata & Disclosures:**
  - UI displays explicit tags: `Cached`, `Stale`, `Pending Sync`, `Sync Failed`.
  - Discloses last synchronization timestamp and notice: *"Conditions may have changed."*
- **Contract Reference:** [`docs/offline/OFFLINE_CONTRACT.md`](../offline/OFFLINE_CONTRACT.md)
- **Owners:** Ranee (Backend sync / Gate), Elle (Client flow), Clarence (UI presentation)

---

## Slide 9: Resilient Offline Presentation & Disconnected Reload

- **UI Components:**
  - `RescuerMissionCard`: Displays cached status, sync timestamp, and locks actions while an event is pending.
  - `RescuerOfflineQueue`: Displays event ID, expected version, and server confirmation status.
  - `SyncStatusBadge`: High-contrast indicator (`Online`, `Offline`, `Syncing`, `Synced`, `Failed`).
- **Demonstrated Physical Evidence (Phase 4 Gate):**
  - Disconnected page reload (`Ctrl+F5`) verified under zero network connectivity.
  - Service worker delivers application shell; IndexedDB recovers cached mission and pending event byte-identically.
  - Switching to another rescuer (`rescuer-beta`) produces **Mission unavailable offline** (strict actor data isolation).
- **Verified Evidence:** `frontend/src/pages/dashboard/views/rescuer/RescuerOfflinePresentation.test.tsx` (10 passing tests), [`docs/testing/TEAM-PHASE-04-EVIDENCE.md`](../testing/TEAM-PHASE-04-EVIDENCE.md).
- **Owner:** Clarence

---

## Slide 10: Negative Scenarios — Conflict Resolution & No-Route Handling

- **Negative Scenario 1: Routing Disconnection (No-Route State):**
  - Controlled scenario severs all bridges/corridors with `severe` impassability.
  - A* returns `status: "no-route"`, `reason: "controlled_impassability_disconnected_destination"`.
  - UI presents `NoRouteState` alert: forbids straight-line substitutes and warns dispatcher.
- **Negative Scenario 2: Offline Status Conflict (HTTP 409 Version Conflict):**
  - Rescuer queues `arrived` expecting version 2; server was concurrently bumped to version 3.
  - On reconnect, API returns HTTP 409 Conflict.
  - UI preserves the failed event for review, displays latest authorized server state (`version 3`), and locks further actions until rescuer clicks **Discard Failed Event After Review**.
- **Negative Scenario 3: Corrupt Storage Handling:**
  - Corrupt or invalid IndexedDB schema is trapped safely; UI displays explicit storage error rather than fabricating data.
- **Contract Reference:** [`docs/api/API_CONTRACT.md`](../api/API_CONTRACT.md), [`data/samples/no-route.example.json`](../../data/samples/no-route.example.json)

---

## Slide 11: Member Contributions Matrix

| Contributor | GitHub | Primary Component Ownership | Verified Evidence Artifacts |
|---|---|---|---|
| **Ranee Mikaella Gutierrez** | `@seavens3nt` | Project Lead, Backend Core, MongoDB Transactions, Offline Sync Engine, Phase Gates | `docs/phases/TEAM-PHASE-04-GATE.md`, 15 MongoDB offline tests, API router |
| **Jared Noel** | `@AshenDary` | Backend Endpoints, DB Schemas, Validation & Integration Tests, Negative Acceptance | `backend/tests/test_phase4_integration.py`, integration test suites |
| **Elle** | `@Qiuyuan26` | UI/UX Lead, Citizen & Coordinator Views, Leaflet Map Integration, Responsive Layouts | Citizen & Coordinator views, Map layers, `phase5RoleFlows.test.tsx` |
| **Matthew Trinitaria** | `@matthew-sudo2` | Geospatial Pipeline, Bounded OSM Extraction, Deterministic A*, ML Feasibility Study | `data/samples/routing-known-graph.example.json`, `docs/ml/ML_FEASIBILITY.md` |
| **Clarence** | `@ClarenceArillo` | Frontend Presentation, Offline Queue/Mission Cards, Accessible UI, Demo Script & Rehearsal | `RescuerOfflinePresentation.test.tsx`, `DEMO_SCRIPT.md`, `REHEARSAL_CHECKLIST.md` |

---

## Slide 12: Automated Quality & Verification Evidence

- **Automated Check Results (Accepted Main `df5a29d`):**
  - **Frontend:** `npm test -- --run` -> **234 unit & presentation tests passed**; TypeScript check and build passed.
  - **Backend:** `pytest` -> **177 backend and integration tests passed** across two test commands.
  - **Integration:** 15 dedicated MongoDB offline integration tests run against isolated replica set (zero skips).
  - **Code Quality:** Ruff linter passed cleanly on backend; ESLint passed on frontend.
- **Disclosed Quality Warnings (Assigned to Phase 5):**
  - Vite large bundle warning (`dist/assets/index.js` > 500 kB, due to Leaflet + React runtime).
  - 4 disclosed frontend linter warnings (non-blocking).
  - Development dependency audit warning (`jsdom` to `undici`).
- **Contract Reference:** [`docs/testing/TEAM-PHASE-04-EVIDENCE.md`](../testing/TEAM-PHASE-04-EVIDENCE.md)

---

## Slide 13: Live Demonstration Structure (Reference to Demo Script)

- **Demonstration Flow (Run against Accepted Main):**
  1. Citizen creates assistance request with low flood report.
  2. Coordinator inspects request, evaluates A* route, observes flood penalty reroute, and assigns team.
  3. Rescuer Alpha retrieves mission online and advances to `en-route`.
  4. Network connection severed; Rescuer Alpha views cached mission with stale disclosure.
  5. Rescuer queues `arrived` update; queue locks; disconnected browser reload executed (`F5`).
  6. Reconnection restored; queue auto-syncs; server commits Version 3.
  7. Negative demonstration: Severe flood triggers `No-Route` state; version conflict triggers preserved event review.
- **Full Runnable Script:** [`docs/presentation/DEMO_SCRIPT.md`](DEMO_SCRIPT.md)

---

## Slide 14: Conclusions, Key Learnings & Future Roadmap

- **Key Research Conclusions:**
  - Deterministic safety rules must always supersede unverified machine learning models in life-critical disaster routing.
  - Simple, robust offline contracts (1 mission, 1 queued event, explicit idempotency) provide reliable resilience without the hazards of complex distributed multi-master conflict resolution.
  - Transparent UI state labeling (`Cached`, `Stale`, `Pending Sync`) prevents user deception during network blackouts.
- **Future Directions (Beyond Phase 5 Scope):**
  - Production OAuth2/OIDC identity provider.
  - Vector map tiles and spatial bounding box offline caching.
  - Retraining road-risk ML on verified spatial/temporal splits using authentic Philippine PAGASA/MMDA datasets.
- **Final Note:** Passing Phase 5 gate authorizes academic presentation only; it does not constitute public deployment or operational emergency activation.
