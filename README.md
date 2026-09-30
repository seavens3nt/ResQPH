# ResQPH

**Flood-Aware Emergency Rescue Coordination and Routing System**

COM243 | CCSFEN1L | Code Tayo Right-Neow

ResQPH is an academic web application for coordinating rescue requests and
missions during controlled or historical flood scenarios. Citizens submit
requests, coordinators assign missions, and rescuers review assignments and
update mission status.

The foundation and core request-to-mission workflow are verified. **Team Phase
1 — Mapping and Geospatial Pipeline** is the active delivery phase. Matthew's
early **Team Phase 3 — AI/ML** package is ready for review as external
exploratory evidence; its model is not enabled in the application.

> [!IMPORTANT]
> ResQPH is a classroom prototype. It is not an official emergency-response
> system, live flood forecast, or guarantee that a route is safe.

## Start here

| Need | Read |
|---|---|
| See the active work and blockers | [Current status](docs/STATUS.md) |
| Follow the delivery sequence | [Roadmap](docs/ROADMAP.md) |
| Find your responsibility | [Team responsibilities](docs/TEAM.md) |
| Install and run the project | [Development setup](docs/SETUP.md) |
| Understand the repository structure | [Architecture](docs/ARCHITECTURE.md) |
| Review the ML acceptance boundary | [ML feasibility](docs/ml/ML_FEASIBILITY.md) |
| Follow branch, PR, and merge rules | [Contributing](CONTRIBUTING.md) |

## Delivery status

Verified now:

- Basic citizen, coordinator, and rescuer role simulation
- Validated rescue-request creation and status tracking
- Atomic coordinator assignment and mission history
- Deterministic road-risk fallback and evidence-gated ML adapter
- Preserved and checksum-verified external XGBoost experiment

Still required for the MVP:

- Reproducible U-Belt OpenStreetMap and controlled-flood pipeline
- Stable road-edge identifiers shared across map, flood, and routing records
- Deterministic A* routing with explainable penalties and no-route behavior
- Limited offline support for one cached mission and one queued status update
- Final end-to-end verification and presentation evidence

The external XGBoost metrics are exploratory. They were produced with a random
row split and were not retrained from raw source data in this repository. The
artifact's target and features do not match the U-Belt runtime contract, so the
backend rejects it and uses the rule score.

## Technology

| Area | Baseline |
|---|---|
| Frontend | React, TypeScript, Vite, Leaflet |
| Backend | Python 3.12, FastAPI, Pydantic, PyMongo |
| Database | MongoDB 8 development replica set |
| Routing/geospatial | NetworkX, OSMnx, GeoPandas, Shapely, PyProj, Rasterio |
| AI/ML | Isolated XGBoost experiment; deterministic runtime fallback |
| Testing | Vitest, Testing Library, Pytest, HTTPX, Ruff |

## Project structure

```text
.github/             Issue templates, pull-request template, CI, and ownership
.agents/             Repository-specific Codex project context
frontend/            React interface, API client, components, and tests
backend/             FastAPI, MongoDB workflow, integration adapters, and tests
routing/             Geospatial pipeline and deterministic routing workspace
ml/                  Rule baseline, isolated experiments, artifacts, and tests
data/                Source metadata and small sanitized fixtures
docs/                Scope, phases, contracts, evidence, and project status
tests/integration/   Cross-component and end-to-end scenarios
```

See [Architecture](docs/ARCHITECTURE.md) before adding or moving files.

## Run locally

Complete the one-time setup in [Development setup](docs/SETUP.md), then use
separate PowerShell terminals.

MongoDB from the repository root:

```powershell
docker compose up -d
docker compose ps
```

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m fastapi dev app\main.py --port 8000
```

Frontend:

```powershell
Set-Location frontend
npm run dev
```

Open `http://localhost:5173` for the interface or
`http://localhost:8000/docs` for the API documentation.

## Quick verification

Frontend:

```powershell
Set-Location frontend
npm run lint
npm test
npm run build
```

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

External ML evidence:

```powershell
Set-Location ml\external-experiments\ondoy-2009-metro-manila
.\.venv\Scripts\python.exe -m pytest
```

Follow the experiment's [README](ml/external-experiments/ondoy-2009-metro-manila/README.md)
for its isolated first-time installation. Core backend setup intentionally does
not install XGBoost.

## Scope limits

The prototype is limited to the project-defined U-Belt pilot area in the City
of Manila. It uses controlled or historical flood inputs, sanitized rescue
records, basic role simulation, and a manageable road-network extract.

It does not provide live flood prediction, nationwide routing,
government-system integration, production authentication, guaranteed road
safety, or deployment for actual emergencies. Deterministic rules and human
decisions remain authoritative.
