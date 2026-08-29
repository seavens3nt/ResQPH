# ResQPH Team Responsibilities

Responsibilities define primary ownership but are not strict boundaries. Members may contribute to other components based on interest, availability, dependencies, and integration needs.

## Responsibility assignments

| Member | Primary responsibility | Secondary responsibility |
|---|---|---|
| Ranee | Project Manager; UI/UX and Frontend | AI/ML |
| To be selected | Primary Backend API and MongoDB | Integration and testing |
| To be selected | Secondary Backend and Database | API and database testing |
| To be selected | Primary AI/ML and Data Evaluation | Quality assurance |
| To be selected | Geospatial Data and Flood-Aware Routing | Backend and AI/ML integration |

## Ranee — Project Manager, Primary UI/UX and Frontend Contributor, Secondary AI/ML Contributor

### Project management

- Manage the project scope, phases, milestones, and deadlines.
- Create, assign, and monitor GitHub Issues.
- Track risks, blockers, dependencies, and decisions.
- Coordinate frontend, backend, MongoDB, routing, and AI/ML integration.
- Organize meetings and record action items.
- Coordinate testing, documentation, presentation, and demonstration preparation.

### Primary UI/UX and frontend contribution

- Design the citizen, rescuer, and dispatcher workflows.
- Create wireframes and reusable interface components.
- Implement the citizen rescue-request workflow.
- Implement citizen request-status tracking.
- Implement the rescuer mission interface.
- Implement the dispatcher interface.
- Develop the interactive map interface.
- Display locations, flood information, routes, warnings, and route explanations.
- Implement loading, error, offline, stale, and Pending Sync states.
- Coordinate frontend-backend integration.

### Secondary AI/ML contribution

- Assist with data investigation and preprocessing.
- Assist with feature selection and engineering.
- Help develop the rule-based road-risk baseline.
- Participate in model experimentation and evaluation.
- Assist with error analysis and integration.
- Display road-risk or passability results in the interface.
- Help test whether AI/ML outputs are understandable and useful.

## Primary Backend API and MongoDB Contributor

- Lead backend architecture and API development.
- Connect the backend to MongoDB.
- Implement rescue-request CRUD.
- Implement request validation.
- Implement mission creation and assignment.
- Implement mission-status updates and history.
- Create MongoDB collections and geospatial indexes.
- Implement transactions where appropriate.
- Integrate routing and AI/ML outputs.
- Lead offline synchronization implementation.
- Review backend contributions.
- Maintain API and database documentation.

## Secondary Backend and Database Contributor

- Own assigned backend endpoints and database modules.
- Assist with MongoDB schemas and indexes.
- Implement selected location, flood-report, mission-history, or sync-event modules.
- Prepare sample and seed data.
- Write backend and database tests.
- Test API validation and error handling.
- Help resolve frontend-backend integration problems.
- Support offline synchronization.
- Review API and database documentation.

## Primary AI/ML and Data Evaluation Contributor

- Investigate available road-risk and passability data.
- Define the target output and candidate features.
- Clean and preprocess data.
- Perform feature engineering.
- Create training, validation, and test sets when appropriate.
- Develop a rule-based road-risk baseline.
- Evaluate manageable machine-learning models.
- Compare model results with the baseline.
- Perform error analysis.
- Document assumptions and limitations.
- Recommend whether the model is reliable enough to integrate.
- Work with the routing contributor to convert model output into route penalties.
- Lead AI/ML documentation and reproducible experiments.

## Geospatial Data and Flood-Aware Routing Contributor

- Help select the Metro Manila study area.
- Locate and validate road, flood, and elevation datasets.
- Align geographic datasets to a common coordinate system.
- Prepare road-segment attributes.
- Construct the road graph.
- Implement A* or Dijkstra routing.
- Add travel-time, flood, elevation, and risk penalties.
- Exclude roads considered impassable.
- Implement simulated flood scenarios and dynamic rerouting.
- Return route geometry and understandable route explanations.
- Work with backend, frontend, and AI/ML contributors during integration.

## Official phase leadership

| Project phase | Lead | Main support |
|---|---|---|
| Phase 1 — Requirements and Data Validation | Project Manager | All members |
| Phase 2 — Core Application | Primary Backend | Ranee and Secondary Backend |
| Phase 3 — Mapping and Geospatial Pipeline | Geospatial and Routing | Ranee, Backend, and AI/ML |
| Phase 4 — Routing | Geospatial and Routing | Backend, Ranee, and AI/ML |
| Phase 5 — AI/ML | Primary AI/ML | Ranee, Geospatial, and Backend |
| Phase 6 — Offline Simulation | Primary Backend | Secondary Backend and Ranee |
| Phase 7 — Integration and Testing | Project Manager | All members |

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