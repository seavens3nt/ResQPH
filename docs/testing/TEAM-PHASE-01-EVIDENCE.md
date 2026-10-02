# Team Phase 1 — Integrated evidence

**Status:** Completed and verified

**Acceptance owner:** Ranee

**Verified:** 2026-10-03

**Verified baseline:** `main` at `7541c65`, followed by the corrections in the
Team Phase 1 gate pull request

## Accepted work

| Package | Accepted pull request | Verified result |
|---|---|---|
| Bounded U-Belt pipeline | #39 | 912 nodes, 2,168 directed edges, zero duplicate IDs, 10/10 controlled records matched |
| Backend geospatial loader | #40 | Authoritative fixtures load; missing, malformed, duplicate, version, timestamp, numeric, and unknown-ID failures are tested |
| Fixture-driven map layers | #42 and #43 | Loading, success, empty, malformed, unavailable, metadata, and text-alternative states are tested |
| Accessible map presentation | #41 | Prop-driven legend, notice, layer summary, responsive, keyboard, stale, empty, and unavailable states are tested |

The gate correction changes the map default from the one-edge contract example
to `ubelt-v1-preview.geojson` and `ubelt-v1-flood-join.geojson`. The frontend
therefore consumes the same authoritative 30-edge/10-record fixture as the
backend.

## Fixture evidence

| File | Records | SHA-256 |
|---|---:|---|
| `data/samples/ubelt-v1-preview.geojson` | 30 road edges | `da80118a7f327b4834bf2c3ad61a892ba833e7f23290a54863f511a810a4d96e` |
| `data/samples/ubelt-v1-flood-join.geojson` | 10 controlled records | `383263419aa8138cf3b5628f350ed88efcad01632c865235c7fcac20655a7dc7` |

Source, extraction date, ODbL attribution, CRS, coordinate order, processing,
join coverage, and limitations are recorded in `data/metadata/` and the
geospatial evidence report.

## Integrated verification

Executed on Windows with Python 3.12.14 and Node.js 22:

```text
routing Ruff: passed
routing Pytest: 59 passed
backend Ruff: passed
backend Pytest: 73 passed, 2 skipped
frontend lint: passed with 4 pre-existing non-blocking warnings outside Team Phase 1 map code
frontend Vitest: 155 passed
frontend production build: passed
JSON/GeoJSON parse check: 10 fixtures parsed
git diff --check: passed
```

The two skipped backend tests require the separately enabled MongoDB replica-set
integration environment (`RUN_MONGODB_INTEGRATION=1`). Their request/assignment
behavior was accepted in Project Foundation Phase 2 and is not changed here.
The Vite build reports a non-blocking bundle-size advisory; code splitting is
tracked as later optimization rather than a mapping-gate requirement.

## Safety and scope result

- The UI identifies the scenario as controlled and not live.
- No map or loader claims guaranteed passability, official dispatch, or actual-emergency readiness.
- Invalid, out-of-bound, duplicate, mismatched, or unknown geospatial records fail explicitly.
- Final A*, route APIs, runtime ML, and persistent offline synchronization remain outside Team Phase 1.

## Supporting evidence

- `docs/testing/TEAM-PHASE-01-GEOSPATIAL-EVIDENCE.md`
- `docs/testing/TEAM-PHASE-01-MAP-EVIDENCE.md`
- `docs/testing/evidence/team-phase-01-map/`
- `docs/testing/evidence/team-phase-01-presentation/`
