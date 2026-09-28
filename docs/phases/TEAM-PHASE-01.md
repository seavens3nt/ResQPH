# Team Phase 1 — Mapping and Geospatial Pipeline

**Status:** Ready to start when the Foundation Phase 2 gate PR merges

**Gate owner:** Ranee

**Primary owner:** Matthew

**Backend integration support:** Jared

**UI/map presentation support:** Elle and Clarence

## Phase goal

Produce one small, reproducible road-network and controlled-flood dataset for `ubelt-pilot-v1`. This phase prepares stable graph and map inputs; it does not implement final A* routing or claim live flood accuracy.

## Locked constraints

- Use only the approved WGS 84 study-area fixture in `data/samples/study-area.geojson`.
- Use one curated OpenStreetMap extract, not nationwide or full Metro Manila data.
- Preserve OpenStreetMap attribution and record ODbL/source metadata.
- Use controlled flood data as the guaranteed input; historical data is optional enrichment.
- Never commit private rescue data, large raw datasets, secrets, caches, or generated model binaries.
- Every traversable road edge must receive a stable, documented `edge_id` that can join road, flood, routing, and later ML records.
- CRS, coordinate order, simplification, filtering, timestamps, and missing-data rules must be explicit.
- XGBoost packaging may be prepared in parallel, but ML cannot block this phase or be represented as verified here.
- No final route-safety, live-monitoring, government, or actual-emergency-readiness claim.

## Work packages

### Matthew — Road-network and geospatial pipeline

Own:

- `routing/src/`
- `routing/tests/`
- `routing/scripts/`
- `data/samples/` road/flood/map fixtures
- `data/metadata/road-network.md`
- `data/metadata/flood-hazard.md`
- phase-specific geospatial evidence in `docs/testing/`

Expected output:

- reproducible extraction script for the exact U-Belt bounding box;
- documented network type, simplification, access filtering, and CRS;
- processed nodes/edges with unique stable `edge_id` values;
- controlled flood-to-edge join with unmatched-record reporting;
- graph statistics before/after filtering;
- a deliberately small committed fixture suitable for tests and demos;
- automated checks for geometry validity, duplicate IDs, bounds, required fields, and join coverage.

Do not edit core request/mission services, frontend role flows, or production authentication. Large source/processed files remain outside Git history and are recreated by scripts.

### Jared — Backend adapter review

Own/support:

- backend-facing geospatial schema or adapter files explicitly agreed with Ranee;
- tests proving the backend can load the small accepted fixture;
- review of stable `edge_id`, GeoJSON, and error/fallback boundaries.

Expected output:

- one narrow loader/adapter contract without routing logic;
- clear missing-file, malformed-geometry, and incompatible-version behavior;
- no change to the already accepted request/mission lifecycle unless a separate issue is approved.

### Elle and Clarence — Map presentation review

Own/support:

- map legend, source/time label, controlled-scenario notice, loading/empty/error states;
- accessible color/label review for road and flood layers;
- frontend work only after Matthew's fixture/schema is accepted.

Expected output:

- a presentation checklist or small map-layer PR using the accepted fixture;
- no hard-coded duplicate geospatial dataset inside React components;
- no live-data or guaranteed-safe-route wording.

### Ranee — Integration and gate

Own:

- scope and schema decisions;
- review of cross-area changes;
- evidence reconciliation, status/dashboard updates, and the phase gate;
- decision on whether any backend/frontend adapter is accepted.

Expected output:

- one accepted fixture/schema version;
- reviewed reproduction evidence;
- `Approve`, `Approve with conditions`, or `Do not approve` gate record.

## File architecture to create

```text
routing/
  src/
    resqph_routing/
      __init__.py
      config.py
      extract.py
      normalize.py
      flood_join.py
      validate.py
  scripts/
    build_ubelt_graph.py
  tests/
    test_extract.py
    test_flood_join.py
    test_validate.py
  README.md

data/
  raw/          # ignored; never commit downloaded bulk data
  interim/      # ignored; never commit large intermediate files
  processed/    # ignored except deliberately approved small fixtures
  samples/      # small sanitized/reproducible fixtures only
  metadata/     # sources, license, CRS, dates, commands, limitations

docs/testing/
  TEAM-PHASE-01-EVIDENCE.md
```

Names may be adjusted in the implementation PR only when the same ownership and separation are preserved.

## File rules

- Python modules and files use `snake_case`; classes use `PascalCase`; constants use `UPPER_SNAKE_CASE`.
- Keep acquisition, normalization, flood joining, validation, and later routing in separate modules.
- Do not store coordinates as latitude/longitude when the contract expects GeoJSON longitude/latitude.
- Do not embed absolute Windows paths; use repository-relative inputs and configuration.
- Do not silently repair invalid records. Report rejected/unmatched counts and reasons.
- Generated outputs must include a schema/version field or accompanying metadata.
- Tests use tiny deterministic fixtures and must not require a live download.
- Update metadata whenever a source, boundary, transform, license, or schema changes.

## GitHub and coding rules

1. One issue and one focused branch per work package; recommended prefix: `feature/team1-<short-name>`.
2. Pull from `main` before starting and before final verification.
3. Do not push directly to `main`.
4. PR descriptions must link the issue, list owned files changed, state the exact commands run, and disclose data limitations.
5. Cross-owner file edits require the owner and Ranee to review the reason.
6. Do not combine mapping, final routing, model deployment, offline support, or unrelated UI redesign in one PR.
7. A green CI result is necessary but not sufficient; the reproduction command and inspected output statistics are gate evidence.
8. Issues close only when the linked PR is merged and its acceptance criteria are demonstrated.

## Required verification

At minimum, the phase evidence must record:

- exact extraction/build command and dependency versions;
- source URLs, retrieval dates, license/attribution, and boundary;
- CRS and coordinate-order checks;
- node/edge counts before and after simplification/filtering;
- duplicate/missing `edge_id` count of zero;
- geometry/bounds validation;
- controlled-flood join counts, unmatched IDs, and reason categories;
- deterministic regeneration of the committed sample fixture; and
- backend/frontend fixture-consumption checks if those adapters are included.

## Exit gate

Ranee may choose `Approve` only when another member can reproduce the bounded graph/fixture from documented commands, stable IDs pass automated validation, source/CRS/license limitations are recorded, and the controlled flood join is inspectable. Final A* routing, runtime XGBoost integration, and persistent offline behavior are not exit requirements for this phase.
