# ResQPH architecture

## Development baseline

- Frontend: React, TypeScript, and Vite
- Map interface: Leaflet and React Leaflet
- Backend API: Python 3.12 and FastAPI
- Operational database: MongoDB through PyMongo
- Local database: MongoDB single-node replica set through Docker Compose
- Routing/geospatial: NetworkX, OSMnx, GeoPandas, Shapely, PyProj, and Rasterio as needed
- AI/ML: pandas, NumPy, scikit-learn, and joblib
- Offline client storage: IndexedDB through Dexie
- Testing: Vitest, Testing Library, Pytest, and HTTPX

## Architecture principles

- Keep one deployable FastAPI backend during the prototype; do not introduce microservices without evidence that they are needed.
- Keep API transport, business workflow, persistence, routing, and risk estimation as separate code boundaries.
- Build deterministic routing and a rule-based risk fallback before optional ML integration.
- Let contracts, not direct cross-language imports, connect the React and Python workspaces.
- Create folders when the first accepted Issue needs them; avoid large trees of empty placeholders.

## Runtime flow

```text
React client
    |
    v
FastAPI /api/v1
    |
    +--> MongoDB operational and geospatial collections
    |
    +--> Deterministic routing module
    |
    +--> AI/ML inference adapter or rule-based fallback
```

The initial backend is a modular application rather than several independently deployed services. Routing and AI/ML retain separate ownership and dependency boundaries. They may be split into services later only when evidence shows that the additional operational complexity is justified.

## Frontend boundary

The frontend owns citizen, rescuer, and dispatcher workflows; map interaction; route and risk presentation; stale-data indicators; and limited device-local offline state. It communicates with application data only through the versioned backend API.

## Backend boundary

The backend owns validation, authorization when required, rescue-request CRUD, mission assignment, status transitions, transaction boundaries, data synchronization, and integration with routing and AI/ML outputs.

## Routing boundary

The routing component begins with a deterministic A* or Dijkstra baseline. Its cost function may combine distance, travel time, flood hazard, elevation, passability thresholds, and an explainable risk penalty. Impassable roads are excluded from the graph.

## AI/ML boundary

The AI/ML component estimates road risk or passability only when the available data support a defensible model. A rule-based baseline and fallback are mandatory. Model output is translated into an explainable routing penalty and does not replace deterministic constraints or human decisions.

## Offline boundary

The client may cache assigned mission information, last-known victim location, current route, and selected geographic context. Offline updates are timestamped and queued as pending synchronization events. The backend validates them after reconnection.

## Data rules

MongoDB uses GeoJSON coordinate order: longitude first, latitude second. Large raw and processed datasets remain outside ordinary Git history. Dataset sources, licenses, coordinate reference systems, transformations, and limitations must be documented.

## Repository file architecture

### Current foundation

```text
ResQPH/
├── .github/                 Issue templates, pull-request template, and CI
├── .vscode/                 Shared recommended extensions and runnable tasks
├── frontend/                React/TypeScript client
├── backend/                 FastAPI application and backend tests
├── routing/                 Routing/geospatial workspace
├── ml/                      AI/ML investigation and implementation workspace
├── data/                    Metadata, ignored working data, and small fixtures
├── docs/                    Project, phase, sprint, and technical documentation
├── tests/integration/       Cross-component and end-to-end scenarios
├── AGENTS.md                Repository rules for coding assistants
├── compose.yaml             Local MongoDB replica set
└── README.md
```

This top-level separation is the approved structure. Do not add another root `client`, `server`, `api`, `database`, `model`, or `dataset` folder that duplicates an existing workspace.

### Frontend growth structure

Create these folders only as approved features begin:

```text
frontend/src/
├── app/                     Router, providers, and application-wide setup
├── api/                     Shared HTTP client and cross-feature API helpers
├── components/              Reusable presentation components
├── features/
│   ├── rescueRequests/      Citizen request and status behavior
│   ├── missions/            Coordinator/rescuer mission behavior
│   ├── map/                 Leaflet layers and route/risk presentation
│   └── offline/             Dexie cache, queue, and synchronization state
├── pages/                   Route-level page composition
├── types/                   Truly shared TypeScript types
└── test/                    Shared test setup and fixtures
```

Feature-specific components, schemas, hooks, API functions, and tests stay inside their feature. `components/` is only for genuinely reusable UI. Pages compose features but should not contain data-access or business rules.

### Backend growth structure

```text
backend/
├── app/
│   ├── api/routes/          Thin FastAPI route handlers
│   ├── core/                Configuration and cross-cutting application setup
│   ├── db/                  MongoDB client, indexes, and transaction helpers
│   ├── domain/              Entities, statuses, and business rules
│   ├── schemas/             Pydantic API request/response contracts
│   ├── repositories/        MongoDB persistence and queries
│   ├── services/            Rescue-request and mission workflow orchestration
│   └── integrations/        Adapters for routing and risk/ML components
└── tests/                   Backend unit, API, service, and repository tests
```

