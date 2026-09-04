# Sprint 01 — Phase 1 foundation

## Sprint information

| Field | Value |
|---|---|
| Phase | Phase 1 — Requirements and Data Validation |
| Dates | TBD |
| Sprint goal | Approve a realistic MVP, study area, user workflows, data feasibility, initial contracts, and non-ML fallback before feature implementation. |
| Participants | Ranee, Jared Noel, Elle, Matthew Trinitaria, and Clarence |
| Status | Planned; candidate tickets are not yet assigned or started |

## Planned outcomes

- Approved MVP scope, non-goals, terminology, and success criteria.
- Approved citizen, coordinator, and rescuer workflows plus low-fidelity wireframes.
- Proposed MongoDB collections, document shapes, indexes, status transitions, and transaction boundaries.
- Draft API contract for the main rescue workflow.
- Approved study-area boundary and dataset register, or documented data blockers and alternatives.
- Routing input/output contract and deterministic baseline assumptions.
- AI/ML feasibility note with target, features, metrics, and mandatory rule-based fallback.
- Initial risk register, decision log, test strategy, and traceability between requirements and future Issues.

## Candidate tickets

These are planning candidates only. Create, size, prioritize, and assign the actual GitHub Issues during sprint planning.

| Candidate | Likely owner | Support | Depends on |
|---|---|---|---|
| Approve MVP scope, non-goals, terminology, and success criteria | Ranee | All members | Team availability and proposal review |
| Map citizen, coordinator, and rescuer workflows | Elle | Ranee and Clarence | Approved user roles and MVP |
| Produce low-fidelity wireframes and interface states | Elle | Ranee and Clarence | Workflow decisions |
| Draft domain model, status transitions, and API contract | Ranee | Jared | Approved workflow and terminology |
| Review backend integration boundaries and error conventions | Jared | Ranee | Draft domain model and API contract |
| Inventory and validate study-area datasets | Clarence | Matthew | Proposed boundary and source access |
| Define deterministic routing inputs, outputs, and assumptions | Clarence | Ranee, Jared, and Matthew | Dataset inventory |
| Assess ML data feasibility and define rule-based baseline | Matthew | Ranee, Jared, and Clarence | Dataset inventory and routing contract |
| Define Phase 1 verification and documentation checklist | Ranee | Elle and Jared | Draft artifacts |

## Dependencies

- Team approval of one initial Metro Manila study area.
- Access to authoritative dataset metadata and license information.
- Agreement on coordinator terminology and whether prototype authentication is required.
- Agreement on privacy-safe sample rescue scenarios.

## Main risks

- Scope expands before the MVP is approved.
- The proposed study area lacks compatible flood or elevation data.
- Data have mismatched CRS, coverage, scale, age, or licenses.
- The team designs APIs before agreeing on workflows and status transitions.
- ML work starts before a defensible target and dataset exist.

## Demo expectations

Walk through one synthetic rescue scenario from citizen request to mission completion using the approved workflow, wireframes, domain/API draft, study-area map, data register, routing contract, and fallback approach. No production feature implementation is required for this sprint demo.

## Definition of Done

- Selected outcomes have reviewable files or diagrams in the repository.
- Assumptions, sources, owners, risks, and `TBD` items are explicit.
- Contracts use consistent names, statuses, coordinates, timestamps, and error conventions.
- Dataset entries include source, license, coverage, CRS, format, currency, quality, and intended use.
- ML feasibility includes a rule-based fallback and a valid “do not train yet” outcome.
- Candidate outputs have been reviewed by the affected component owners.
- Accepted work is linked to reviewed pull requests and can be demonstrated.

## Review notes

To be completed during the sprint review.

## Retrospective

### What helped

To be completed.

### What caused delay or rework

To be completed.

### Improvement for the next sprint

To be completed.
