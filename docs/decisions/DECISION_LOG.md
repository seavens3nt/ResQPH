# ResQPH decision log

**Decision owner:** Ranee
**Last updated:** 2026-09-22

| ID | Decision | Status | Reason and consequence |
|---|---|---|---|
| D-001 | Limit the MVP to the project-defined U-Belt pilot area, City of Manila: west `120.982000`, south `14.596000`, east `121.004000`, north `14.617500` in WGS 84. | Approved | Keeps the road graph, data validation, testing, and demonstration manageable. The rectangle is an application boundary, not an official administrative area. |
| D-002 | Use controlled and historical flood scenarios instead of live flood prediction. | Approved | The project demonstrates routing behavior without claiming current hydrological accuracy. |
| D-003 | Use a curated OpenStreetMap extract for the study-area road graph. | Approved | Supports reproducible, bounded graph preparation. ODbL attribution and redistribution obligations must be observed. |
| D-004 | Use deterministic A* as the primary routing algorithm. | Approved | Provides an explainable baseline with a geographic heuristic. Dijkstra is not a separate required feature. |
| D-005 | Maintain a mandatory rule-based road-risk fallback. | Approved | Core routing must work when ML is unavailable, rejected, or unreliable. |
| D-006 | Implement ML as a required supporting component using Logistic Regression and Random Forest. | Approved | ML contributes a bounded road-risk penalty; it does not control routing or override impassability rules. XGBoost is excluded. |
| D-007 | Use basic role simulation for the MVP and exclude production authentication. | Approved | Keeps identity scope proportional to the academic prototype. UI and documentation must not represent this as secure authentication. |
| D-008 | Limit offline support to cached mission viewing and one queued mission-status update. | Approved | Controls synchronization complexity while demonstrating connectivity-aware behavior. |
| D-009 | Use new team phase numbering after the Project Foundation. | Approved | Team Phase 1 begins with Mapping and Geospatial Pipeline. The PM Foundation contains requirements/data validation and core application work. |
| D-010 | Treat all project data and UI claims as academic-prototype information. | Approved | No official emergency response, live forecast, guaranteed route safety, or government integration may be claimed. |
| D-011 | Assign Matthew as accountable geospatial-pipeline and deterministic-routing owner, with Jared supporting backend integration. | Approved | Resolves ownership while keeping routing/data work aligned with Matthew's AI/ML and data responsibility. Ranee remains the gate owner. |
| D-012 | Finalize Phase 1 asynchronously through repository documentation and PR review; no separate Phase 1 meeting is required. | Approved | Ranee made the outstanding scope decisions directly. Affected members still review the contracts in the PR. |
| D-013 | Approve the Project Foundation Phase 1 gate with conditions. | Approved with conditions | Core Application preparation may proceed after the documentation PR merges; unverified data, UI, ML, routing-weight, and contract-review evidence remains explicitly gated. |

## Open decisions

| ID | Decision needed | Evidence required | Owner | Gate impact |
|---|---|---|---|---|
| O-003 | Accepted flood-hazard source and redistribution terms | Metadata, coverage inspection, access test, and license/restriction review | Matthew; Ranee decides fallback | Blocks hazard-data integration |
| O-004 | ML target and label availability | Dataset sample, join-key check, label definition, and leakage review | Matthew; Ranee reviews | Blocks model training |
| O-005 | Final numeric routing penalties and bounded ML cap | Small known-graph tests and scenario review | Matthew; Ranee approves | Blocks routing acceptance |
