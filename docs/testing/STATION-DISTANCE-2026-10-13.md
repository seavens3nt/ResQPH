# Station distance selection investigation — 2026-10-13

## Reproduction boundary

Branch `temporary-main`; initial working tree clean; exact HEAD and baseline
`c95c8c32dca41e983e424a13e789a57e0dee323b` (weather repair already committed by the
existing checkout). No branch switch, merge, commit, push or remote operation.
All changes below are local against that revision. Frontend, authentication,
offline synchronization and mission lifecycle implementation are unchanged.

Replica-set acceptance uses existing localhost:27018 `rs0`. Each station test
and the evidence command first verifies a replica set, creates a unique disposable
database, and drops only its owned database. Equal fixtures use one available
canonical unit per station with member_count=4; capacity is **one active mission**,
not member count/headcount. No developer/demo database or availability reset.

## Confirmed causes and limits

1. **Dispatch origin policy:** baseline `_team_point` preferred `current_location`.
   Completion intentionally retains the simulation's endpoint there. The old API
   contract explicitly allowed mobile-position dispatch, with no age threshold.
   That conflicts with the intended available-station/headquarters dispatch rule.
   A controlled, persisted reproduction moves only the synthetic stored moving
   positions: Sampaloc remains at Algeciras after a simulated journey and Iverson
   remains beside the Sampaloc incident. Baseline selects Iverson; repaired code
   selects Sampaloc using unchanged headquarters. This proves a mechanism, **not
   the historical cause of the user's unprovided request**.
2. **Snap optimization defect:** distance mode searched combinations of up to 12
   candidate edge endpoints per side, minimizing only intervening full-edge road
   lengths. Snap offsets were omitted, nearby endpoints could be substituted to
   shorten the trip, and partial edges were not counted. For the same near-Sampaloc
   pin, Lacson's baseline route snapped the destination 45.039 m away instead of
   onto the common nearest segment (6.860 m offset). Sampaloc already won when all
   five original origins were headquarters; visual proximity alone was not a bug.
3. **Length fallback:** the package previously substituted combined time/risk cost
   when `length_m` was missing in distance mode. Distance now rejects absent,
   nonnumeric, boolean, negative or nonfinite lengths instead of mixing units.

No coordinate swap, incident replacement/rounding, ETA sort, distance-result
cache, first-station fallback or forced Sampaloc preference was found in the active
assignment path. Stable station/team mapping and ascending station-ID ties remain.
Existing scenario and one-way exclusions remain enforced. The worker calls the
same `_rank_eligible_teams` distance-mode path as recommendation.

## Before/after reproduced moving-position case

Confirmed synthetic destination `[120.99315, 14.60805]`. Every station is eligible,
available and has equal capacity. Only baseline moving-position fields differ;
canonical headquarters and the road/scenario fixtures are unchanged.

| Stable station ID | Before actual origin (current_location) | Before road m | After actual origin (base_location) | After road m |
|---|---|---:|---|---:|
| sampaloc-fire-station | [120.9909, 14.6181] | 1468.16 | [120.9931, 14.608] | 26.53 |
| central-sampaloc-lacson-hq | [120.9918, 14.6067] | 191.11 | [120.9918, 14.6067] | 227.46 |
| iverson-fire-rescue | [120.9932, 14.6081] | 50.23 | [120.9972, 14.6071] | 603.11 |
| david-fire-rescue-hq | [120.9986, 14.6088] | 781.59 | [120.9986, 14.6088] | 809.46 |
| central-sampaloc-algeciras | [120.9909, 14.6181] | 1468.16 | [120.9909, 14.6181] | 1528.91 |

**Before winner: Iverson. After winner: Sampaloc.** Off-road offsets are diagnostics,
not verified passable roads and not included in these distances. Full original and
snapped points, fractions, edge/node IDs, availability, ranking and exclusions are
in [the synthetic JSON evidence](STATION-DISTANCE-EVIDENCE-2026-10-13.json).

## Five fair headquarters comparisons

Each destination is its supplied headquarters plus `[0.00005, 0.00005]` degrees,
then projected onto actual committed road geometry. Neither the destination nor
the station catalog is replaced to favor a winner. All five candidate routes use
the same graph/scenario for each comparison. Baseline also selected the corresponding
station for these particular pins; the corrected distances differ because endpoint
selection and partial-edge travel are now consistent.

| Near supplied headquarters | Baseline winning road m | Corrected winning road m | Corrected winner |
|---|---:|---:|---|
| sampaloc-fire-station | 50.23 | 26.53 | sampaloc-fire-station |
| central-sampaloc-algeciras | 39.12 | 0.35 | central-sampaloc-algeciras |
| central-sampaloc-lacson-hq | 30.62 | 7.71 | central-sampaloc-lacson-hq |
| iverson-fire-rescue | 71.68 | 3.48 | iverson-fire-rescue |
| david-fire-rescue-hq | 39.44 | 7.71 | david-fire-rescue-hq |

