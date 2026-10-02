# Team Phase 1 — Geospatial evidence

**Status:** Repaired and verified; ready for Ranee's merge decision
**Owner:** Matthew
**Branch:** `feature/32-ubelt-geospatial-pipeline`
**Generated:** 2026-10-01
**Independent repair verification:** 2026-10-03
**Extraction version:** `ubelt-v1`

## Environment

| Component | Version |
|---|---|
| Python | 3.12.14 |
| OSMnx | 2.1.1 |
| GeoPandas | 1.2.0 |
| NetworkX | 3.7 |
| PyProj | 3.8.0 |
| Shapely | 2.1.2 |
| Rasterio | 1.5.2 |
| Pytest | 8.4.2 |
| Ruff | 0.16.10 |

Installed from `routing/requirements.txt` and `routing/requirements-dev.txt`.

## Reproduction commands

```powershell
cd routing
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt

cd ..
python routing/scripts/build_ubelt_graph.py
cd routing
python -m pytest tests/ -v
python -m ruff check src scripts tests
```

The build command uses the cached raw GraphML when present. Without that cache,
it downloads the current OpenStreetMap snapshot. OpenStreetMap changes over
time, so a future forced download may produce different graph counts. The
committed fixtures below are the reviewed 2026-10-01 snapshot.

## Recorded extraction result

| Metric | Value |
|---|---:|
| Raw nodes | 912 |
| Raw directed edges | 2,168 |
| Normalized nodes | 912 |
| Normalized directed edges | 2,168 |
| Duplicate `edge_id` values | 0 |
| Invalid geometries | 0 |
| Edges outside the project-defined polygon beyond 50 m | 0 |
| Controlled scenario records | 10 |
| Matched controlled records | 10 |
| Rejected controlled records | 0 |

## Committed fixture integrity

| File | Records | SHA-256 |
|---|---:|---|
| `data/samples/ubelt-v1-preview.geojson` | 30 edges | `da80118a7f327b4834bf2c3ad61a892ba833e7f23290a54863f511a810a4d96e` |
| `data/samples/ubelt-v1-flood-join.geojson` | 10 records | `383263419aa8138cf3b5628f350ed88efcad01632c865235c7fcac20655a7dc7` |

The offline suite verifies these checksums, stable IDs, positive finite numeric
values, controlled vocabularies, scenario metadata consistency, and geometry
containment within the approved polygon tolerance.

## Independent verification result

Executed on 2026-10-03 after merging current `main` into the PR branch:

```text
59 passed
All Ruff checks passed
```

All 59 tests run without network access and without Matthew's uncommitted raw
OSM cache. The normalization tests use a deterministic synthetic OSM-like graph;
the committed-fixture tests validate the reviewed U-Belt sample directly.

## Corrections made during review

- Replaced seven cache-dependent skipped tests with deterministic offline tests.
- Changed boundary validation from intersection-only to full geometry coverage
  inside the approved polygon plus the documented 50 m tolerance.
- Added scenario ID, timestamp, source-type, timezone, and finite-depth checks.
- Added edge-ID, numeric range, vocabulary, and join-coverage validation.
- Corrected source-method documentation and recorded fixture checksums.

## Limitations

- The fixture is a controlled academic snapshot, not live flood evidence.
- The road graph reflects OpenStreetMap as recorded on 2026-10-01 and does not
  guarantee road completeness, passability, or safety.
- This package prepares data only. A*/Dijkstra routing, runtime ML integration,
  and persistent offline synchronization remain outside this PR.
