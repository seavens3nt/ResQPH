# Project Context

- **Project:** ResQPH, an academic flood-aware rescue coordination and routing prototype.
- **Users:** simulated citizen, volunteer, coordinator, and rescuer roles.
- **Geography:** project-defined `ubelt-pilot-v1` boundary in the City of Manila; not an official district or operational service area.
- **Hazard boundary:** controlled scenario is the required source; historical layers are optional enrichment and must not be represented as live.
- **Required path:** rescue request, coordinator assignment, rescuer mission/status, bounded OSM graph, deterministic A*, rule-based penalties/fallback, and verification.
- **ML boundary:** XGBoost is the accepted candidate experiment; its team-reported ROC-AUC `0.97` and recall `0.92` remain unverified until the reproducible package is reviewed. Runtime penalty integration requires the evidence threshold and Ranee's acceptance, and the rule fallback remains mandatory.
- **Offline boundary:** one cached assigned mission and one queued next-valid status update.
- **Authentication boundary:** client/server role simulation only; never describe it as secure production authentication.
- **Safety boundary:** no official dispatch, guaranteed-safe route, nationwide coverage, government integration, or actual-emergency use.
- **Priority authority:** `docs/requirements/MVP_SCOPE.md`, especially its three-tier time-constrained delivery order.
- **Other authorities:** `docs/ROADMAP.md`, `docs/TEAM.md`, `docs/api/API_CONTRACT.md`, `docs/database/MONGODB_SCHEMA.md`, `docs/routing/ROUTING_CONTRACT.md`, `docs/ml/ML_FEASIBILITY.md`, and `docs/offline/OFFLINE_CONTRACT.md`.
- **Current phase:** Team Phase 1 — Mapping and Geospatial Pipeline opens after the Foundation Phase 2 gate documentation is merged; Foundation Phase 2 evidence is recorded in `docs/phases/PHASE-02-GATE.md`.
- **Owners:** Ranee—PM/core backend/gates; Jared—backend mission lifecycle/integration; Elle—primary UI/UX/citizen frontend; Clarence—coordinator/rescuer frontend; Matthew—geospatial/routing/ML beginning with Team Phase 1.
- **Last verified:** 2026-09-29 against Foundation Phase 2 implementation merges through PR #23 (`21a779d`) and the Phase 2 gate verification branch.
