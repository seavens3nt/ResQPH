# ResQPH repository guidance

## Purpose and scope

ResQPH is a flood-aware emergency rescue coordination and routing system for COM243 and CCSFEN1L. It is an academic engineering prototype for one selected Metro Manila study area and controlled flood scenarios. It is not a certified emergency-dispatch, flood-forecasting, or road-safety system.

The primary workflow is: citizen rescue request -> FastAPI validation -> MongoDB storage -> coordinator assignment -> flood-aware route -> rescuer status updates -> optional rerouting -> completion and history.

## Official phases

Work must align with these phases in order:

1. Requirements and Data Validation
2. Core Application
3. Mapping and Geospatial Pipeline
4. Routing
5. AI/ML
6. Offline Simulation
7. Integration and Testing

## Approved stack

- Frontend: React, TypeScript, Vite, Leaflet/React Leaflet, Axios, TanStack Query, Dexie, Zod, Vitest, and Testing Library.
- Backend: Python 3.12, FastAPI, Pydantic, async PyMongo, Pytest, HTTPX, and Ruff.
- Database: MongoDB 8 through Docker Compose as a local single-node replica set.
- Routing/geospatial: OSMnx, NetworkX, GeoPandas, Shapely, PyProj, and Rasterio.
- AI/ML: pandas, NumPy, scikit-learn, and joblib.
- Delivery: GitHub Issues, GitHub Projects, feature branches, pull requests, and Markdown.

Do not replace this stack without an approved, documented technical decision.

## Repository boundaries

- `frontend/`: citizen, rescuer, and coordinator interfaces; maps; client-side caching.
- `backend/`: API, validation, MongoDB access, mission workflow, and integration adapters.
- `routing/`: road-graph preparation and deterministic/flood-aware routing.
- `ml/`: data investigation, baselines, experiments, evaluation, and inference artifacts.
- `data/`: metadata, acquisition instructions, transformations, and small sanitized samples.
- `docs/`: scope, architecture, contracts, decisions, phase plans, and status.
- `tests/`: cross-component and end-to-end verification.

## Ownership

- Ranee (`@seavens3nt`): project management, primary backend, secondary AI/ML, UI/UX support.
- Jared Noel (`@AshenDary`): secondary backend and integration, AI/ML support.
- Elle (`@Qiuyuan26`): primary UI/UX and frontend, testing and documentation support.
- Matthew Trinitaria (`@matthew-sudo2`): primary AI/ML and data evaluation, data and routing support.
- Clarence (`@ClarenceArillo`): geospatial data and flood-aware routing, UI/UX support.

Ownership is accountability, not an exclusive boundary. Coordinate changes at component interfaces with the relevant owners.

## Before editing

1. Inspect the current branch, working tree, related code, documentation, and tests.
2. Preserve unrelated and uncommitted user changes.
3. Confirm the GitHub Issue, phase, acceptance criteria, dependencies, and expected verification.
4. Prefer the smallest change that satisfies the approved scope.
5. Never invent live data access, emergency-agency integration, or safety guarantees.

## GitHub workflow

- Branch from the latest `main`.
- Use `feature/<issue-number>-description`, `fix/<issue-number>-description`, `docs/<issue-number>-description`, or `test/<issue-number>-description`. Existing `research/`, `data/`, and `setup/` prefixes remain valid.
- Keep one primary purpose per Issue and one Issue, or tightly related ticket group, per branch.
- Open a pull request, link the Issue, report checks performed, and request at least one reviewer when possible.
- Do not push directly to `main` during normal development.
- Update documentation when behavior, contracts, setup, or architecture changes.

## File rules

- React components: `PascalCase.tsx`; hooks: `useSomething.ts`; utilities and API modules: descriptive `camelCase.ts` names.
- Python modules and tests: `snake_case.py`; tests start with `test_`.
- Markdown documents: descriptive uppercase names for project-level references and consistent phase/sprint names such as `PHASE-01.md` and `SPRINT-01.md`.
- Keep component-specific files inside their owning top-level directory. Do not introduce circular frontend/backend/routing/ML imports.
- Store environment examples as `.env.example`; never commit real `.env` files.

## Engineering and safety rules

- Implement and verify deterministic A* or Dijkstra routing before ML-assisted penalties.
- Maintain a documented, testable rule-based risk fallback. The application must not require a trained model to perform its prototype workflow.
- ML output may adjust an explainable routing cost; it must not silently override deterministic impassability rules or human decisions.
- Use synthetic or sanitized rescue scenarios during development. Do not commit real contact details, precise private locations, credentials, or operational emergency records.
- Do not commit large raw/processed datasets, dependency folders, generated model artifacts, logs, or secrets. Commit metadata, scripts, and small test samples instead.
- Preserve GeoJSON coordinate order as longitude, latitude and record each dataset's CRS, license, coverage, transformations, currency, and limitations.

## Testing expectations

- Frontend: run lint, unit/component tests, and production build for affected work.
- Backend: run Ruff and Pytest for affected work.
- Routing/data/ML: add reproducible tests or evaluation evidence, including failure and fallback cases.
- Integration changes: verify the full affected workflow and contract compatibility.
- Documentation-only changes: validate links, code fences, commands, and consistency with the repository.

## Definition of Done

A coding task is done only when its acceptance criteria are satisfied, relevant checks pass, failure cases and fallbacks are handled, dependent components are integrated, documentation is current, no sensitive or oversized files are included, a teammate has reviewed the pull request when possible, and the result is merged and demonstrable.
