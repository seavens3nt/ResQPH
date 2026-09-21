# Sprint 01 — Project Foundation Phase 1

## Sprint information

| Field | Value |
|---|---|
| Phase | Project Foundation Phase 1 — Requirements and Data Validation |
| Dates | TBD |
| Sprint goal | Lock the U-Belt MVP, lifecycle, exact boundary, data feasibility, contracts, ML/fallback plan, offline boundary, and acceptance evidence before Phase 2. |
| Decision owner | Ranee |
| Status | Ready for review; gate decision is Approve with conditions; tracked by [Issue #12](https://github.com/seavens3nt/ResQPH/issues/12) |

## Completed draft outputs

- MVP scope and exclusions
- Decision log and open-decision list
- Rescue-request and mission lifecycle
- Acceptance scenarios
- API contract
- MongoDB schema and consistency contract
- Candidate dataset register
- Routing and rule-risk contract
- Logistic Regression and Random Forest evaluation plan
- Limited offline contract
- UI-state expectations
- Test strategy
- Risk register
- Sanitized request and road-edge contract fixtures
- Approved U-Belt boundary metadata and GeoJSON fixture
- Basic role-simulation decision
- Matthew's geospatial/routing ownership with Jared as backend-integration support
- Phase 1 gate record with named evidence conditions

Draft creation is not phase completion. Each output still requires the stated review and evidence.

## Remaining critical work

1. Reproduce the approved U-Belt OSM extraction and record graph statistics, CRS, attribution, and clipping steps.
2. Access and inspect the proposed flood and optional elevation sources, or approve a documented synthetic fallback.
3. Verify coverage, age, restrictions, and road-edge join feasibility.
4. Approve final deterministic penalty weights and the ML target/label source at their implementation gates.
5. Produce or review low-fidelity workflow/wireframe evidence against the UI-state matrix.
6. Review the affected contracts in the Phase 1 pull request and address material corrections before merge.

## Active dependencies

- The approved boundary unlocks reproducible road and hazard clipping.
- Validated road-edge identifiers unlock routing and ML join contracts.
- The approved role-simulation contract unlocks the prototype user workflow.
- Approved workflow and contracts unlock Project Foundation Phase 2.

## Definition of Done

- Scope, non-goals, terminology, and success scenario are approved.
- The exact study boundary is inspectable and reproducible.
- Candidate datasets have sample-level feasibility and restriction evidence.
- API, schema, routing/risk, ML, offline, UI-state, and test artifacts agree.
- Open risks have owners and safe decision times.
- Affected members review the contracts that govern their work.
- Ranee records `Approve`, `Approve with conditions`, or `Do not approve`.

## Review notes

Ranee approved the scope, boundary, role simulation, ownership, and gate outcome on 2026-09-22. Dataset access/join evidence, UI wireframes, ML labels, final routing weights, and affected-member contract review remain conditions rather than verified completions.

## Retrospective

The narrow U-Belt rectangle and basic role simulation reduced scope risk. Future phases must avoid treating a documentation decision as proof that a dataset, model, route, or UI flow works.
