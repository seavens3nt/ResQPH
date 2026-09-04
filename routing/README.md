# Routing workspace

This folder owns road-graph preparation, basic shortest-path routing, flood and geographic risk costs, impassable-road handling, dynamic rerouting, and route explanations.

Implementation begins with a deterministic A* or Dijkstra baseline. AI/ML output may contribute a documented road-risk penalty but must not replace deterministic constraints or human rescue decisions.

## Intended structure

When Phase 3–4 implementation begins, organize reusable code under `src/resqph_routing/`:

- `contracts.py` for route inputs, results, warnings, and explanations.
- `graph/` for graph construction, loading, validation, and coordinate snapping.
- `algorithms/` for deterministic A* or Dijkstra.
- `costs/` for distance, time, flood, elevation, passability, and bounded risk penalties.
- `scenarios/` for controlled flood changes and rerouting.
- `tests/` for small known graphs, no-route cases, cost changes, and explanations.

Routing must remain independent of FastAPI, MongoDB, React, notebooks, and trained-model availability. Add reproducible package metadata and installation instructions when the first routing implementation Issue begins; do not modify `PYTHONPATH` inside source files.
