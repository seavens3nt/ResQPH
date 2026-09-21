# Project Context

- **Project:** ResQPH, an academic flood-aware rescue coordination and routing prototype.
- **Users:** simulated citizen, volunteer, coordinator, and rescuer roles.
- **Geography:** project-defined `ubelt-pilot-v1` boundary in the City of Manila; not an official district or operational service area.
- **Hazard boundary:** controlled scenario is the required source; historical layers are optional enrichment and must not be represented as live.
- **Required path:** rescue request, coordinator assignment, rescuer mission/status, bounded OSM graph, deterministic A*, rule-based penalties/fallback, and verification.
- **ML boundary:** Logistic Regression and Random Forest experiment is required; XGBoost is excluded; runtime penalty integration requires the evidence threshold and Ranee's acceptance.
- **Offline boundary:** one cached assigned mission and one queued next-valid status update.
- **Authentication boundary:** client/server role simulation only; never describe it as secure production authentication.
- **Safety boundary:** no official dispatch, guaranteed-safe route, nationwide coverage, government integration, or actual-emergency use.
- **Priority authority:** `docs/requirements/MVP_SCOPE.md`, especially its three-tier time-constrained delivery order.
- **Other authorities:** `docs/ROADMAP.md`, `docs/TEAM.md`, `docs/api/API_CONTRACT.md`, `docs/database/MONGODB_SCHEMA.md`, `docs/routing/ROUTING_CONTRACT.md`, `docs/ml/ML_FEASIBILITY.md`, and `docs/offline/OFFLINE_CONTRACT.md`.
- **Current phase:** Project Foundation Phase 2 — Core Application; executable guide at `docs/phases/PHASE-02.md`.
- **Owners:** Ranee—PM/core backend/gates; Jared—backend mission lifecycle/integration; Elle—primary UI/UX/citizen frontend; Clarence—coordinator/rescuer frontend; Matthew—geospatial/routing/ML beginning with Team Phase 1.
- **Last verified:** 2026-09-22 against Phase 1 merge commit `991c325` and the approved time-constrained Phase 2 alignment.