The intended call direction is:

```text
API route -> service -> domain rule -> repository or integration adapter
```

Routes validate transport concerns and translate responses; they do not directly implement mission rules or complex MongoDB operations. Repositories do not make UI or routing decisions. Integration adapters translate the backend contract to routing/ML contracts and own timeout, unavailable, malformed-result, and fallback behavior.

### Routing growth structure

```text
routing/
├── src/
│   └── resqph_routing/
│       ├── contracts.py     Route inputs, results, warnings, and explanations
│       ├── graph/           Graph building, loading, validation, and snapping
│       ├── algorithms/      Deterministic A* or Dijkstra implementation
│       ├── costs/           Distance, time, flood, elevation, and risk costs
│       └── scenarios/       Controlled flood changes and rerouting
├── tests/                   Small known graphs and routing behavior tests
├── README.md
└── requirements.txt
```

Routing code must not depend on FastAPI routes, MongoDB collections, React, notebooks, or a trained model. It accepts explicit inputs and returns an explainable result. When implementation begins, add reproducible package metadata and installation instructions rather than modifying `PYTHONPATH` in source code.

### AI/ML growth structure

```text
ml/
├── notebooks/               Exploration only
├── src/
│   └── resqph_ml/
│       ├── data/            Reproducible loading and preparation
│       ├── features/        Feature definitions and transformations
│       ├── baselines/       Mandatory rule-based baseline
│       ├── models/          Approved manageable model experiments
│       ├── evaluation/      Metrics, splits, error analysis, and reports
│       └── inference.py     Stable prediction interface when approved
├── tests/                   Transform, baseline, evaluation, and fallback tests
├── artifacts/               Ignored generated models and outputs
├── README.md
└── requirements.txt
```

Notebooks may call reusable code from `ml/src`, but production/backend code must never import notebooks. Generated artifacts are outputs, not source files. The routing and backend layers consume a stable risk result or the rule fallback, not a model-library-specific object.

### Data and documentation structure

```text
data/
├── raw/                     Ignored untouched source files
├── interim/                 Ignored intermediate outputs
├── processed/               Ignored generated application-ready data
├── samples/                 Small sanitized fixtures allowed in Git
└── metadata/                Sources, licenses, CRS, coverage, and limitations

docs/
├── phases/                  Detailed phase briefings
├── sprints/                 Sprint process and review records
├── workflows/               Approved user and status workflows
├── ARCHITECTURE.md          Architecture and placement source of truth
├── PROJECT_CONTEXT.md       Scope, terminology, limitations, and disclaimer
├── ROADMAP.md               Seven-phase outcome roadmap
├── STATUS.md                Current execution status
└── DASHBOARD.md             One-page navigation and health summary
```

Phase 1 may add requirements, UI, API, database, data, routing, ML, testing, decision, and risk documents as defined in its guide. Closely related small artifacts may share a document after team agreement; do not create empty files merely to match a proposed tree.

## Dependency and import rules

1. The frontend communicates with application data through the versioned backend API. It never reads MongoDB or imports Python code.
2. FastAPI routes call services. Services call repositories and integration adapters; MongoDB queries do not belong in route handlers.
3. Routing and AI/ML expose explicit Python contracts and remain independent of FastAPI and MongoDB.
4. The routing baseline must work when the ML adapter is missing, unavailable, or rejected.
5. Share API meaning through OpenAPI, reviewed Markdown contracts, and sanitized JSON/GeoJSON examples. Do not maintain an unreviewed third copy of the same schema.
6. Cross-component tests belong in `tests/integration/`; component-specific tests remain in their owning workspace.
7. New top-level folders require an architecture decision because they affect every contributor.

## Where a new file should go

| New work | Location |
|---|---|
| Citizen request React behavior | `frontend/src/features/rescueRequests/` |
| Mission assignment/status React behavior | `frontend/src/features/missions/` |
| Leaflet layers and route display | `frontend/src/features/map/` |
| FastAPI endpoint | `backend/app/api/routes/` |
| API request/response schema | `backend/app/schemas/` |
| Mission state rule | `backend/app/domain/` |
| MongoDB query | `backend/app/repositories/` |
| Multi-step mission workflow | `backend/app/services/` |
| Routing or model connection | `backend/app/integrations/` |
| Graph/cost/algorithm implementation | `routing/src/resqph_routing/` |
| ML preparation/baseline/evaluation/inference | `ml/src/resqph_ml/` |
| Large downloaded/generated data | ignored `data/raw`, `data/interim`, or `data/processed` |
| Small sanitized fixture | `data/samples/` or the owning test folder |
| End-to-end scenario | `tests/integration/` |
| Project decision or technical contract | the appropriate `docs/` area |
