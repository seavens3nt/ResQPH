# Citizen-to-station workflow implementation

**Status:** Feature-branch checkpoint; separate-profile browser acceptance remains pending
**Branch:** `feature/station-login-markers`
**Integration base:** `origin/temporary-main` at `7a71bc70307d406558407c6a4c8edf772eb9f468`

This plan supplements the historical delivery record. It does not rewrite or
claim completion of earlier Phase 5 acceptance evidence.

## Baseline and plan

The preserved working tree already contained the five-station selector and
catalog, fixed headquarters markers, and the first persisted-session
implementation. Inspection found that authentication and authorization still
needed end-to-end integration, request creation had no durable retry key, map
views did not share the server tracking journey, and legacy manual-dispatch
surfaces still needed removal from the active application. The original prompt also reported CI
Ruff failures. No baseline command was rerun before this continuation began;
the current test results are recorded in the task report.

Implementation order:

1. Persist citizen accounts and cookie sessions; provision station accounts.
2. Derive role and station identity from the authenticated account and enforce
   citizen ownership and station mission access on the backend.
3. Add idempotent accepted requests and durable automatic station dispatch.
4. Replace active map surfaces with one Google Maps implementation using the
   catalog's fixed headquarters and controlled overlays.
5. Display the stored station route and one server-owned tracking position in
   both citizen and station views; scope polling and offline state by account.
6. Verify backend, frontend, route coverage, Mongo transactions, and browser
   flows; record unavailable keys or infrastructure as blockers.

The main affected areas are `backend/app/{api,core,db,management,models,
repositories,schemas,security,services}`, `backend/tests/`, `frontend/src/{api,
features,pages}`, `data/samples/`, and `docs/`. Existing unrelated work remains
in the working tree and is not reset by this task.

## Identity and provisioning

Citizen registration creates only `citizen` accounts. Station Rescuer accounts
are created locally, one per stable `station_id`, by the operator after
reviewing the station ID in the shared catalog. No default password is stored.

```sh
cd backend
uv run python -m app.management.provision_station_account \
  station@example.test "Station Rescuer" sampaloc-fire-station
```

The command prompts twice for a password (12 or more characters). Login still
requires the selected station ID, and the server compares it with the
provisioned account. That selection is a consistency check; it never changes
membership. Session cookies are `HttpOnly`, time limited, and backed by opaque
server-side Mongo records. Mutations require the readable CSRF cookie echoed in
`X-CSRF-Token`. Production must use HTTPS and `AUTH_COOKIE_SECURE=true`.

The five stable station IDs are `sampaloc-fire-station`,
`central-sampaloc-algeciras`, `central-sampaloc-lacson-hq`,
`iverson-fire-rescue`, and `david-fire-rescue-hq`. Copy an ID exactly from
`data/samples/simulated-rescue-stations.json`. Each local database permits one
provisioned station login per catalog station. Public signup creates citizens;
the station/rescuer login entry is `/login?role=rescuer`.

To reset an existing account password, verify its email and station ID. This
updates only a matching existing rescuer account and never creates an account.
Both commands prompt for a password without echoing it:

```sh
cd backend
uv run python -m app.management.provision_station_account \
  station@example.test "Station Rescuer" sampaloc-fire-station
uv run python -m app.management.reset_station_password \
  station@example.test sampaloc-fire-station
```

Use a different synthetic email/password for each local teammate. Accounts and
password hashes remain in that developer's MongoDB and are not shared by the
feature branch.

For local HTTP development, `.env.example` sets `AUTH_COOKIE_SECURE=false`.
`AUTH_ALLOW_DEMO_HEADERS=false` is the normal mode. The test suite turns the
legacy demo adapter on explicitly in test configuration only. Credentialed
CORS requires an explicit `FRONTEND_ORIGINS` allowlist.

## Station assignment and retries

Each catalog station has one seeded simulated unit. Its fixed headquarters is
stored separately from `current_location`; startup may seed the current
position on insert but never resets position, availability, or active
assignment. A request is stored before dispatch and has a citizen-scoped
`Idempotency-Key` plus a canonical payload fingerprint. Matching retries
return the same request; reuse with different content returns `409`.

The durable `dispatch_jobs` queue sorts due work by reported severity
(`critical`, `high`, `moderate`, `low`) and then original submission time.
Workers claim a bounded batch with expiring leases. Route evaluation happens
before the Mongo transaction; the transaction checks the request version,
station availability/version, writes the station reservation, and creates one
mission with its route and station ID. A failed capacity race is re-ranked up
to three times. Retries use exponential backoff capped at one hour. Completing
or cancelling a mission makes pending jobs due; startup reconciles pending
requests after a restart. Active assignments are never silently preempted.

Pending reasons distinguish unavailable station capacity from the absence of
an admissible route. A citizen does not need to keep the page open. Rate limits
remain per application process and are not shared across multiple workers;
deployment must use one worker or add shared rate-limit storage before treating
limits as a fleet-wide control.

## Legacy team compatibility and migration

Historical `team_id`, mission ID, request ID, status history, and offline event
records remain unchanged. Legacy teams without an exact catalog station link
are excluded from new automatic assignments. No email substring or team name
is used to infer a station. A human may fill
`data/samples/legacy-team-station-mapping.example.json` only after verifying
each legacy relationship.

The migration command is read-only by default:

```sh
cd backend
uv run python -m app.management.migrate_legacy_station_links \
  --mapping-file ../data/samples/legacy-team-station-mapping.example.json
```

