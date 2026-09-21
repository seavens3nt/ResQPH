# ResQPH project context

## Problem

During severe flooding, rescue teams must locate stranded people, prioritize requests, assign responders, and travel through roads whose conditions can change. A shortest route may be unsafe because of floodwater, while unstable connectivity can delay mission updates. ResQPH explores how these activities can be coordinated in one explainable prototype.

## Intended users

- **Citizen:** submits a rescue request, location, number of people, contact information, situation description, and optional reported flood depth; monitors request status.
- **Coordinator or dispatcher:** monitors requests and teams, assigns missions, reviews status changes, and manages operational records.
- **Rescuer:** receives assigned missions and routes, reviews flood information, updates mission/location status, and reports road or flood observations.

## Main workflow

1. A citizen submits a rescue request.
2. FastAPI validates the request and stores it in MongoDB.
3. A coordinator assigns a rescue team through an authorized workflow.
4. The routing component combines rescuer and victim locations with road, flood, elevation, and risk data.
5. The backend returns a flood-aware route and explanation to the rescuer.
6. The rescuer sends location and mission-status updates.
7. Controlled flood changes may update edge costs and trigger rerouting.
8. The completed mission and its history remain available for evaluation.

## Academic scope and operating assumptions

ResQPH is an academic engineering prototype limited to the project-defined U-Belt pilot area in the City of Manila. Its WGS 84 bounding box is west `120.982000`, south `14.596000`, east `121.004000`, and north `14.617500`. It uses public or open datasets plus controlled and historical low, moderate, high, and severe flood scenarios. The team will document data age, coverage, accuracy, licensing, coordinate systems, and transformations.

The project does not build a hydrological forecasting model. It may use existing hazard information and simulated flood conditions to demonstrate routing decisions. The approved machine-readable boundary is [`../data/samples/study-area.geojson`](../data/samples/study-area.geojson). Accepted hazard datasets, final routing weights, and performance targets remain conditional on the evidence listed in the [Phase 1 gate](phases/PHASE-01-GATE.md).

## MVP boundary

### In scope

- Rescue-request creation, validation, viewing, updating, and history.
- Basic role simulation for citizen, volunteer, coordinator, and rescuer workflows.
- Coordinator review and mission assignment.
- Rescuer mission view and status/location updates.
- Interactive map for relevant people, missions, routes, and flood context.
- MongoDB operational/geospatial storage and appropriate transaction boundaries.
- Deterministic A* or Dijkstra baseline routing.
- Explainable flood, elevation, passability, and risk penalties.
- A required Logistic Regression and Random Forest road-risk experiment, with application integration only when the evidence is accepted.
- A mandatory rule-based risk fallback.
- Cached viewing of one assigned mission, one queued mission-status update, stale-data indicators, and reconnection validation.
- Synthetic or sanitized demonstrations and tests.

### Out of scope

- Official or guaranteed emergency dispatch.
- Real-time flood prediction or a full hydrological model.
- Guaranteed road safety or autonomous rescue decisions.
- Nationwide deployment or complete Metro Manila coverage in the initial prototype.
- Direct integration with government emergency infrastructure.
- XGBoost or deep-learning model development for the MVP.
- Production authentication, identity verification, OAuth, or MFA.
- More than one queued offline action or complete offline map packages.
- Real mesh, radio, or satellite communication.
- Unapproved collection or publication of real private emergency records.

## Key terminology

| Term | Meaning in ResQPH |
|---|---|
| Rescue request | A citizen-submitted record describing people needing assistance and their location. |
| Mission | The assignment and lifecycle that connects a rescue request to a rescue team. |
| Coordinator | The user who reviews requests, assigns missions, and monitors operations; also called dispatcher in earlier documents. |
| Road edge | A traversable road-graph segment with distance, time, hazard, elevation, passability, and data-time attributes as available. |
| Controlled flood scenario | A documented low, moderate, or severe simulated condition used for demonstration and testing. |
| Deterministic route | A route calculated with A* or Dijkstra from explicit edge rules and costs. |
| Risk penalty | An explainable added edge cost derived from rules or, when approved, an evaluated model. |
| Impassable | A simulated state that removes or prohibits a road edge from routing. |
| Pending Sync | A local, timestamped action waiting for backend validation after connectivity returns. |
| Stale data | Previously retrieved information whose age is displayed and that must not be presented as live. |

## Data limitations

- Public datasets can be outdated, incomplete, differently scaled, or licensed with attribution/redistribution limits.
- Flood-hazard layers describe their source methodology and period; they do not automatically represent current street conditions.
- Elevation resolution may not support precise road-level conclusions.
- Reported road and flood observations may be sparse, delayed, inconsistent, or simulated.
- Coordinate reference systems and GeoJSON longitude/latitude ordering must be validated.
- A supervised ML model may not be defensible if labels, coverage, or sample size are inadequate; the rule-based fallback remains the accepted outcome.
- Offline data can become stale, and synchronization conflicts require backend validation.

## Safety and privacy notice

ResQPH is not a certified emergency-dispatch, flood-forecasting, navigation-safety, or government response system. Demonstrations must not imply guaranteed safety or operational readiness. Use synthetic or sanitized rescue records during development, and never commit credentials, private contact data, or precise personal emergency locations.