For the corrected near-Sampaloc comparison, origin offsets for Sampaloc, Lacson,
Iverson, David and Algeciras are respectively 12.093, 2.507, 26.858, 7.709 and
7.588 m; every candidate has the same 6.860 m destination offset. Iverson wins
its own near-headquarters comparison on road distance, without special treatment.

Nearest station busy: Sampaloc excluded; Lacson wins at 227.46 m. Nearest station's
physical origin segment blocked by a controlled scenario: Sampaloc excluded;
Lacson wins at 314.78 m. All unavailable: no candidate/assignment. All out of road
coverage: explicit no-route and pending request. Missing/malformed/out-of-bound
headquarters are exclusions, not a fallback to moving coordinates. A stale
availability='available' record with active assignment links is excluded as busy.
No station coordinates were altered in the blocked-road fixture.

## Graph coverage, snapping and algorithm

- Committed `ubelt-station-network.geojson`: **2,533 directed edges, 1,050 nodes**.
  One weak component; 33 strongly connected components (largest 1,004 nodes;
  others 10, 5, 2 and 29 singletons). Maximum two parallel edges for a node pair.
  Every record is labeled controlled; generation uses the existing OSMnx `drive`
  pipeline. No graph regeneration/extent change or station-data correction was needed.
- The evidence validates identical coordinates for shared node IDs and proves
  routes from all five headquarters to all five near-headquarters destinations.
  Connectivity is determined by source node IDs, never by intersecting drawn
  lines. Directed restrictions and parallel carriageways remain separate.
  This establishes committed fixture coverage, not a survey of real roads,
  bridges, entrances or emergency vehicle access. Coincident bridge/road endpoint
  ambiguity cannot be resolved without grade/access metadata; no new intersections
  are invented.
- Distance snapping chooses the **nearest physical segment before** controlled
  flood filtering. Coincident forward/reverse representations can attach; a
  blocked nearest segment cannot be replaced by a more convenient farther road.
  Snap bound is `min(ROUTE_SNAP_MAX_DISTANCE_M,
  STATION_DISPATCH_SNAP_MAX_DISTANCE_M)`; new dispatch default is **75 m**.
  This is a conservative prototype coverage guard, not a road-access guarantee.
  No tolerance was enlarged to get a route.
- Request-local virtual endpoints connect through legal directed partial-edge
  pieces, with distance/time proportional to recorded road length. Same-edge
  forward and reverse cases, exact intersections and intermediate polyline
  points are handled without zero-cost synthetic travel arcs. Coincident projected
  endpoints explicitly produce no-route rather than a fabricated positive loop.
  Road travel geometry begins/ends at the projection; straight-line offsets are
  not drawn as routes. Returned edge IDs remain the original stable source IDs.
- Package A* retains an admissible zero heuristic. NetworkX Dijkstra is used only
  as an independent **test oracle**, never as a second backend production algorithm.
  It independently verifies all 25 headquarters-to-near-headquarters road distances
  as well as the small adversarial graphs.
  Adversarial fixtures cover one-way detours, blocked reverse edges, distinct
  parallel snaps, shortest-road versus straight-line proximity and cost ties.
- The standalone cost-mode route endpoint retains its existing node-based
  controlled behavior; station recommendation, automatic assignment and initial
  persisted mission routes use the corrected distance path.
- Backend imports resolve to this checkout's `routing/src/resqph_routing`.
  Port 8000 at inspection was a Python 3.9 listener whose cwd was **PolyMerge/ml_engine**,
  not ResQPH. It was not stopped or changed. Tests use the actual ResQPH app and
  editable routing package through TestClient/service boundaries, not that listener.
  Restart ResQPH on a free configured backend port to exercise this local repair.

## Origin policy and transaction integrity

New dispatches from an available canonical station use its stored `base_location`.
`current_location` and position_updated_at retain their simulation/history meaning;
there is no current-position fallback and no simulated return-to-HQ journey.
Startup continues existing catalog seeding: headquarters/identity fields are refreshed
from the catalog, while position, availability and assignments are insert-only or
otherwise preserved. Active missions and historical route origins are not rewritten.

Request location is persisted from validated longitude/latitude payload, included
in the idempotency fingerprint and used unchanged during ranking. Transaction checks
request status/version, unit availability/version and assignment links; an origin
change before commit triggers the existing bounded re-ranking behavior. Capacity
reservation additionally rejects existing assignment links. Three bounded attempts
remain, with no route or exhausted retries leaving a pending request. Existing
transaction rollback, immutable history and idempotency mechanisms are preserved.

New missions store backend-only `dispatch_provenance`: selection mode, station,
origin/source, road distance, snap evidence, ranked candidates/versions/availability,
exclusions, scenario ID and SHA-256 of the **evaluated normalized road/flood payloads**
plus contract revision. Custom blocked scenarios get their own digests. No session
credentials or provider keys are logged; no frontend schema field was required.

