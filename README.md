# ResQPH

**Flood-Aware Emergency Rescue Coordination and Routing System**

COM243 | CCSFEN1L | Code Tayo Right-Neow

ResQPH is an academic web application for coordinating rescue requests and
missions during controlled or historical flood scenarios. Citizens submit
requests and the backend automatically assigns a station; station accounts
review missions and update status.

Current local candidate (2026-10-10): Citizen and provisioned station Rescuer accounts with persisted sessions, automatic assignment, Google Maps display, and shared mission tracking. The Dispatcher workflow is removed from active navigation and API routes; historical coordinator/team data and actor records remain preserved. The Volunteer workflow, rescuer hotline and alternative-route UI remain retired. See the [citizen-to-station implementation plan](docs/workflows/CITIZEN_STATION_WORKFLOW.md) and [new workflow decisions](docs/decisions/DECISION_LOG.md).

The foundation, core request-to-mission workflow, mapping/geospatial pipeline,
and **Team Phase 2 — Flood-Aware Routing** are verified. Matthew's early
**Team Phase 3 — AI/ML** package is accepted as external exploratory evidence;
its post-routing reconciliation is verified. Team Phase 4 — Limited Offline
Support is verified. Team Phase 5 — Integration, Testing, and Presentation is active.

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

Historically verified (the revised local candidate still requires final regression):

- Basic citizen, coordinator, and rescuer role simulation
- Validated rescue-request creation and status tracking
- Atomic coordinator assignment and mission history
- Reproducible bounded U-Belt graph and controlled-flood fixtures
- Validated backend geospatial loader and fixture-driven accessible map layers
- Deterministic road-risk fallback and evidence-gated ML adapter
- Preserved and checksum-verified external XGBoost experiment
- Deterministic A* routing from engine through API and coordinator UI, including
  explainable costs, impassable-edge exclusion, and explicit no-route behavior

- Limited offline support: production UI shell reload, one actor-scoped cached
  mission and one queued status update with safe replay and conflict review

The local citizen-to-station candidate is not merged or fully accepted. Its
remaining verification gates are recorded in the implementation plan and
current status. Earlier phase evidence below is historical and is not a claim
that the new workflow has passed.

The current local UI uses Inter, shared full-width desktop page canvases, an outlined collapsing sidebar, dashboard rescue/review modals and request-status popups. Map roads/boundary remain enabled. See [visual rules](docs/ui/LOCAL_VISUAL_RULES.md) and [current status](docs/STATUS.md); these local changes have not been pushed or merged.

The external XGBoost metrics are exploratory. They were produced with a random
row split and were not retrained from raw source data in this repository. The
artifact's target and features do not match the U-Belt runtime contract, so the
backend rejects it and uses the rule score.

## Technology

| Area | Baseline |
|---|---|
| Frontend | React, TypeScript, Vite, Google Maps JavaScript API |
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

Run these checks after completing [Development setup](docs/SETUP.md). Run each block from the repository root in its own PowerShell terminal. Passing these checks does not replace final end-to-end acceptance testing.

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
government-system integration, certified production authentication, guaranteed
road safety, or deployment for actual emergencies. Deterministic rules and
human decisions remain authoritative.
