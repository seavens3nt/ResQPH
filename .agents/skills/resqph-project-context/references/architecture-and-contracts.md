# Architecture and Contracts

## Directory map

- `frontend/`: React/TypeScript/Vite role views, Leaflet map, API client, limited client caching, and frontend tests.
- `backend/`: FastAPI, Pydantic validation, async PyMongo, lifecycle services, evidence-gated integration adapters, and backend tests.
- `routing/`: bounded OSMnx/NetworkX graph preparation and deterministic flood-aware routing.
- `ml/`: rule baseline, isolated external XGBoost evidence package, evaluation, metadata, checksums, and tests. The external artifact is not a runtime adapter.
- `data/`: metadata, reproducible acquisition/processing instructions, and small sanitized fixtures.
- `docs/`: authoritative scope, architecture, contracts, roadmap, phase gates, status, and evidence.
- `tests/`: cross-component acceptance checks, including the deterministic engine-to-API route flow.

- `frontend/public/offline-shell.js`: production UI-shell-only service worker; no API or map-tile caching.
- `frontend/src/features/offline/`: validated actor-scoped Dexie storage and reconnect controller.
- `frontend/src/features/workspace/`: active three-role local workspaces and shared shell/cards/modal presentation. Current UI authority: `docs/ui/LOCAL_VISUAL_RULES.md`; it supersedes older wireframe details for the local candidate without changing API payloads.

## Locked interfaces

Citizen Home weather: frontend `api/weather.ts` and `useUbeltWeather.ts` call
GET /api/v1/weather/ubelt. Backend `api/routes/weather.py` requests Google Weather
current conditions and one-day forecast for 14.6042,120.9946, with eight-second
timeouts and validated Celsius data. GOOGLE_WEATHER_API_KEY is server-only.
Optional normalized fields: feelsLike (Celsius), windSpeed (km/h), rainChance
(percent), rainAmount (mm); omitted values are null, never synthetic zeroes.
No stored weather or routing coupling; client loads on Home mount/reload only,
no disk persistence, explicit unavailable/stale feedback and Google Maps attribution.
Missing key returns 503 weather_not_configured; provider failures return a sanitized
503 weather_unavailable. Runtime dependency httpx is required.
GET /api/v1/weather/ubelt/hourly separately requests six Google forecast intervals;
`HourlyWeather.tsx` renders real columns instead of `/figma-home/5d940.png`.
Current weather adds humidity and windDirection. First-hour forecast rain is mm
in its interval, not an observed mm/hr rate. Both queries run independently,
load on mount/reload only, and retain explicit unavailable/stale states.

- API: `docs/api/API_CONTRACT.md`
- MongoDB: `docs/database/MONGODB_SCHEMA.md`
- Lifecycle: `docs/workflows/RESCUE_LIFECYCLE.md`
- Routing: `docs/routing/ROUTING_CONTRACT.md`
- ML: `docs/ml/ML_FEASIBILITY.md` and `data/samples/ml-road-risk-contract.example.json`
- Offline: `docs/offline/OFFLINE_CONTRACT.md`, `docs/offline/OFFLINE_IMPLEMENTATION.md`, and `data/samples/offline-mission.example.json`
- UI states: `docs/ui/UI_STATES.md` and `docs/ui/WIREFRAMES.md`
- Boundary and joins: `data/samples/study-area.geojson`, `ubelt-v1-preview.geojson`, and `ubelt-v1-flood-join.geojson`
- Routing verification: `data/samples/routing-known-graph.example.json`, `route-found.example.json`, and `no-route.example.json`

## Canonical verification

- Frontend: `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build` from `frontend/`.
- Backend: `.\.venv\Scripts\python.exe -m ruff check app tests ..\tests\integration` and `.\.venv\Scripts\python.exe -m pytest` from `backend/`, plus the explicit cross-layer test under `tests/integration/`.
- Routing: Ruff and Pytest from `routing/`.
- MongoDB: `docker compose up -d` and replica-set health through `mongosh`.
- Documentation: parse JSON/GeoJSON fixtures, resolve local Markdown links, inspect terminology, and run `git diff --check`.

## Integration constraints

- The core lifecycle must work while routing and ML adapters are unavailable.
- PR #80 verifies mission status, linked request status/history, team availability,
  and immutable event persistence within one transaction. Completion releases the
  team; mismatched links return `409 lifecycle_conflict` without partial writes.
  Backend evidence does not establish browser/cache acceptance.
- Deterministic rule penalties and impassable-edge exclusion take priority over ML output.
- Runtime model loading requires explicit enablement, SHA-256, and exact target,
  version, and ordered-feature metadata. The Ondoy artifact fails this contract
  intentionally and must remain disabled.
- `edge_id` is the stable road/flood/routing/ML join key. The accepted U-Belt format is `ubelt-v1:<u>:<v>:<key>`.
- Frontend prototype state is not proof of backend persistence or integration.
- Runtime labels must identify controlled, simulated, historical, cached, stale, or pending-sync data accurately.

Last verified against commit: `3ecedb1` plus Issue #64 integration gate. True offline reload verification uses a production build and preview, not Vite development mode.
