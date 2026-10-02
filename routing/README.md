# Routing workspace

This folder owns road-graph preparation, deterministic shortest-path routing,
flood and geographic risk costs, impassable-road handling, dynamic rerouting,
and route explanations for the ResQPH prototype.

Team Phase 1 delivers the extraction, normalization, flood-join, and
validation pipeline for the U-Belt pilot area. Later phases add A*/Dijkstra
routing and cost penalties on top of the fixtures produced here.

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

59 tests: extraction bounds and cache behavior, edge-ID format, offline
normalization, flood-join rejection rules, metadata consistency, schema and
boundary validation, and committed-fixture integrity. No network access or
private raw cache is required.

## Module layout

```text
routing/src/resqph_routing/
  config.py       Constants, CRS definitions, path helpers, road-class maps
  extract.py      Study-area loader + OSMnx download with cache
  normalize.py    Contract-schema projection and edge-ID generation
  flood_join.py   Controlled-scenario join + rejection reporting
  validate.py     Bounds, geometry, schema, and join-coverage checks
```

## Reference contracts

- `docs/phases/TEAM-PHASE-01.md` — phase scope and acceptance criteria
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
- This phase does not implement final A* routing, runtime ML integration,
  or persistent offline behavior.
