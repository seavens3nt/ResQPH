# Citizen-to-station candidate verification (2026-10-10)

**Branch:** `feature/station-login-markers`
**State:** feature-branch checkpoint; separate-profile browser acceptance remains pending

## Progress against the authorized scope

| Requirement | Status | Evidence / remaining work |
|---|---|---|
| 1. Persist citizen registration, login, session restoration, logout | Implemented and tested | Cookie-auth API and frontend auth context; backend unit suite and full frontend suite pass. Browser flow remains pending because no connected browser is available. |
| 2. Provisioned station accounts and server-verified membership | Implemented and tested | Local provisioning command binds each account to one stable catalog ID; Mongo journey rejects a different login selection. |
| 3. Backend ownership and cross-station rejection | Implemented and tested | Server identity comes from the opaque session cookie; Mongo journey verifies citizen ownership, station mission list/detail scope, and a forged demo-header denial. Demo headers default off outside tests. |
| 4. Automatic durable assignment, idempotency, concurrency, pending, completion | Implemented and tested | Unique citizen/key record, payload fingerprint conflict, concurrent retry, durable queue/lease/backoff, no-capacity pending and capacity-release retry, assignment transaction, status history and completion are covered against a disposable Mongo replica set. |
| 5. Google Maps migration and station catalog reuse | Implemented; live provider check blocked | Active map surfaces use Google Maps JavaScript API and Advanced Markers. Shared station IDs/catalog drive login, assignment, and fixed markers. The ignored local frontend environment has Maps key and Map ID values configured. Browser rendering still needs verification; no Google rendering is claimed. |
| 6. Actual routes and synchronized simulated tracking | Implemented and tested | Expanded bounded OSM snapshot connects all five supplied headquarters to a controlled incident sample within the 900 m snap limit. Assigned route is stored once; citizen and station views read the same server route/tracking state. Mongo test covers tracking, completion freeze, and no teleport to HQ. |
| 7. Rate limits, Google usage safeguards, real Mongo acceptance, browser verification | Partly implemented/tested; browser blocked | Per-process request limits and provider usage guidance are implemented. Disposable replica-set journey passes. A connected browser is unavailable (`setupBrowserRuntime` reported “No browser is available”), and Google values are blank, so browser/provider acceptance remains outstanding. Rate limits are process-local; multi-worker shared enforcement is not provided. |

## Verification performed

- Frontend: `npm test -- --run` — **349 passed in 49 files**.
- Frontend: `npm run build` — passed; Vite reports a 1.98 MB minified JS chunk.
- Frontend: `npm run lint` — completed with warnings, including map cleanup ref warnings and fast-refresh/effect warnings.
- Backend: `uv run pytest -q` — **169 passed, 24 skipped**. Skips include opt-in Mongo cases and legacy manual-dispatch integration cases.
- Cross-layer: `PYTHONPATH=. uv run pytest ../tests/integration -q` — **47 passed**.
- Routing: `PYTHONPATH=../routing/src uv run pytest ../routing/tests -q` — **136 passed**.
- Disposable Mongo: product journey and transaction acceptance — **2 passed, 1 legacy manual-API test skipped**.
- Backend Ruff: scoped changed files pass. Full `uv run ruff check app tests ../tests/integration` still reports seven import-order findings in untouched files.
- Station routing coverage: each catalog origin snapped 2.5–26.9 m from the network; routes to the controlled sample measured 552–2,065 m.
- Google configuration presence was checked without reading or displaying values: both Maps values resolve as configured from the ignored frontend environment files. Live rendering remains pending browser verification.
- Browser runtime probe: no connected browser is available. No visual browser acceptance is claimed.
- Local API server on a disposable database: registration returned `201`, the
  authenticated session restored with `200`, logout returned `204`, and the
  next session read returned `401`. MongoDB confirmed the account persisted
  with a non-plaintext scrypt hash; the disposable database was removed.

## Data and runtime limits

The committed OSM-derived station graph is a bounded 2026-10-10 snapshot, not
live routing data. The 10-record flood join remains controlled sample data.
The map provider key must be HTTP-referrer restricted and the Maps JavaScript
API enabled. Configure quotas and billing notifications in Google Cloud; those
notifications are not hard spend caps. Automated tests mock the map surface.

Legacy station/team associations are not inferred or rewritten. The migration
command is dry-run by default and requires a reviewed explicit mapping plus a
disposable database name to apply. Historical team/request/mission IDs and
status records remain preserved.

## Registration/network failure follow-up (2026-10-11)

The supplied startup summary did not include the browser's exact `Origin`,
`Access-Control-Request-Method`, or `Access-Control-Request-Headers`, and no
browser session was available for inspection. Source inspection found the
local backend allowlist contained only `http://localhost:5173`, while
`dev.sh` advertised a LAN origin by binding Vite to all interfaces. The
frontend API URL also targets `localhost`, which would point back to the
browser's own device in a LAN session. The original wildcard method/header
settings mean the likely rejection in that setup is the CORS origin.

Preflight reproduction against the local FastAPI server showed:

- `Origin: http://localhost:5173`, `POST`, `content-type` to registration:
  `200 OK`, exact allow-origin and credentials headers.
- `POST` with `content-type,x-csrf-token,idempotency-key` to the request API:
  `200 OK`.
