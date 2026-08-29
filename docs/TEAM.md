# ResQPH Team Responsibilities

Responsibilities define ownership and accountability, but they are not strict boundaries. Members may contribute to other components based on project needs, interest, availability, dependencies, and integration work.

## Responsibility assignments

| Member | GitHub | Primary responsibility | Secondary responsibility |
|---|---|---|---|
| Ranee Mikaella Gutierrez | [@seavens3nt](https://github.com/seavens3nt) | Project Management and Primary Backend | AI/ML and UI/UX support |
| Jared Noel | [@AshenDary](https://github.com/AshenDary) | Secondary Backend and Integration | AI/ML support |
| Elle | [@Qiuyuan26](https://github.com/Qiuyuan26) | Primary UI/UX and Frontend | Testing and documentation |
| Matthew Trinitaria | [@matthew-sudo2](https://github.com/matthew-sudo2) | Primary AI/ML and Data Evaluation | Data validation and routing support |
| Clarence | [@ClarenceArillo](https://github.com/ClarenceArillo) | Geospatial Data and Flood-Aware Routing | UI/UX support |

## Ranee — Project Manager and Primary Backend Contributor

### Project management

- Manage project scope, phases, milestones, and deadlines.
- Create, assign, and monitor GitHub Issues.
- Track risks, blockers, dependencies, scope changes, and decisions.
- Coordinate frontend, backend, database, routing, and AI/ML integration.
- Organize meetings and record action items.
- Coordinate testing, documentation, presentation, and demonstration preparation.

### Primary backend contribution

- Lead backend architecture and FastAPI development.
- Connect the backend to MongoDB.
- Lead rescue-request, mission-assignment, and status-history APIs.
- Define validation rules, API contracts, and transaction boundaries.
- Create MongoDB collections and geospatial indexes.
- Integrate routing and AI/ML outputs with the backend.
- Lead offline synchronization implementation.
- Review backend contributions and maintain API documentation.

### Secondary AI/ML and UI/UX contribution

- Assist with AI/ML data investigation, preprocessing, feature engineering, experimentation, and evaluation.
- Help develop and test the rule-based road-risk baseline.
- Review citizen, rescuer, and coordinator workflows.
- Help ensure backend behavior supports clear, accessible user experiences.
- Support frontend-backend integration and usability testing.

## Jared Noel — Secondary Backend and Integration Contributor

- Own assigned backend endpoints and database modules.
- Assist with MongoDB schemas, indexes, queries, and validation.
- Implement selected location, flood-report, mission-history, or synchronization modules.
- Prepare sample and seed data.
- Write backend and database tests.
- Test API validation and error handling.
- Help resolve frontend-backend integration problems.
- Support offline synchronization and review API documentation.
- Assist with AI/ML integration and evaluation when needed.

## Elle — Primary UI/UX and Frontend Contributor

- Design the citizen, rescuer, and coordinator workflows.
- Create wireframes and reusable interface components.
- Implement the citizen rescue-request and status-tracking workflows.
- Implement the rescuer mission and coordinator interfaces.
- Develop the React and Leaflet map interface.
- Display locations, flood information, routes, warnings, and route explanations.
- Implement loading, error, offline, stale-data, and Pending Sync states.
- Coordinate frontend-backend integration with Ranee and Jared.
- Lead accessibility, responsive-design, and frontend usability checks.

## Matthew Trinitaria — Primary AI/ML and Data Evaluation Contributor

- Investigate available road-risk and passability data.
- Define the target output and candidate features.
- Clean and preprocess data and perform feature engineering.
- Create training, validation, and test sets when appropriate.
- Develop a rule-based road-risk baseline and fallback.
- Evaluate manageable machine-learning models.
- Compare model results with the baseline and perform error analysis.
- Document assumptions, limitations, metrics, and reproducible experiments.
- Recommend whether a model is reliable enough to integrate.
- Work with Clarence to convert model output into explainable route penalties.
- Support dataset validation and routing tests.

## Clarence — Geospatial Data and Flood-Aware Routing Contributor

- Help select and document the initial study area.
- Locate and validate road, flood, elevation, and facility datasets.
- Align geographic datasets to appropriate coordinate-reference systems.
- Prepare road-segment attributes and construct the road graph.
- Implement the deterministic A* or Dijkstra routing baseline.
- Add travel-time, flood, elevation, and explainable risk penalties.
- Exclude roads considered impassable.
- Implement simulated flood scenarios and dynamic rerouting.
- Return route geometry and understandable route explanations.
- Work with backend, frontend, and AI/ML contributors during integration.
- Support Elle with UI/UX and map-workflow reviews.

## Official phase leadership

| Project phase | Lead | Main support |
|---|---|---|
| Phase 1 — Requirements and Data Validation | Ranee | All members |
| Phase 2 — Core Application | Ranee | Jared and Elle |
| Phase 3 — Mapping and Geospatial Pipeline | Clarence | Elle, Ranee, Jared, and Matthew |
| Phase 4 — Routing | Clarence | Ranee, Jared, and Matthew |
| Phase 5 — AI/ML | Matthew | Ranee, Clarence, and Jared |
| Phase 6 — Offline Simulation | Ranee | Jared and Elle |
| Phase 7 — Integration and Testing | Ranee | All members |

## Shared responsibilities

Every member must:

- Attend planning and progress meetings.
- Keep assigned GitHub Issues updated.
- Communicate blockers promptly.
- Use feature branches and pull requests.
- Follow agreed API contracts and data formats.
- Review and test integrated features.
- Document individual contributions.
- Help resolve integration problems.
- Contribute to the final report.
- Explain their work during the project defense.
