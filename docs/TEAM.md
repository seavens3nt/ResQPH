# ResQPH Team Responsibilities

Responsibilities define ownership and accountability, but they are not strict boundaries. Members may contribute to other components based on project needs, interest, availability, dependencies, and integration work.

## Responsibility assignments

| Member | GitHub | Primary responsibility | Secondary responsibility |
|---|---|---|---|
| Ranee Mikaella Gutierrez | [@seavens3nt](https://github.com/seavens3nt) | Project Management and Primary Backend | AI/ML and UI/UX support |
| Jared Noel | [@AshenDary](https://github.com/AshenDary) | Primary Backend and Integration | Secondary AI/ML |
| Elle | [@Qiuyuan26](https://github.com/Qiuyuan26) | Primary UI/UX and Frontend | Testing and documentation |
| Matthew Trinitaria | [@matthew-sudo2](https://github.com/matthew-sudo2) | Primary AI/ML and Data Evaluation; Geospatial/Routing Owner | Jared supports backend integration |
| Clarence | [@ClarenceArillo](https://github.com/ClarenceArillo) | UI/UX and Frontend | Testing and map-interface support |

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

## Jared Noel — Primary Backend and Integration Contributor

- Own assigned backend endpoints and database modules.
- Co-own MongoDB schemas, indexes, queries, and validation with Ranee.
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

## Matthew Trinitaria — Primary AI/ML, Data Evaluation, Geospatial, and Routing Contributor

- Investigate available road-risk and passability data.
- Define the target output and candidate features.
- Clean and preprocess data and perform feature engineering.
- Create training, validation, and test sets when appropriate.
- Develop a rule-based road-risk baseline and fallback.
- Evaluate manageable machine-learning models.
- Compare model results with the baseline and perform error analysis.
- Document assumptions, limitations, metrics, and reproducible experiments.
- Recommend whether a model is reliable enough to integrate.
- Own the bounded OSM extraction, documented processing steps, stable edge identifiers, and accepted scenario-layer joins.
- Own deterministic A* implementation, known-graph tests, flood/passability penalties, no-route behavior, and route explanations.
- Convert accepted model output into a bounded, explainable route penalty without overriding deterministic impassability.
- Document geospatial attribution, CRS, coverage, data age, transformations, and routing limitations.
- Request a scope decision from Ranee when source access, licensing, labels, or safety claims are uncertain.

## Clarence — UI/UX and Frontend Contributor

- Support the citizen, volunteer, rescuer, and coordinator workflows.
- Implement assigned frontend pages and reusable components.
- Implement loading, empty, validation, system-error, no-route, cached, stale, Pending Sync, and sync-failure states.
- Support responsive layouts, accessibility, usability testing, and documentation.
- Support the Leaflet map interface and route/hazard presentation without owning routing algorithms unless Ranee assigns a separate work package.
- Coordinate frontend API integration with Ranee, Jared, and Elle through the approved contract.

## Phase accountability

| Project phase | Accountable owner | Main support |
|---|---|---|
| Project Foundation 1 — Requirements and Data Validation | Ranee | All members review affected contracts |
| Project Foundation 2 — Core Application | Ranee | Jared, Elle, and Clarence |
| Team 1 — Mapping and Geospatial Pipeline | Matthew | Jared for backend integration; Elle and Clarence for map presentation |
| Team 2 — Flood-Aware Routing | Matthew | Jared for backend integration; Ranee for gate approval; Elle and Clarence for route presentation |
| Team 3 — AI/ML Road-Risk Component | Matthew | Ranee and Jared |
| Team 4 — Limited Offline Support | Ranee | Jared plus one assigned frontend owner |
| Team 5 — Integration, Testing, and Presentation | Ranee | All members |

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