- `GET` with `x-request-id` to the listed-requests URL: `200 OK`. The active
  frontend does not add custom headers to this GET, so a browser would normally
  make it without preflight; the exact logged request headers were not supplied.
- `Origin: http://127.0.0.1:5173`: `400 Disallowed CORS origin`.
- A `DELETE` preflight and an `authorization` header preflight: `400` with
  `Disallowed CORS method` and `Disallowed CORS headers`, respectively.
- Health returned `200`; unauthenticated session restoration returned `401`.

The chosen local arrangement is same-computer `http://localhost:5173` to
`http://localhost:8000`, with both servers bound to loopback. Vite now uses
strict-port mode so an occupied port cannot silently move the page origin.
CSRF remains required on authenticated mutations. The browser's actual
preflight and the full visual/map workflow still require manual verification
because the connected browser runtime was unavailable.

The ignored local frontend `.env` contains configured Maps values. A blank
`VITE_GOOGLE_MAPS_MAP_ID` in `.env.local` had overridden `.env`; that empty
override was removed. The duplicate Maps API key definition remains the same
configured key in both ignored files, so it does not currently conflict.
`GOOGLE_WEATHER_API_KEY` remains backend-only.

## Mission synchronization follow-up (2026-10-11)

Offline mission writes now validate account-scoped cache ownership separately
from the station/team assignment ID, accept the current API's station and
tracking fields, and quarantine incompatible records with a downloadable local
recovery file. A queued event is acknowledged only when server history confirms
the same event ID, mission, actor, transition, source, and resulting version.
Pending intent makes the status badge stale until that evidence is present.

Arrival freezes shared tracking at the route endpoint and rejects further
tracking controls. The citizen and rescuer tracking pollers make one final
arrival refresh, then stop tracking polls while the mission query continues to
observe explicit completion. Completion remains a separate status transition.
Citizen cancellation remains pending-only; assigned and terminal requests are
rejected with a refreshable conflict. The disposable Mongo acceptance exercises
owner/foreign cancellation, repeat cancellation, and a cancellation versus
automatic assignment race, plus station release and pending retry.

All-five synthetic station routing evidence uses the shared controlled
`scenario-controlled-ubelt-001` graph and the same synthetic incident as the
station coverage regression. All five HQ origins are considered available for
this isolated comparison; no historical availability is inferred. Coordinates
remain GeoJSON `[longitude, latitude]`; the configured snap bound is 900 m.

| Rank | Stable station ID | Road distance (m) | Origin snap (m) | Incident snap (m) |
| ---: | --- | ---: | ---: | ---: |
| 1 | `central-sampaloc-lacson-hq` | 1,139.058 | 41.903 | 16.322 |
| 2 | `sampaloc-fire-station` | 1,282.083 | 37.568 | 16.322 |
| 3 | `iverson-fire-rescue` | 1,593.025 | 26.858 | 16.322 |
| 4 | `david-fire-rescue-hq` | 1,811.196 | 7.709 | 82.690 |
| 5 | `central-sampaloc-algeciras` | 2,751.968 | 32.854 | 16.322 |

Ranking uses shortest valid directed road distance, then stable station ID;
ETA does not participate. Runtime recommendations now expose the original
routing origin and whether it came from current simulated location or HQ. The
reported historical mission is present and assigned to Iverson, but its stored
route lacks a scenario ID and origin-source timestamp. Its original candidate
availability and ranking cannot be reconstructed; this controlled comparison
does not explain or prove that past choice.

The local machine's connected browser list was empty during this verification.
Automated frontend tests and production build pass, but browser acceptance for
separate citizen/rescuer profiles, follow/manual-pan/recenter behavior, live map
rendering, and the complete cancellation journey remains pending. Run these
steps after starting the local app with the configured Maps key and Map ID:
create a citizen request in one browser profile; sign in as its assigned station
in a second profile; verify Routes follow, manually pan, recenter, mark arrival,
and complete; confirm citizen status refreshes without reloading; then create a
separate pending request and cancel it as its owner. Keep the profiles separate
so their session cookies cannot overlap.

Automated verification on 2026-10-11:

- `cd frontend && npm run lint && npm test -- --run && npm run build`: lint
  exited 0, 363 tests passed, and production build succeeded. Existing lint
  warnings, Node localStorage warnings during tests, and the large-bundle build
  warning remain.
- `cd backend && .venv/bin/python -m pytest -q`: 172 passed, 24 skipped.
- `cd backend && .venv/bin/python -m pytest ../tests/integration -q`: 47 passed.
- `cd backend && .venv/bin/python -m ruff check app tests ../tests/integration`:
  passed.
- `cd routing && uv run ruff check src tests scripts && uv run pytest -q`:
  Ruff passed and 136 tests passed.
- The real Mongo journey was run with `RUN_MONGODB_INTEGRATION=1` and an
  explicit local `rs0` URI. It passed against a generated
  `resqph_station_disposable_<uuid>` database, including account/session
  restoration, station mismatch rejection, request idempotency, cross-station
  mission isolation, duplicate accept/start, frozen arrival, pending-only and
  foreign cancellation, cancellation/assignment race, completion/capacity
  release, and pending retry. The test verified and removed its disposable DB;
  a follow-up query found zero databases with that disposable prefix.
- The real Mongo command emitted the existing Starlette `httpx` deprecation
  warning. No existing developer mission was modified.
