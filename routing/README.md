# Routing workspace

This folder owns road-graph preparation, deterministic shortest-path routing,
flood and geographic risk costs, impassable-road handling, dynamic rerouting,
and route explanations for the ResQPH prototype.

Team Phase 1 delivered the extraction, normalization, flood-join, and
validation pipeline for the U-Belt pilot area. Team Phase 2 adds deterministic
A* routing and explainable cost penalties on top of those accepted fixtures.

## Installation

```powershell
cd routing
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Build the U-Belt graph and fixtures

From the repository root, with the routing venv active:

```powershell
python routing/scripts/build_ubelt_graph.py
python routing/scripts/build_ubelt_graph.py --force
```

### What it produces

| Path | Committed? | Purpose |
|---|---|---|
| `data/raw/ubelt-v1-osm.graphml` | no (gitignored) | OSMnx raw extraction cache |
| `data/interim/ubelt-v1-graph.graphml` | no (gitignored) | Intermediate NetworkX graph |
| `data/processed/ubelt-v1-edges.geojson` | no (gitignored) | Full joined edges (~2,168) |
| `data/samples/ubelt-v1-preview.geojson` | yes | 30-edge committed fixture |
| `data/samples/ubelt-v1-flood-join.geojson` | yes | 10-record committed scenario |

## Run tests

```powershell
python -m pytest tests/ -v
```

The suite covers extraction bounds and cache behavior, edge-ID format, offline
normalization, flood-join rejection rules, metadata consistency, schema and
boundary validation, committed-fixture integrity, deterministic routing,
fallbacks, exclusions, and explanations. No network access or private raw
cache is required.

## Module layout

```text
routing/src/resqph_routing/
  config.py       Constants, CRS definitions, path helpers, road-class maps
  extract.py      Study-area loader + OSMnx download with cache
  normalize.py    Contract-schema projection and edge-ID generation
  flood_join.py   Controlled-scenario join + rejection reporting
  validate.py     Bounds, geometry, schema, and join-coverage checks
  costs.py        Validated deterministic and bounded optional-ML costs
  graph.py        Known-graph and accepted U-Belt GeoJSON graph builders
  astar.py        Deterministic A* search and ordered path-cost calculation
  explain.py      Chosen, rejected, excluded, fallback, and warning explanations
```

## ResQPH routing engine

Deterministic flood-aware A* routing engine for the ResQPH prototype.

## Architecture

This package is a **pure Python routing module** with zero dependencies on
FastAPI, MongoDB, React, or runtime ML artifacts. It operates exclusively
on explicit inputs (graph, origin, destination, scenario) and returns
explainable results.

## Cost Model

All costs are in **seconds-equivalent prototype units**:

```text
edge_cost = base_travel_cost
+ deterministic_flood_penalty
+ restricted_passability_penalty
+ obstacle_penalty
+ uncertainty_penalty
+ bounded_ml_penalty_when_accepted
```

### Rule Table

| Scenario State | Effect |
|---|---|
| `none` | No flood penalty |
| `low` | +30 cost units |
| `moderate` | +90 cost units |
| `high` | +240 cost units + warning |
| `severe` or `impassable` | Edge excluded |
| `restricted` passability | +180 cost units |
| Verified recent obstacle | +120 cost units |
| Stale/uncertain data | +60 cost units + warning |
| ML (accepted) | `round(clamp(prob, 0, 1) * 60)`, capped at 60 |

## Usage

```python
from resqph_routing import build_graph, find_route, explain_route

graph = build_graph(nodes, edges, scenario=scenario, ml_accepted=False)
result = find_route(graph, origin="A", destination="D")
explanations = explain_route(graph, result)
```

The accepted U-Belt fixtures can be consumed without translating their
`from_node`, `to_node`, and `travel_time_s` properties manually:

```python
import json
from pathlib import Path

from resqph_routing import build_graph_from_geojson

road = json.loads(Path("../data/samples/ubelt-v1-preview.geojson").read_text())
flood = json.loads(
    Path("../data/samples/ubelt-v1-flood-join.geojson").read_text()
)
graph = build_graph_from_geojson(road, flood, ml_accepted=False)
```

## Reference contracts

- `docs/phases/TEAM-PHASE-02.md` — active routing scope and acceptance criteria
- `docs/routing/ROUTING_CONTRACT.md` — routing inputs, outputs, and cost rules
- `data/samples/road-edge.example.geojson` — edge schema
- `data/samples/flood-scenario.example.geojson` — scenario schema
- `data/metadata/road-network.md` — extraction details and limitations
- `data/metadata/flood-hazard.md` — controlled scenario and join rules

## Limitations

- OSM road completeness and access tags can change over time.
- A forced rebuild uses the then-current OpenStreetMap snapshot and may not
  reproduce the reviewed 2026-10-01 counts byte for byte.
- No road is guaranteed passable or safe because it appears in OSM.
- The controlled flood scenario is synthetic and explicitly labelled as such.
- The A* heuristic is intentionally zero, making the search
  Dijkstra-equivalent for the bounded academic prototype.
- Runtime ML remains optional and disabled by default; missing, invalid, or
  rejected probabilities use deterministic fallback.
- Backend wiring and persistent offline behavior are separate integration
  packages.
