# Project Context

- **Project:** ResQPH, an academic flood-aware rescue coordination and routing prototype.
- **Users:** simulated citizen, volunteer, coordinator, and rescuer roles.
- **Geography:** project-defined `ubelt-pilot-v1` boundary in the City of Manila; not an official district or operational service area.
- **Hazard boundary:** controlled scenario is the required source; historical layers are optional enrichment and must not be represented as live.
- **Required path:** rescue request, coordinator assignment, rescuer mission/status, bounded OSM graph, deterministic A*, rule-based penalties/fallback, and verification.
- **ML boundary:** The external Ondoy XGBoost package is completed exploratory evidence. Its files and checksums are verifiable, but its random-row metrics were not regenerated from raw data and do not establish spatial/U-Belt accuracy. Its target and ordered features are runtime-incompatible. The rule fallback remains operative.
- **Offline boundary:** one cached assigned mission and one queued next-valid status update.
- **Authentication boundary:** client/server role simulation only; never describe it as secure production authentication.
- **Safety boundary:** no official dispatch, guaranteed-safe route, nationwide coverage, government integration, or actual-emergency use.
- **Priority authority:** `docs/requirements/MVP_SCOPE.md`, especially its three-tier time-constrained delivery order.
- **Other authorities:** `docs/ROADMAP.md`, `docs/TEAM.md`, `docs/api/API_CONTRACT.md`, `docs/database/MONGODB_SCHEMA.md`, `docs/routing/ROUTING_CONTRACT.md`, `docs/ml/ML_FEASIBILITY.md`, and `docs/offline/OFFLINE_CONTRACT.md`.
- **Current phase:** Team Phase 2 is completed and verified. Team Phase 3 external evidence is accepted with conditions; Ranee owns one post-routing fallback/evidence reconciliation before Team Phase 4 opens.
- **Owners:** Ranee—PM/core backend/gates; Jared—backend mission lifecycle/integration; Elle—primary UI/UX/citizen frontend; Clarence—coordinator/rescuer frontend; Matthew—geospatial/routing/ML beginning with Team Phase 1.
- **Current assignment:** Team Phase 3 reconciliation is Ranee-only; no member package or handoff is active.
- **Last verified:** 2026-10-04 against `main` at `6096ddc` plus the pending Team Phase 2 gate record.
