# Team Phase 5 frontend evidence — Issue #71

**Review date:** 2026-10-06, Asia/Manila. **Owner:** Elle.
**PR:** #79, `test/71-frontend-acceptance`.
**Reviewed source:** `acbefc85d34ca5ed1192c9ea16478e3d1f4d39bc`, updated with
accepted main `d3d9d507a260a463a54ca4fdee2b3f4f29d31080` and this repair.

**Decision:** The component/worker regression package is verified. Fresh
browser acceptance is **blocked by confirmed product defects**. This evidence
must not be used to close Issue #71 or approve the final Phase 5 gate until
the repair issues below are resolved and the browser matrix is repeated.
The PR may merge its useful tests and failure record without claiming that
all-role/offline acceptance is complete.

## Owned changes

- `frontend/src/test/phase5RoleFlows.test.tsx`: production components, API
  modules and Axios interceptors with a mocked HTTP transport.
- `frontend/src/test/phase5OfflineShell.test.ts`: actual worker source with
  mocked browser cache/fetch APIs.
- This document: real browser/API observations, checks and remaining limits.

No application behavior, backend, model artifacts or contracts were changed.
The earlier author's unavailable-environment record is superseded by the
review runs below; it is not carried forward as current verification status.

## Automated verification

Run from `frontend/` with the lockfile-installed dependencies:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test -- --run --pool forks --maxWorkers 1
npm.cmd run build
```

| Check | Result |
| --- | --- |
| Lint | Passed, four existing warnings |
| Full frontend suite | 28 files, 248 tests passed |
| Newly owned tests | 14 cases included in the full run |
| TypeScript/Vite build | Passed, 303 modules; existing 891.47 kB JS chunk warning |

The four lint warnings concern `LandingPage.tsx` state updates in an effect and
Fast Refresh exports in `shared.tsx`, `AuthContext.tsx`, and `MissionContext.tsx`.
These are local verification results; hosted CI must also pass on the pushed
repair. `git diff --check` and Markdown local links are checked before submission.

### What the component tests establish

Citizen tests reject blank/whitespace address, zero people and outside-boundary
coordinates before HTTP. Pending submission disables its button and cannot
signal success before the synthetic 201 response. The response includes null
optional details, as the real backend does. Server 422 and 503 failures announce
errors and preserve input. This does not establish downstream mission caching.

Coordinator conflict tests check request version, role header and assignment
URL/body; neither success nor close callback fires on 409. Rescuer tests check
the status-event client and rendering of a supplied completed record/history.
They do not exercise the full status hook/cache journey. Volunteer coverage is
only a view smoke check; it does not prove persisted hazard reporting.

Worker tests establish install of the shell/build assets, cached navigation
and asset fallback, rejection when neither network nor cache is available,
and no interception of API (including navigation to `/api/`), POST, cross-origin
tiles or arbitrary JSON. These are mocked worker APIs, not disconnected-browser
or service-worker-installation evidence.

## Disposable real environment

Production preview: `http://127.0.0.1:5199/`. Actual API: port `8029`.
Task-created MongoDB 8.3 single-node replica set: `resqph_pr79`, port `27029`,
database `resqph_pr79_browser_20261006`, bound to loopback. Existing user/audit
databases were not used. Python 3.12 selected this checkout's backend and routing
sources explicitly. Synthetic Team Alpha was seeded with the production
`RescuerTeam` fields. The disposable data are retained for reproduction.

Backend environment:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27029/?replicaSet=resqph_pr79&directConnection=true'
$env:MONGODB_DATABASE = 'resqph_pr79_browser_20261006'
$env:FRONTEND_ORIGINS = 'http://127.0.0.1:5199'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8029
```

Production preview, with the API URL set before building:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:8029/api/v1'
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 5199 --strictPort
```

Two reviewer setup errors were corrected before recording accepted results:
an overlapping build briefly restored the default API URL, and the first seed
omitted required team fields. Those failed attempts are not product findings.

## Fresh browser journey and authoritative response evidence