Read-only inspection found no canonical Iverson station/team mission in the reusable
demo or browser-candidate databases. The configured developer `resqph` database was
also absent on the inspected local servers. No request ID/provenance identifying the
reported historical decision was supplied. Its original availability, origin and
scenario cannot be reconstructed from today's mutable station state.

## Files changed

- backend/.env.example; backend/app/core/config.py
- backend/app/integrations/routing.py
- backend/app/services/assignments.py
- backend/app/repositories/rescuers.py; backend/app/models/mission.py
- backend/tests/test_assignments.py; backend/tests/test_station_routing_coverage.py; backend/tests/test_station_distance_mongodb.py
- backend/scripts/verify_station_distance.py
- routing/src/resqph_routing/astar.py; routing/src/resqph_routing/endpoints.py
- routing/tests/test_endpoint_distance.py
- docs/api/API_CONTRACT.md; docs/routing/ROUTING_CONTRACT.md
- docs/workflows/CITIZEN_STATION_WORKFLOW.md
- docs/testing/STATION-DISTANCE-2026-10-13.md and its JSON evidence
- docs/STATUS.md and project-context architecture/current-status/sync references

## Verification

Commands below run from the indicated package folder; the localhost URI has no
credentials. Disposable-name guards refuse existing databases.

Routing folder:

```sh
.venv/bin/python -m ruff check src tests
.venv/bin/python -m pytest -q
```

Backend folder:

```sh
.venv/bin/python -m ruff check app tests scripts/verify_station_distance.py ../tests/integration
.venv/bin/python -m pytest tests ../tests/integration -q
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_station_distance_mongodb.py tests/test_assignment_mongodb.py -q
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_product_journey_mongodb.py -q
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_citizen_cancellation_mongodb.py -q
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue62_offline_station_20261013 .venv/bin/python -m pytest tests/test_offline_sync_mongodb.py -q
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue73_backend_station_20261013 .venv/bin/python -m pytest tests/test_phase5_acceptance.py -q
MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python scripts/verify_station_distance.py --baseline c95c8c32dca41e983e424a13e789a57e0dee323b --output ../docs/testing/STATION-DISTANCE-EVIDENCE-2026-10-13.json
```

| Check | Result |
|---|---|
| Routing full Ruff / full tests | PASS / **150 passed** |
| Backend Ruff, including evidence script | PASS |
| Backend/integration normal regression | **227 passed, 48 opt-in skipped** |
| Real station distance + assignment transaction suites | **11 passed, 1 skipped** (retired unauthenticated manual-assignment API acceptance) |
| Cookie-auth product journey | **8 passed** |
| Cookie cancellation/session regressions | **7 passed** |
| Real offline replay regression | **15 passed** |
| Legacy Phase 5 opt-in acceptance | **1 passed, 6 failed**; unchanged obsolete fixtures |
| Synthetic before/after evidence generation | PASS; disposable database dropped |
| git diff --check | PASS |

Legacy failures are exact existing tests:

- test_phase5_invalid_inputs_and_roles_leave_database_unchanged: cookie auth returns
  401 where the old demo-role fixture expects 403.
- test_phase5_real_mongodb_lifecycle_updates_request_mission_and_history
- test_phase5_retry_conflict_stale_actor_and_transition_rejections_do_not_write
- test_phase5_linked_lifecycle_conflict_rolls_back_all_records[request]
- test_phase5_linked_lifecycle_conflict_rolls_back_all_records[team]
- test_phase5_assignment_dependency_failure_returns_envelope_and_rolls_back

The middle four use the retired manual assignment endpoint (404 instead of 201);
the last expects retired team-alpha seed records. No auth/lifecycle workaround or
new skip was added. Existing linked legacy injections therefore remain unverified;
current transaction/cookie/capacity/rollback suites above do pass.

Intermediate checks were not accepted as final: one obsolete origin_source unit
expectation was amended to the explicit headquarters policy; the new disposable
name initially exceeded Mongo's 63-character limit and was shortened. Initial
combined regression execution had eight journey failures from zero-length partial
attachments plus missing cross-module API fixtures/offline environment guards.
Zero attachments were fixed; separate prescribed fixture invocations pass. Offline
name-prefix errors were corrected to the existing guarded prefix. Running routing
Ruff from the repository root misclassified its src imports; the required routing
folder invocation passes without touching unrelated files. Existing FastAPI/
HTTPX TestClient deprecation warning remains.

## Remaining limitations / deployment

The user's particular historical Iverson decision remains unproven without its
stored mission/request provenance. The checked-in graph is controlled OSM-derived
prototype evidence, not certified navigation. Optional data enrichment, current-road
survey, bridge-grade disambiguation and mobile-unit origin policy are outside this
repair. Default cost-mode endpoint snapping is unchanged. The unrelated listener
on port 8000 is not a running-deployment acceptance result. No frontend or browser
verification is claimed because teammates own the frontend refactor and this task
forbids frontend edits. No station catalog or road fixture coordinates were changed.
Changes remain local for review; no commit, push, PR or merge.
