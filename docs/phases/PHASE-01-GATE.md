# Project Foundation Phase 1 gate

**Decision:** Approve with conditions
**Decision owner:** Ranee
**Decision date:** 2026-09-22
**Issue:** [#12](https://github.com/seavens3nt/ResQPH/issues/12)

## Approved decisions

- Use the project-defined **U-Belt pilot area, City of Manila** in WGS 84, bounded by west `120.982000`, south `14.596000`, east `121.004000`, and north `14.617500`.
- Use controlled and historical flood scenarios; do not claim live prediction or operational accuracy.
- Use basic role simulation for the MVP. Production authentication is excluded.
- Assign **Matthew Trinitaria** as accountable owner for the geospatial pipeline and deterministic routing work, with **Jared Noel** supporting backend integration and Ranee retaining gate authority.
- Require deterministic A* and the rule-based risk fallback to work without ML.
- Require Logistic Regression and Random Forest experiments; exclude XGBoost.
- Limit offline behavior to one cached assigned mission and one queued mission-status update.
- Finalize these decisions asynchronously in repository documentation; a separate Phase 1 meeting is not required.

## Inspected evidence

- MVP scope, lifecycle, API, database, routing, ML, offline, UI-state, test, decision, and risk drafts.
- Sanitized rescue-request and road-edge samples.
- Project-defined study-area metadata and GeoJSON fixture.
- Repository architecture, stack, team responsibilities, and branch protections.

## Conditions

| ID | Condition | Owner | Blocks | Latest safe decision time |
|---|---|---|---|---|
| C-01 | Reproduce an OSM road extraction for `ubelt-pilot-v1`; record graph size, CRS, attribution, and clipping steps. | Matthew | Team Phase 1 completion | Before accepting the geospatial PR |
| C-02 | Verify the selected flood layer's access, coverage, age, CRS, and redistribution restrictions. If unavailable, approve an explicitly synthetic controlled layer. | Matthew; Ranee decides fallback | Hazard-data integration | Before flood data enter routing |
| C-03 | Demonstrate the road-edge join using a small sanitized flood/scenario fixture and stable edge IDs. | Matthew | Team Phase 2 start | Before flood-aware routing implementation |
| C-04 | Review low-fidelity citizen, coordinator, and rescuer wireframes against the approved workflow and UI-state contract. | Elle and Clarence; Ranee accepts | Frontend lifecycle acceptance | Before the affected frontend PR is accepted |
| C-05 | Define and inspect the ML target/labels, join keys, missingness, leakage controls, and split policy. Use the rule baseline if supervised evidence is inadequate. | Matthew | Model training/integration | Before Team Phase 3 model training |
| C-06 | Replace provisional routing weights with known-graph test evidence and approve the bounded ML penalty cap. | Matthew; Ranee approves | Team Phase 2 completion | Before accepting flood-aware routing |
| C-07 | Review the contracts in the Phase 1 PR and record material corrections before merge. | Affected members; Ranee accepts | Phase 1 documentation merge | Before merging the Phase 1 PR |

## Gate effect

- Project Foundation Phase 2 may become `Ready to start` after this documentation PR is merged.
- Phase 2 may implement the persistent rescue-request and mission lifecycle using basic role simulation without waiting for routing or ML.
- Team Phase 1 remains `Planned` until C-01 has an executable work package and accepted boundary input.
- No condition above may be presented as completed without inspected evidence.

## Deferred scope

The gate does not authorize production authentication, live flood prediction, nationwide routing, government integration, guaranteed safe navigation, operational emergency use, XGBoost, full offline maps, or more than one queued offline action.
