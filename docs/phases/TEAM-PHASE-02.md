# Team Phase 2 — Flood-Aware Routing

**Status:** Completed and verified

**Gate owner:** Ranee

**Routing owner:** Matthew

**Backend integration owner:** Jared

**Frontend route-data owner:** Ranee, temporarily covering Elle

**Frontend presentation owner:** Clarence

## Phase goal

Deliver deterministic A* routing over the locked known graph and accepted
U-Belt fixtures, with explainable flood penalties, impassable-edge exclusion,
explicit no-route behavior, a narrow backend endpoint, and truthful accessible
frontend route states. Runtime ML remains disabled and must not be required.

## Locked authoritative inputs

- `docs/phases/TEAM-PHASE-01-GATE.md`
- `docs/routing/ROUTING_CONTRACT.md`
- `data/samples/routing-known-graph.example.json`
- `data/samples/route-found.example.json`
- `data/samples/no-route.example.json`
- `data/samples/ubelt-v1-preview.geojson`
- `data/samples/ubelt-v1-flood-join.geojson`
- `backend/app/integrations/geospatial.py`
- `docs/ui/UI_STATES.md`

These files replace personal handoffs. A member pulls accepted changes from
`main`; no member waits for or approves another member directly.

## Locked behavior

- A* is the required production algorithm for the prototype.
- Base cost plus documented deterministic penalties determines the route.
- Severe or impassable edges are removed before search.
- Identical inputs and contract versions return the same route and explanation.
- A disconnected destination returns the no-route contract; the UI must not draw a substitute line.
- Runtime ML remains disabled. Missing or rejected ML produces zero ML penalty and an explicit fallback warning.
- Results identify the controlled scenario and timestamp and never claim live or guaranteed-safe navigation.

## Independent work packages

### Matthew — Deterministic routing engine

Own the pure routing package under `routing/src/resqph_routing/` and its routing
tests. Implement cost calculation, graph construction from contract records,
A*, exclusions, deterministic tie handling, route reconstruction, explanations,
and all five known-graph cases. Do not edit backend or frontend files.

### Jared — Backend routing boundary

Own `backend/app/schemas/routing.py`, `backend/app/integrations/routing.py`,
`backend/app/api/routes/routing.py`, focused backend tests, and the narrow router
registration in `backend/app/main.py`. Validate origin/destination, scenario,
algorithm, and stable response/error envelopes against the locked JSON fixtures.
Do not edit routing algorithms or frontend files.

### Ranee — Route client and map overlay, temporarily covering Elle

Own `frontend/src/features/routing/types.ts`, `routeApi.ts`, `useRoute.ts`,
`RouteOverlay.tsx`, their tests, and the narrow wiring changes required in
`InteractiveFloodMap.tsx`. Consume the locked response fixtures, render only
server-provided route geometry, preserve loading/error/no-route states, and
never invent a fallback path. Do not edit backend or routing Python.

### Clarence — Accessible route presentation

Own prop-driven route summary, cost-breakdown, explanation, warning, fallback,
and no-route presentation components and tests under
`frontend/src/features/routing/presentation/`. Components must be responsive,
keyboard-readable, announced appropriately, and meaningful without color. Do
not fetch data, calculate routes, or edit backend/routing files.

### Ranee — Integration and gate

Review each package against its issue and file boundary, integrate through
merged `main`, run the complete known-graph/API/UI flow, update evidence and
status, and record `Approve`, `Approve with conditions`, or `Do not approve`.

## Required verification

- All five cases in `routing-known-graph.example.json` pass exactly.
- Impassable edges never appear in a returned route.
- Missing/invalid ML cannot break deterministic routing.
- Backend success, validation, no-route, unavailable, and malformed-result cases pass.
- Frontend loading, route-found, warning/fallback, empty/no-route, and API error states pass.
- The route explanation and cost breakdown match the returned edge decisions.
- Routing Ruff/Pytest, backend Ruff/Pytest, frontend lint/tests/build, and integrated contract checks pass.

## Exit gate

Ranee may approve only when a controlled scenario demonstrably changes or
blocks the baseline path, the no-route response is preserved end to end, all
results are explainable and deterministic, and the application still works
with runtime ML disabled.

## Completion record

Ranee approved this gate on 2026-10-04 after PRs #50–#53 and the final
engine-to-API-to-UI integration in PR #55 were merged and verified. See the
[`gate`](TEAM-PHASE-02-GATE.md) and
[`evidence`](../testing/TEAM-PHASE-02-EVIDENCE.md).
