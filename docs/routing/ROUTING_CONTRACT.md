# Flood-aware routing and risk contract

**Status:** Phase 1 baseline approved with conditions
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

## Provisional relative rule table

These values are test weights, not scientifically validated safety thresholds. Final values require known-graph tests and Ranee’s approval.

| Scenario state | Provisional effect |
|---|---|
| `none` | No flood penalty |
| `low` | `+10` relative cost units |
| `moderate` | `+30` relative cost units |
| `high` | `+70` relative cost units and warning |
| `severe` or `impassable` | Exclude edge |
| Verified recent obstacle | `+20` relative cost units unless impassable |
| Stale or uncertain scenario data | `+10` relative cost units and warning |

The ML contribution must be non-negative and capped so it cannot dominate deterministic exclusion. The final cap remains a required routing-acceptance decision under Phase 1 gate condition C-06.

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
