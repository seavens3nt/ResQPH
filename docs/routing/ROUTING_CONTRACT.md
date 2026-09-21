# Flood-aware routing and risk contract

**Status:** Completed and verified Phase 1 routing baseline
**Primary algorithm:** A*
**Last updated:** 2026-09-22

## Boundary

The routing package accepts an explicit road graph, origin, destination, controlled scenario, deterministic edge attributes, and optional accepted ML risk results. It does not read React state, FastAPI requests, MongoDB collections, notebooks, or private emergency records directly.

All prototype route inputs must fall inside `ubelt-pilot-v1`, defined by [`../../data/samples/study-area.geojson`](../../data/samples/study-area.geojson). A documented processing buffer may support graph clipping, but returned prototype origins, destinations, and route claims remain inside the approved boundary.

## Required road-edge attributes

| Field | Meaning |
|---|---|
| `edge_id` | Stable join identifier used by routing, data, and ML |
| `from_node`, `to_node` | Graph endpoints |
| `geometry` | Line geometry in the documented CRS |
| `length_m` | Edge length in metres |
| `travel_time_s` | Estimated baseline travel time when available |
| `road_class` | Normalized road category |
| `flood_level` | `none`, `low`, `moderate`, `high`, or `severe` for the scenario |
| `passability` | `passable`, `restricted`, or `impassable` |
| `observed_at` | Source or scenario time |
| `source_type` | `controlled`, `historical`, or verified report |

Elevation and ML fields are optional. Their absence must not prevent deterministic routing.

## Cost contract

```text
edge_cost = base_travel_cost
          + deterministic_flood_penalty
          + restricted_passability_penalty
          + bounded_ml_penalty_when_accepted
```

An impassable edge is excluded before A* evaluates route cost. ML cannot restore an excluded edge or lower a deterministic safety penalty.

## Approved prototype rule table

These are seconds-equivalent prototype cost units for controlled academic scenarios. They are approved because the committed known-graph fixture produces the required baseline, reroute, exclusion, no-route, and bounded-ML outcomes. They are not scientifically validated safety thresholds.

| Scenario state | Provisional effect |
|---|---|
| `none` | No flood penalty |
| `low` | `+30` cost units |
| `moderate` | `+90` cost units |
| `high` | `+240` cost units and warning |
| `severe` or `impassable` | Exclude edge |
| `restricted` passability | `+180` cost units in addition to flood level |
| Verified recent obstacle | `+120` cost units unless impassable |
| Stale, unknown, or uncertain scenario data | `+60` cost units and warning |

The ML contribution is `round(clamp(risk_probability, 0, 1) * 60)`, so it is non-negative and capped at `60` cost units per edge. ML cannot dominate deterministic exclusion, remove a warning, or reduce a rule penalty.

The authoritative verification input is [`../../data/samples/routing-known-graph.example.json`](../../data/samples/routing-known-graph.example.json). Implementation tests must reproduce every expected case exactly before Team Phase 2 is accepted.

## Route request

```json
{
  "origin": { "type": "Point", "coordinates": [120.9940, 14.6035] },
  "destination": { "type": "Point", "coordinates": [120.9946, 14.6042] },
  "scenario_id": "scenario-controlled-001",
  "algorithm": "astar",
  "include_ml_penalty": true
}
```

## Successful result

```json
{
  "status": "route-found",
  "route_id": "route-opaque-id",
  "geometry": { "type": "LineString", "coordinates": [] },
  "distance_m": 1450,
  "estimated_time_s": 540,
  "total_cost": 620,
  "edge_ids": ["edge-001", "edge-002"],
  "cost_breakdown": {
    "base": 540,
    "deterministic_risk": 60,
    "ml_risk": 20
  },
  "fallback_used": false,
  "warnings": ["Controlled flood scenario; not live navigation data."],
  "explanation": "Loyola Street was excluded as impassable. The selected corridor had the lowest eligible combined cost.",
  "scenario_timestamp": "2026-09-21T04:00:00Z",
  "model_version": "rf-001"
}
```

## No-route result

```json
{
  "status": "no-route",
  "reason": "controlled_impassability_disconnected_destination",
  "warnings": ["No eligible route exists under the selected controlled scenario."],
  "scenario_timestamp": "2026-09-21T04:00:00Z"
}
```

The UI must not replace a no-route result with an unverified straight line or ordinary shortest path.

## Required verification

- A small known graph proves the expected A* baseline route.
- Increasing one edge’s flood penalty changes the expected route.
- An impassable edge is never returned.
- A disconnected graph returns the no-route contract.
- Missing or invalid ML output triggers the rule fallback.
- Route results are deterministic for identical inputs and recorded versions.
- Each result includes source/scenario time, warnings, and an explanation.
