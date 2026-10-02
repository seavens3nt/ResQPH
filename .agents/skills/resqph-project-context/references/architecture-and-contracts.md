# Architecture and Contracts

## Directory map

- `frontend/`: React/TypeScript/Vite role views, Leaflet map, API client, limited client caching, and frontend tests.
- `backend/`: FastAPI, Pydantic validation, async PyMongo, lifecycle services, evidence-gated integration adapters, and backend tests.
- `routing/`: bounded OSMnx/NetworkX graph preparation and deterministic flood-aware routing.
- `ml/`: rule baseline, isolated external XGBoost evidence package, evaluation, metadata, checksums, and tests. The external artifact is not a runtime adapter.
- `data/`: metadata, reproducible acquisition/processing instructions, and small sanitized fixtures.
- `docs/`: authoritative scope, architecture, contracts, roadmap, phase gates, status, and evidence.
- `tests/`: planned cross-component and end-to-end verification.

## Locked interfaces

- API: `docs/api/API_CONTRACT.md`
- MongoDB: `docs/database/MONGODB_SCHEMA.md`
- Lifecycle: `docs/workflows/RESCUE_LIFECYCLE.md`
- Routing: `docs/routing/ROUTING_CONTRACT.md`
- ML: `docs/ml/ML_FEASIBILITY.md` and `data/samples/ml-road-risk-contract.example.json`
- Offline: `docs/offline/OFFLINE_CONTRACT.md`
- UI states: `docs/ui/UI_STATES.md` and `docs/ui/WIREFRAMES.md`
- Boundary and joins: `data/samples/study-area.geojson`, `ubelt-v1-preview.geojson`, and `ubelt-v1-flood-join.geojson`
- Routing verification: `data/samples/routing-known-graph.example.json`, `route-found.example.json`, and `no-route.example.json`

## Canonical verification

- Frontend: `npm ci`, `npm run lint`, `npm test`, `npm run build` from `frontend/`.
- Backend: `.\.venv\Scripts\python.exe -m ruff check app tests` and `.\.venv\Scripts\python.exe -m pytest` from `backend/`.
- MongoDB: `docker compose up -d` and replica-set health through `mongosh`.
- Documentation: parse JSON/GeoJSON fixtures, resolve local Markdown links, inspect terminology, and run `git diff --check`.

## Integration constraints

- The core lifecycle must work while routing and ML adapters are unavailable.
- Deterministic rule penalties and impassable-edge exclusion take priority over ML output.
- Runtime model loading requires explicit enablement, SHA-256, and exact target,
  version, and ordered-feature metadata. The Ondoy artifact fails this contract
  intentionally and must remain disabled.
- `edge_id` is the stable road/flood/routing/ML join key. The accepted U-Belt format is `ubelt-v1:<u>:<v>:<key>`.
- Frontend prototype state is not proof of backend persistence or integration.
- Runtime labels must identify controlled, simulated, historical, cached, stale, or pending-sync data accurately.

Last verified against commit: `7541c65` plus the Team Phase 1 gate correction.