Applying requires an explicit mapping and a Mongo database name containing
`disposable`, plus an exact matching `--disposable-database` argument. It adds
station metadata to mission/request records, keeps their old team references,
and refuses active station-capacity collisions. Run acceptance only against a
new disposable replica set; do not run `--apply` against a developer database.

## Google Maps configuration and cost controls

Create ignored `frontend/.env.local` from `.env.example` and fill only:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=
```

The Maps key is visible in the browser bundle. Restrict it by HTTP referrer and
enable only **Maps JavaScript API** for this implementation. Set separate
development/production keys where possible. In Google Cloud Console, configure
per-API quotas and billing alerts/budgets and inspect usage. Billing alerts are
notifications, not guaranteed spend caps; student credits do not guarantee
zero charges. This code does not call paid Routes, Roads, Places, or Geocoding
APIs. The loader is shared, map instances stay mounted during polling, and the
client does not issue provider requests per animation frame.

`GOOGLE_WEATHER_API_KEY` remains server only and continues to power the
separate informational weather feature. Maps configuration has no backend key.
If either Maps value is empty, the map shows an explicit setup message; the
other application workflows remain usable.

The map uses the shared Maps JavaScript API loader and Advanced Markers. A real
provider browser check remains pending until both values are populated and a
browser session is available. Automated tests verify station marker data and
coordinate conversion with a mocked map surface; they do not claim a live
Google render.

The map implementation uses the shared Maps JavaScript API loader and
Advanced Markers. A real provider browser check remains pending until both
values are populated and the connected browser service is available. Automated
tests verify station marker data and coordinate conversion with a mocked map
surface; they do not claim a live Google render.

## Route and tracking contract

Google Maps supplies display/cartography only. Backend A* still evaluates the
controlled road graph and assignment stores its accepted geometry. Coordinates
in Mongo/GeoJSON are `[longitude, latitude]`; the map adapter converts them to
Google `{lat, lng}` objects. The incident pin uses the submitted coordinate;
the route may end at its snapped road access point. Fixed station headquarters
are independent markers. The moving marker is updated only from
`GET /missions/{id}/tracking`, whose progress uses the mission's stored route
and server timestamp. Citizen owner and assigned station see the same mission
and simulation; only the assigned station can start/pause/resume/reset it.
Arrival at route end does not complete a rescue. Terminal status freezes the
last server position and completion releases the simulated station unit without
teleporting it back to headquarters.

`data/samples/study-area.geojson` defines the project rectangular
`ubelt-pilot-v1` boundary (120.982–121.004 longitude, 14.596–14.621 latitude).
It is a project-defined academic study extent, not an administrative Sampaloc
polygon. Google initially fits the extent, restricts camera pan to its bounding
rectangle, and limits zoom to level 13 or closer. The 210 px route map needs
this floor to fit the full 2.8 km north-south extent with padding; at level 14
it would be clipped. The basemap may still show neighboring areas at
the edges. The 2,533-edge bounded OSM snapshot currently snaps each station
origin within 2.5–26.9 m. This does not establish coverage of every street or
all of Sampaloc. Backend validation checks the supplied polygon and rejects
outside points; unsupported route requests stay pending with a no-reachable
route reason.

The request form supports map tap/click, a draggable incident pin, accessible
longitude/latitude editing, and browser location with accuracy/denial/timeout
feedback. Every changed location needs explicit confirmation with “Use this
rescue location.” Street address and landmark are optional. Pin-only requests
store the truthful label `Pinned location`; existing addresses are retained.

The `assigned` → `en-route` action acknowledges the reserved mission and starts
server simulation in the same transaction as status history and linked request
and station changes. Both sessions read the same route/progress/timestamp, and
the maps animate along the stored route between server updates. Arrival does
not complete the request; the rescuer explicitly confirms completion. The
station view offers authorized pause/resume controls. Repeating acceptance or
start does not restart the simulation clock.

## Teammate local setup

After the feature branch is pushed, fetch and check out
`origin/feature/station-login-markers` using the command in `docs/SETUP.md`.
Install Node.js 22 and Python 3.12, then run `./dev.sh --install` from the
repository root; it starts the Compose MongoDB replica set and local API/UI.
Set `VITE_API_URL`, `VITE_GOOGLE_MAPS_API_KEY`, and
`VITE_GOOGLE_MAPS_MAP_ID` in ignored frontend `.env` or `.env.local`; set
`MONGODB_URI`, `MONGODB_DATABASE`, `FRONTEND_ORIGINS`, auth settings and the
server-only `GOOGLE_WEATHER_API_KEY` in ignored `backend/.env`. Never share
real environment files, cookies, API keys, or passwords. Create a citizen
account through public signup and station accounts with the hidden-prompt
commands above. Use separate browser profiles when testing both roles.

Active mission/tracking reads poll near three seconds, pause while hidden,
refetch on return, stop at terminal status, and back off after tracking errors.
Request and assignment status refresh independently. Query keys and the limited
offline mission/event cache use authenticated account IDs; logout or account
change clears private query state and that account's offline cache. Google
scripts and map tiles are not cached for offline operation.

## Acceptance evidence and blockers

Required acceptance includes isolated citizen/station browser profiles,
registration/login/session restoration/logout, a wrong-station denial,
cross-account denial, idempotent/lost-response retries, no-capacity and no-route
pending behavior, station mission receipt, shared route/tracking, status
completion/history, a restart, and a disposable replica-set transaction run.
Mock the Google SDK in routine tests. A real provider browser smoke test is only
valid after the local browser key and Map ID are configured; never report real
Google rendering based on a mock.
