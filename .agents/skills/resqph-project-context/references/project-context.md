# Project Context

- **Project:** ResQPH, an academic flood-aware rescue coordination and routing prototype.
- **Users:** simulated Citizen, Dispatcher and Rescuer roles. Dispatcher retains the internal `coordinator` role/API value.
- **Current local scope decision (2026-10-07):** Volunteer workflow, rescuer hotline and alternative-route UI are retired; retain one controlled flood-aware mission route. Reject old Volunteer sessions/role headers, leave historical stored records intact, and do not register hazard-report endpoints. See `docs/decisions/2026-10-07-three-role-workflow.md`. This local scope update does not change dated phase verification or release/acceptance gates.
- **Geography:** project-defined `ubelt-pilot-v1` boundary in the City of Manila; not an official district or operational service area.
- **Hazard boundary:** controlled scenario is the required source; historical layers are optional enrichment and must not be represented as live.
- **Weather amendment (2026-10-10):** Ranee approved Google Weather for informational current conditions/daily high-low and six-hour forecasts, replacing both Home demo weather cards. The Home controlled warning is removed. Keep weather separate from controlled flood routing. No claim of live flood prediction or PAGASA measurements; no automatic refresh.
- **Required path:** rescue request, coordinator assignment, rescuer mission/status, bounded OSM graph, deterministic A*, rule-based penalties/fallback, and verification.
- **ML boundary:** The external Ondoy XGBoost package is completed exploratory evidence. Its files and checksums are verifiable, but its random-row metrics were not regenerated from raw data and do not establish spatial/U-Belt accuracy. Its target and ordered features are runtime-incompatible. The rule fallback remains operative.
- **Offline boundary:** one cached assigned mission and one queued next-valid status update.
- **Authentication boundary:** client/server role simulation only; never describe it as secure production authentication.
- **Safety boundary:** no official dispatch, guaranteed-safe route, nationwide coverage, government integration, or actual-emergency use.
- **Priority authority:** `docs/requirements/MVP_SCOPE.md`, especially its three-tier time-constrained delivery order.
- **Other authorities:** `docs/ROADMAP.md`, `docs/TEAM.md`, `docs/api/API_CONTRACT.md`, `docs/database/MONGODB_SCHEMA.md`, `docs/routing/ROUTING_CONTRACT.md`, `docs/ml/ML_FEASIBILITY.md`, and `docs/offline/OFFLINE_CONTRACT.md`.
- **Current phase:** Team Phase 4 verified through Issue #64 gate; Team Phase 5 integration/testing/presentation active. Phase 3 retains conditions.
- **Owners:** Ranee—PM/core backend/gates; Jared—backend mission lifecycle/integration; Elle—primary UI/UX/citizen frontend; Clarence—coordinator/rescuer frontend; Matthew—geospatial/routing/ML beginning with Team Phase 1.
- **Current assignment:** Ranee setup/release; Elle frontend acceptance; Clarence demo/presentation; Jared backend/database acceptance; Matthew routing/ML evidence. No personal handoffs.
- **Last verified:** 2026-10-05 against main `3ecedb1` plus Issue #64 integration gate; see docs/STATUS.md.
- **Current local amendment (2026-10-09):** Inter/shared styles, full-width desktop canvases, dashboard rescue/review modal, tracking popup and inline Map states. Current working tree is not merged; use `docs/ui/LOCAL_VISUAL_RULES.md` rather than old inline-details/SF Pro/Fredoka references. Fresh-request offline acceptance remains open; see `docs/STATUS.md`.
