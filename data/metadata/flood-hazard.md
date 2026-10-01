# Flood-hazard source decision

**Decision:** Controlled scenario fixture is the guaranteed MVP source

**Status:** Completed Phase 1 foundation decision

**Decision date:** 2026-09-22

## Guaranteed source

ResQPH uses the committed [`flood-scenario.example.geojson`](../samples/flood-scenario.example.geojson) schema and team-authored controlled scenarios as the authoritative MVP hazard input. Controlled records join to road segments by stable `edge_id` and declare their scenario ID, level, depth when defined, passability, source type, and observation/scenario time.

This decision guarantees that deterministic routing, fallback behavior, tests, and the final demonstration can run without depending on an unavailable or redistribution-restricted external hazard layer.

## Optional historical enrichment

[Geoportal Philippines](https://geoportal.gov.ph/) and its [data inventory](https://www.geoportal.gov.ph/gpresources/GP_DataInventory.pdf) may be evaluated as optional historical context. A Geoportal layer may enter the application only when its publisher, exact layer, access method, license/restriction, coverage, period, scale, CRS, fields, and road-edge transformation have been recorded and accepted in a later data PR.

An external layer is not copied into Git merely because it can be viewed online. If its download or redistribution terms are unclear, the controlled fixture remains the approved source.

## Controlled schema

Required fields:

- `scenario_id`
- `edge_id`
- `flood_level`: `none`, `low`, `moderate`, `high`, or `severe`
- `flood_depth_cm`: nullable non-negative number
- `passability`: `passable`, `restricted`, or `impassable`
- `source_type`: `controlled` or `historical`
- `scenario_timestamp`
- `reason`

## Join rule

1. Validate the scenario and extraction versions.
2. Reject unknown or duplicate `edge_id` values.
3. Left-join scenario attributes to the approved road graph.
4. Treat missing scenario records as `unknown`, not automatically safe.
5. Apply the documented uncertainty penalty to unknown/stale records.
6. Exclude `impassable` or `severe` edges before A*.

The committed fixture demonstrates the contract join. It does not claim that the synthetic conditions occurred on the represented streets.

## Safety limitation

Controlled and historical layers are not live flood measurements. The UI must show the scenario/source timestamp and must not claim current accuracy, guaranteed passability, or safe navigation.

---

## Committed sample scenario (2026-10-01)

**Scenario ID:** `scenario-controlled-ubelt-001`
**Scenario timestamp:** `2026-10-01T00:00:00Z`
**Records:** 10
**Fixture:** `data/samples/ubelt-v1-flood-join.geojson`

The sample scenario is generated deterministically by
`routing/src/resqph_routing/flood_join.py::build_sample_scenario`, which
applies a fixed rotation of (flood_level, passability, flood_depth_cm)
patterns to the first 10 edges of the graph sorted by `edge_id`. This
guarantees identical output on every regeneration for a given graph.

### Join coverage

| Metric | Value |
|---|---:|
| Scenario records | 10 |
| Matched edges | 10 |
| Unmatched edges | 2,158 |
| Rejected (unknown edge_id) | 0 |
| Rejected (duplicate edge_id) | 0 |
| Rejected (invalid record) | 0 |

### Resulting flood-level distribution

| Level | Edges |
|---|---:|
| none | 2,160 |
| low | 2 |
| moderate | 2 |
| high | 2 |
| severe | 2 |

### Resulting passability distribution

| Passability | Edges |
|---|---:|
| passable | 2,162 |
| restricted | 4 |
| impassable | 2 |

Unmatched edges retain the contract defaults `flood_level='none'` and
`passability='passable'`. Consumers must apply the documented uncertainty
penalty (see `docs/routing/ROUTING_CONTRACT.md`) rather than treating
unmatched records as automatically safe.
