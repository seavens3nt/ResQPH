# ResQPH MVP scope

**Status:** Completed and verified Phase 1 scope baseline
**Decision owner:** Ranee
**Last updated:** 2026-09-22

## Purpose

ResQPH is an academic flood-aware rescue coordination and routing prototype for a project-defined U-Belt pilot area in the City of Manila. It demonstrates how a citizen request, coordinator assignment, rescuer mission, controlled flood scenario, explainable route, status update, and limited offline action can operate as one workflow.

ResQPH is not an official emergency-response, flood-forecasting, or guaranteed road-safety system.

## Approved users

- **Citizen:** submits and tracks a rescue request.
- **Volunteer:** submits a controlled hazard report and views relevant rescue information without dispatch authority.
- **Coordinator:** reviews requests, assigns rescuers, monitors missions, and reviews route explanations.
- **Rescuer:** views an assigned mission and route, reports status, and views a cached mission during temporary connectivity loss.

## Geographic boundary

The approved study area is the **U-Belt pilot area, City of Manila**. Its WGS 84 bounding box is west `120.982000`, south `14.596000`, east `121.004000`, and north `14.617500`. The authoritative machine-readable fixture is [`../../data/samples/study-area.geojson`](../../data/samples/study-area.geojson), with rationale and limitations in [`../../data/metadata/study-area.md`](../../data/metadata/study-area.md).

This rectangle is a project-controlled scope boundary. It is not an official administrative, hazard, emergency-service, or University Belt boundary.

## Required MVP capabilities

1. Simulate login and one of the four approved roles.
2. Create and store a sanitized citizen rescue request.
3. Let a coordinator review and assign the request to a rescue team.
4. Let a rescuer retrieve the assigned mission and update its status.
5. Display the request, mission, hazards, and route within the study area.
6. Calculate a deterministic A* route over a curated OpenStreetMap road graph.
7. Apply transparent rule-based flood and passability penalties.
8. Exclude roads classified as impassable in the active controlled scenario.
9. Explain why a road was avoided and why the selected route was preferred.
10. Train and evaluate Logistic Regression and Random Forest road-risk models when the validated data support them.
11. Convert accepted model output into a bounded road-risk penalty without overriding deterministic impassability rules.
12. Continue routing with the rule-based fallback when model inference is unavailable or rejected.
13. Cache one assigned mission for viewing while offline.
14. Queue at most one valid mission-status update and synchronize it after reconnection.
15. Display whether information is simulated, cached, stale, pending synchronization, or current within the prototype.

## Constraints

- Use controlled and historical flood information; do not claim live prediction.
- Use one curated, reproducible OpenStreetMap extract rather than nationwide data.
- Use A* as the primary routing algorithm. Dijkstra may be retained only as a test comparison or fallback investigation.
- Keep the rule-based road-risk calculation independently testable.
- Use Logistic Regression as the explainable ML baseline and Random Forest as the comparison model. XGBoost is excluded.
- Use basic prototype role simulation and label it clearly as non-production authentication.
- Use synthetic or sanitized people, contact details, locations, missions, and incidents.
- Keep raw datasets and generated model artifacts outside ordinary Git history.

## Explicit exclusions

- Nationwide or complete Metro Manila routing
- Official real-time flood forecasts
- A hydrological prediction model
- Guaranteed safe routes
- Autonomous dispatch or rescue decisions
- Direct government, hospital, police, fire, or rescue-agency integration
- Production authentication, OAuth, MFA, or identity verification
- Official rescue-fleet tracking
- Complete offline map downloads or unrestricted offline operation
- Mesh, radio, satellite, or peer-to-peer communication
- Deployment or use during actual emergencies

## MVP success scenario

The MVP succeeds when a reviewer can complete this sanitized demonstration:

1. A citizen submits a request within the study area.
2. FastAPI validates the request and MongoDB stores it.
3. A coordinator assigns a rescue team.
4. The rescuer retrieves the assigned mission.
5. A* calculates an initial route.
6. A controlled scenario marks one road risky or impassable.
7. The engine returns an alternative route and a human-readable explanation.
8. An accepted ML result contributes a bounded risk penalty.
9. The same route workflow still operates with ML disabled.
10. The rescuer submits a status update and the citizen sees the new status.
11. The rescuer can view the cached mission and synchronize one queued valid status update after reconnecting.

## Approval gate

Ranee approved and verified this Phase 1 scope baseline on 2026-09-22. Later implementation phases must still produce working code, automated tests, trained-model evidence when applicable, and Ranee's acceptance; Phase 1 completion does not claim those features already exist.