The controlled browser preview was actually opened through the available
browser tools. The synthetic citizen signed in, opened SOS triage, continued
to request details, and verified blank-address rejection. A valid address,
two people and blank optional details produced HTTP 201 and the API-backed
tracking screen. Coordinator login displayed that same pending request,
and selecting Team Alpha confirmed assignment and removed it from the queue.

| Record | Sanitized identity |
| --- | --- |
| Citizen | `pr79.citizen@example.test` |
| Coordinator | `pr79.coordinator@example.test` |
| Request | `request-54bf05a841644329889345e29f2c565e` |
| Mission | `mission-5fe5f928ff744d80b9cbb28799ca3cbf` |
| Assigned rescuer/team | `team-alpha` |
| Status event | `313b4a38-00b8-4e2b-b66c-4684cabc347c` |

The rescuer entered `team-alpha` in the current Email field as a diagnostic
workaround for the identity mismatch. The real mission arrived but showed
`Server mission data failed actor/record validation`. Clicking **TAP EN ROUTE**
then showed `Accepted server mission failed actor/record validation`, kept
the UI at Assigned and locked its next action behind a Pending Sync event.

A separate real HTTP GET of that mission returned **200, en-route, version 2**,
with the same event in server history and `situation_summary: null`. Thus the
server had accepted the transition while the UI asserted it had not. API logs
and the matched record/event establish the failure beyond a mocked test.

Separate direct real-API controlled route probes returned HTTP 200 for both
route-found and no-route. The found path used
`ubelt-v1:1037130917:1037130787:0` and `ubelt-v1:1037130787:68082882:0`, with
zero ML risk. The disconnected case had no geometry. These fixed controlled
probes were **not** a route displayed on the new assigned mission; they do not
prove mission-to-map integration.

## Browser matrix and named repair dependencies

| Acceptance | Observed result | Repair dependency |
| --- | --- | --- |
| Citizen input/submission | Blank address rejected; valid request saved and tracked | Passed for tested inputs |
| Matching coordinator queue | Fresh request appears and assignment succeeds | Passed for queue/assignment only |
| Coordinator counters/inspector | One pending API request with zero pending counter and unrelated Maria Santos/RQ-0042 inspector | #76 |
| Rescuer identity | Requires hidden team ID in Email field | #76, #77, #82 |
| Fresh mission cache/status | Null optional summary rejected; accepted en-route event falsely remains pending | #76 |
| Mission route controls | API-backed mission has no route evaluation/map control | #76 |
| Keyboard modal focus | Focus remained on SOS trigger behind open modal | #78 |
| Desktop/narrow layout | Desktop 1280px; 320x900 override measured 320px viewport and 320px document width | Spot-check only; #78 for complete focus/navigation audit |
| Completion/history | Component coverage passed; same fresh browser mission cannot progress past blocked queue | #76, #83; rerun required |
| Offline reload/reconnect/conflict/actor isolation | Not run on this fresh mission because online cache already fails | #76, #82; rerun required |
| Separate volunteer flow | Current portal toggle is still present; component smoke only | #82, #84 |

Screenshots were captured locally as `outputs/pr79-status-discrepancy.jpg` and
`outputs/pr79-status-320px.jpg` in the review workspace. These filenames are
local review artifacts, not files committed by this ownership-limited PR.
The temporary viewport override was reset. No current screenshot establishes
offline reload success or complete accessibility compliance.

## Reproduction and exit condition

Repeat the fresh browser journey with optional details omitted, then follow
that same request, team, mission, route and status through all roles. Verify
the queue clears after server acknowledgement, the next valid status is
available and completion/history match server state. Repeat production-browser
offline cache/reload/one-update/reconnect, stable event ID, second-action lock,
409 review and actor isolation after the cache/identity repair. Keyboard-only
dialog navigation must trap focus and restore it on close; repeat at desktop
and 320px. Do not substitute accepted fixture-only Phase 4 evidence for this run.

References: [API contract](../api/API_CONTRACT.md),
[offline contract](../offline/OFFLINE_CONTRACT.md),
[Phase 4 evidence](TEAM-PHASE-04-EVIDENCE.md).
Issue #71 stays open for the missing positive browser acceptance. Final MVP
acceptance, deployment, submission and phase completion are not established
by merging this regression/evidence package.
