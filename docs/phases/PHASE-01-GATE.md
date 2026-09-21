# Project Foundation Phase 1 gate

**Decision:** Approve

**Phase status:** Completed and verified

**Decision owner:** Ranee

**Decision date:** 2026-09-22

**Issue:** [#12](https://github.com/seavens3nt/ResQPH/issues/12)

## Locked foundation

- Project-defined **U-Belt pilot area, City of Manila** in WGS 84: west `120.982000`, south `14.596000`, east `121.004000`, north `14.617500`.
- Controlled and historical flood scenarios only; the guaranteed MVP hazard source is the committed controlled scenario fixture.
- OpenStreetMap/OSMnx road source with ODbL attribution, exact boundary, extraction rules, stable edge-ID strategy, and successful feasibility evidence.
- Basic role simulation for citizen, volunteer, coordinator, and rescuer. Production authentication is excluded.
- Approved request/mission lifecycle, API error envelope, MongoDB collections, indexes, transactions, boundary validation, retention, and route-result storage decisions.
- Deterministic A* with fixed prototype penalties, impassable-edge exclusion, no-route behavior, explanations, and a known-graph verification fixture.
- Mandatory rule-based fallback that operates without ML.
- Required Logistic Regression and Random Forest experiment with a locked binary target, allowed/prohibited features, grouped split rule, evidence threshold, and bounded model-to-routing mapping. XGBoost is excluded.
- Limited offline behavior: one cached assigned mission and one queued next-valid mission-status update.
- Approved role wireframes, reusable-component inventory, UI states, accessibility baseline, and frontend file boundary.
- Acceptance scenarios, test strategy, privacy rules, risk register, roadmap, ownership, and repository workflow.
- Matthew owns geospatial, routing, and AI/ML work; Jared supports backend integration; Elle and Clarence own UI/UX/frontend boundaries; Ranee owns Phase 2 core backend and every gate decision.

## Verification evidence

| Foundation criterion | Evidence | Result |
|---|---|---|
| Exact study boundary | `data/samples/study-area.geojson` parses, uses WGS 84 longitude/latitude, and closes its polygon | Passed |
| Road-source feasibility | Reproducible Overpass query returned 1,781 candidate motorized highway ways and 5,001 referenced nodes on 2026-09-22 | Passed |
| Guaranteed hazard source | Controlled flood fixture includes scenario/source time and joins the road fixture on `edge-demo-001` | Passed |
| Routing decisions | Known-graph fixture defines baseline `120`, flood reroute `160` versus `210`, severe-edge exclusion, no-route, and capped-ML reroute `160` versus `180` | Passed |
| ML foundation | Target, schema, leakage exclusions, split policy, minimum evidence threshold, models, metrics, integration rule, and fallback are explicit | Passed |
| UI/UX foundation | Citizen, coordinator, rescuer, and volunteer wireframes cover required states and map text alternatives | Passed |
| Contract consistency | API, lifecycle, schema, routing, offline, UI, acceptance, and test documents use the same roles, states, identifiers, and limitations | Passed |
| Documentation quality | JSON parsing, Markdown fence balance, local-link resolution, stale-term search, diff check, path/size audit, and CI | Passed |

Detailed commands and results are recorded in [`../testing/PHASE-01-EVIDENCE.md`](../testing/PHASE-01-EVIDENCE.md).

## Gate effect

- Project Foundation Phase 1 is `Completed and verified` as a requirements, design, contract, fixture, and planning foundation.
- Project Foundation Phase 2 becomes `Ready to start` after this documentation PR is merged into `main`.
- Team members receive locked authoritative inputs and should not need to make Phase 1 scope decisions inside their implementation issues.
- Later phases must implement and test their assigned behavior. Phase 1 completion does not claim that the application, graph pipeline, routing engine, trained models, or offline runtime already exist.

## Approved implementation obligations

These are future-phase acceptance criteria, not unfinished Phase 1 decisions:

- Team Phase 1 must implement the documented OSMnx extraction and record final simplified graph statistics.
- Team Phase 2 must reproduce all known-graph routing cases in automated tests.
- Team Phase 3 must run and report the required experiments; routing integration occurs only if the evidence threshold and Ranee's acceptance are met.
- Foundation Phase 2 and later frontend work must implement the approved workflows, wireframes, contracts, validation, accessibility states, and prototype-authentication limitation.

## Excluded scope

The gate does not authorize production authentication, live flood prediction, nationwide routing, government integration, guaranteed safe navigation, operational emergency use, XGBoost, full offline maps, or more than one queued offline action.
