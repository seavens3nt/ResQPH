# ResQPH

**Flood-Aware Emergency Rescue Coordination and Routing System**

COM243 | CCSFEN1L | Code Tayo Right-Neow

## Project overview

ResQPH is a flood-aware emergency rescue coordination system that connects stranded individuals with rescue teams. Citizens can submit rescue requests containing their location and situation, while rescuers can view assigned missions, track affected locations, and receive recommended routes.

The project combines:

- A transactional rescue workflow
- An interactive map
- Public geographic and flood-hazard data
- Flood-aware routing
- A limited and explainable machine-learning component
- Basic offline synchronization
- MongoDB operational and geospatial data

ResQPH is an academic engineering prototype. It is not an official emergency-response, flood-forecasting, or guaranteed road-safety platform.

## Primary users

### Citizen

A citizen can:

- Submit a rescue request.
- Provide a location and contact information.
- Report the number of people requiring assistance.
- Describe the situation.
- Optionally report flood depth.
- Monitor the request status.

### Rescuer

A rescuer can:

- View assigned missions.
- View the stranded person's location.
- Review relevant flood information.
- Receive a recommended route.
- Update location and mission status.
- Submit road or flood observations.

### Administrator or dispatcher

A dispatcher can:

- Monitor rescue requests and teams.
- Assign missions.
- Review mission-status changes.
- Manage operational records.

## Typical mission workflow

1. A citizen submits a rescue request.
2. The backend validates and stores the request in MongoDB.
3. A dispatcher or authorized workflow assigns a rescue team.
4. The routing component combines rescuer location, victim location, road data, flood data, elevation, and road-risk information.
5. A flood-aware route is returned to the rescuer.
6. The rescuer updates the mission while travelling.
7. The route can be recalculated when simulated flood conditions change.
8. The completed mission is retained for history and evaluation.

## High-level architecture

```text
Frontend
    |
    v
Backend API
    |
    +--> MongoDB
    |
    +--> Routing Engine
    |
    +--> AI/ML Road-Risk Component

```

The system uses a modular architecture so that the user interface, application logic, data storage, routing, and AI/ML components can be developed and tested independently.

## Proposed technical components

The project document currently specifies:

- MongoDB for operational and geospatial data
- A* or Dijkstra's algorithm for routing
- Public road, flood-hazard, and elevation datasets
- Logistic Regression and Random Forest as the approved ML experiments
- Rule-based road-risk scoring as a required fallback
- Local caching and queued synchronization for limited offline behavior
- GitHub for source control
- GitHub Issues as the ticketing system
- Markdown for project documentation
- Feature branches and pull requests for collaborative development

The approved development baseline uses React, TypeScript, and Vite for the frontend; Python and FastAPI for the backend; Leaflet for map interaction; PyMongo for MongoDB; Python geospatial libraries for routing; scikit-learn for manageable AI/ML experiments; and IndexedDB for limited offline client storage.

## Project delivery phases

### Project Foundation Phase 1 — Requirements and Data Validation

Finalize users, workflows, study area, available datasets, MongoDB schema, and API contracts.

### Project Foundation Phase 2 — Core Application

Implement basic role simulation, rescue-request CRUD, mission assignment, status updates, and MongoDB integration.

### Team Phase 1 — Mapping and Geospatial Pipeline

Integrate the map and prepare the road, flood, and elevation datasets.

### Team Phase 2 — Flood-Aware Routing

Implement basic routing first, then add flood and risk penalties and dynamic rerouting.

### Team Phase 3 — AI/ML Road-Risk Component

Build and evaluate the road-risk or passability component. Integrate its output only if it is reliable enough for the prototype.

### Team Phase 4 — Limited Offline Support

Cache one assigned mission, queue one status update, and validate it after reconnection.

### Team Phase 5 — Integration, Testing, and Presentation

Test complete rescue scenarios, failure cases, stale information, routing changes, database consistency, and multiple rescue requests.

## Repository structure

```text
ResQPH/
├── .github/                 GitHub templates and repository configuration
├── frontend/                Citizen, rescuer, and dispatcher interfaces
├── backend/                 API, MongoDB, mission workflow, and synchronization
├── routing/                 Road graph and flood-aware routing
├── ml/                      Road-risk investigation, training, and evaluation
├── data/                    Dataset metadata, samples, and generated data
├── docs/                    Project documentation
├── tests/                   Cross-component and end-to-end tests
├── .gitignore
└── README.md
```

## Documentation

- [Project dashboard](docs/DASHBOARD.md)
- [Current status](docs/STATUS.md)
- [Project context](docs/PROJECT_CONTEXT.md)
- [Project roadmap](docs/ROADMAP.md)
- [Phase guides](docs/phases/README.md)
- [Phase 1 — Requirements and Data Validation](docs/phases/PHASE-01.md)
- [Sprint process](docs/sprints/README.md)
- [Sprint 01 plan](docs/sprints/SPRINT-01.md)
- [Team responsibilities](docs/TEAM.md)
- [Development setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Backend workspace guide](backend/README.md)
- [MVP scope](docs/requirements/MVP_SCOPE.md)
- [Acceptance scenarios](docs/requirements/ACCEPTANCE_SCENARIOS.md)
- [Rescue lifecycle](docs/workflows/RESCUE_LIFECYCLE.md)
- [API contract](docs/api/API_CONTRACT.md)
- [MongoDB schema](docs/database/MONGODB_SCHEMA.md)
- [Dataset register](docs/data/DATASET_REGISTER.md)
- [U-Belt study-area metadata](data/metadata/study-area.md)
- [Road-network source and extraction evidence](data/metadata/road-network.md)
- [Flood-hazard source decision](data/metadata/flood-hazard.md)
- [Elevation data decision](data/metadata/elevation.md)
- [Phase 1 gate decision](docs/phases/PHASE-01-GATE.md)
- [Routing contract](docs/routing/ROUTING_CONTRACT.md)
- [ML feasibility and evaluation](docs/ml/ML_FEASIBILITY.md)
- [Offline contract](docs/offline/OFFLINE_CONTRACT.md)
- [UI states](docs/ui/UI_STATES.md)
- [Low-fidelity UI wireframes](docs/ui/WIREFRAMES.md)
- [Test strategy](docs/testing/TEST_STRATEGY.md)
- [Phase 1 verification evidence](docs/testing/PHASE-01-EVIDENCE.md)
- [Decision log](docs/decisions/DECISION_LOG.md)
- [Risk register](docs/risks/RISK_REGISTER.md)

## Project scope

The prototype focuses on a project-defined U-Belt pilot area in the City of Manila using controlled and historical flood scenarios. Its WGS 84 bounding box is west `120.982000`, south `14.596000`, east `121.004000`, and north `14.617500`. This is an academic scope boundary, not an official government or emergency-service boundary.

The project will not provide:

- Official real-time flood forecasts
- Guaranteed road safety
- Nationwide deployment
- Direct integration with government emergency infrastructure
- Real mesh, radio, or satellite communication

## Engineering principle

AI assists the system, while deterministic routing, transparent data, and human rescue decisions remain responsible for the operational workflow.
