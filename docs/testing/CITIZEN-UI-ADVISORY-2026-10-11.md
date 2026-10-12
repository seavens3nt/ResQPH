# Citizen UI and Advisory — local manual-testing candidate

Date: 2026-10-11. Branch: `feature/citizen-ui-advisory-refinement`.
Original baseline: `4ffa7171e15aff0342fb864fe4c920b6239d2566` (navigation PR #90).
Follow-up baseline: `e6623bc` ("Changes with the interactive map and advisory").
The follow-up started with a clean tree on the existing feature branch; the preceding
implementation was already committed locally when inspected. Follow-up changes are
uncommitted and unpushed. No fetch/pull/commit/push/PR/merge/deployment was performed
in this follow-up; `temporary-main` and `main` were not modified. Environment values,
credential files, accounts, missions, station catalog and database are unchanged.

## Shared journey, session recovery and citizen cancellation — 2026-10-12

Latest local checkpoint; supersedes pending-only cancellation and the earlier
session-recovery presentation. Start: clean tree on `temporary-main`, HEAD
`feb037d2915779aa94534a3ed7ab2b1689afdebb`. The requested existing feature branch
pointed to that same HEAD and was selected without resetting or pulling. Existing
implementation/local credentials preserved. `main` remains `de0fc954` and
`temporary-main` remains `feb037d`; no commits, pushes, PRs, merges or remote changes.
Current implementation is local/uncommitted, not browser-accepted or merged delivery.

Attachment inspection: the new attachment directory contains only Pasted text.txt;
the three screenshots are unavailable. Written requirements guided these changes.
Browser skill connection returned `No browser is available`; discovery returned an
empty list. No cookies, tokens, passwords, browser queues or storage were logged,
inspected or cleared. Original browser messages and rendered acceptance remain pending.

### Diagnosis by issue — confirmed versus uncertain

| Report / workflow issue | Reproduced or inspected cause | Repair / limit |
|---|---|---|
| HTTP 409 session changed accounts | Existing expected-account guard correctly rejects stale tab identity under another account cookie; real API checks reproduce 409 on request, mission and tracking reads | Guard retained. Central recovery blocks old requests/mutations, aborts outstanding transports, clears query visibility, removes authenticated workspace and requires explicit login |
| Multiple tracking/mission/sign-in banners | Each panel previously rendered its own generic error while cached records/controls remained visible | AuthProvider receives one recovery event; login displays one explanation. Local forbidden-read fallback exits citizen/rescuer panels with one sign-in notice |
| Valid citizen mission/tracking reads | Current cookie API returns 200 for the owner and assigned station; foreign citizen/station get 404 mission_not_found | No backend authorization bypass or inferred station membership introduced. No demonstrated ownership or response-schema defect in valid reads |
| Duplicate/unbounded tracking concerns | Rescuer card used a different tracking key and separate policy from the shared journey; same mission could have independent observers with differing error behavior | Card reuses account/station journey keys; short freshness windows prevent mount refetches; in-flight fetches deduplicate; shared auth blocking and bounded Retry-After behavior retained |
| Brief transport failure | Query regression reproduces a 503; last authoritative data remains cached. Citizen Map lacked explicit frozen/timestamp/stopped props and stale feedback | Map now freezes the last server position and marks it stale. Recovery uses backend tracking, retains monotonic timestamps; no new independent simulation |
| Terminal/arrival polling | Assigned stationary tracking was unnecessarily polled; status still needs updates after arrival | Movement polls run only en-route. Arrival fetches the frozen position with bounded recovery/429 cooldown; mission status keeps its 5-second cadence until terminal. Completion/cancellation stop tracking/status polls |
| Cancellation disappears after submission | Confirmed existing pending-only server/UI policy plus automatic assignment | Updated policy below: pending or assigned before travel, explicit confirmation, transaction/replay/race checks |
| White dark-mode request panels | Hard-coded white/light fills and exported SVG review backgrounds override inherited dark variables | Scoped token surfaces/fields/borders/text and dark review-art overrides; Modal carries shared theme identity. Approved auth-dark rules remain |
| “Report flooded…” alignment | No literal active Report flooded control or accessible screenshot; actual request severity/flood labels share layout selectors and supporting text | Corrected those fields with a normal-flow grid, full-width controls, wrapping and consistent gaps; exact screenshot match and rendered desktop/mobile acceptance remain unverified |
| Raw Routes diagnostics | MissionRoute exposed origin coordinates/route ID in details, and route popup could display technical ID | Removed user-facing details/ID and redundant explanation. Stored backend geometry, map polyline, ETA/distance/status, Follow/Recenter/Show Full Route, lifecycle controls, HQ markers and Google attribution retained |

The exact historical browser failure URL/timing or a browser response-validation
failure was not captured; generic unavailable banners do not prove one shared cause.
Frontend API types match the exercised FastAPI mission/tracking shapes. Backend
response-model validation and real returned route/position comparisons pass. 429 and
transport recovery regressions are controlled frontend tests, not a captured live
browser outage. Cookie credentials remain enabled; CSRF still protects mutations.
Account assertion is now also sent to profile/logout; login/register/session restore
remain explicit session-entry operations. Assertions never select the backend actor.

### Session and cache safety

A central API request generation changes on account switch or session invalidation.
Outstanding authenticated transports are aborted; responses from older generations
are rejected even if they arrive late. Requests are blocked until explicit sign-in.
AuthProvider cancels/clears query cache and removes the old user from the visible
workspace. A non-secret per-tab recovery flag in sessionStorage prevents refresh
from silently adopting a replacement cookie session; explicit login clears it. Late
auth/session restoration responses are also generation-checked. Remount/isolation
regressions verify one notice, hidden old workspace and cleared query cache. Login has one recovery explanation; separate tabs share cookies, so
simultaneous citizen/rescuer testing needs separate browser profiles.

Mission/detail/tracking caches remain scoped to authenticated account plus station;
request caches use account IDs. 401, 403 and session mismatch block affected journey
polling; Retry-After governs 429 cooldowns. Current user data can stay visibly stale
through transport failures; the previous account's data is not a recovery fallback.
Actor-owned Dexie queues and event evidence are preserved. Aborting transport cannot
undo an already accepted server mutation; the existing version/event/history-based
reconciliation must verify any uncertain queued outcome under its original owner.
No session secrets were moved into localStorage, no event ownership was rewritten,
and ordinary API auth still rejects demo-header impersonation.

### Cancellation policy and consistency boundary

Owning citizen can cancel pending requests and assigned requests only while the linked
mission is still assigned. Server `can_cancel` reflects request state; transactional
confirmation rechecks request version, ownership, mission status/version and linked
station reservation. Once travel starts, cancellation is rejected with clear feedback.
Citizens never receive the rescuer End simulated mission action.

Both request-status and map views ask for explicit confirmation. Consent captures
the server version visible when the dialog opens (map uses current detail version).
A conflicting server transition causes 409, refresh and new confirmation. Mutation
success updates request detail and invalidates request list/journey/tracking/history;
other profiles observe the same versioned state through existing bounded polling.

Assigned cancellation reuses MissionRepository.update_status_if_current inside the
existing mission-event transaction runner. It atomically cancels request/mission,
stops tracking, appends immutable citizen event/history (actor/time/reason), records
consent identity/version, clears the exact station reservation and releases capacity.
Pending dispatch jobs are awakened; cancelled requests cannot be reassigned. Records
remain readable in history and disappear from active station listings.

Exact same actor/version/reason retry returns the cancelled request with no second
capacity release/history entry. Changed consent or stale version returns 409. Pending
cancellation retains its conditional atomic request update; racing assignment can
return conflict and requires current-state confirmation. Cancellation/start races
have one winner: if cancellation commits, starting fails; if start commits, cancellation
fails. History-write injection returns 503 database_unavailable and rolls back request,
mission and station together. Historical records are retained, not migrated/reassigned.
Contract amendments are confined to API_CONTRACT.md and RESCUE_LIFECYCLE.md.

### Verification commands / latest results

From frontend:

```sh
npm run lint
npm run test -- --run
npm run build
```

**424 passed in 63 files**; lint passes with 5 existing warnings; production build
passes with existing bundle-size warning. Tests also emit the existing Node experimental
storage warning. Added regressions cover late account responses, one session-recovery
notification/blocked mutation, profile/logout assertions, shared query observers,
transport recovery, auth failure polling, Retry-After, arrival/terminal status policy,
account-scope changes, dark request-dialog identity, map stale/frozen position and
raw route diagnostics removal. Old immediate-cancel assertions were updated to require
confirmation; rejection/conflict/history/accessibility assertions remain meaningful.

From backend:

```sh
.venv/bin/ruff check app tests
.venv/bin/python -m pytest tests ../tests/integration
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_citizen_cancellation_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_product_journey_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue62_offline_tracking_20261012_d17f .venv/bin/python -m pytest tests/test_offline_sync_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue73_backend_tracking_20261012_d17f .venv/bin/python -m pytest tests/test_phase5_acceptance.py
```

Ruff passes. Standard/integration: **226 passed, 38 opt-in skipped**, existing
Starlette/httpx warning. New real Mongo cancellation/session suite: **7 passed**.
Current-cookie product journey: **8 passed**. Offline replay: **15 passed**.
All writes/failure injections use NEW guarded disposable databases; fixtures drop
only their own generated DB. Reusable `resqph_demo_20261012` and original developer
DB were never reset or used for these failure tests. Accounts, environments,
local credential README and offline queues are unchanged; README remains ignored,
untracked and 0600. No new accounts were provisioned in reusable databases.

The combined run initially caught a fixture error: expiry injection targeted
`sessions` instead of the actual `auth_sessions` collection. Corrected the fixture,
asserted an existing session was modified, then all seven focused cases passed.
The current-cookie journey was rerun separately after correction. No production
session implementation was weakened to fix the harness.

Sanitized real API/database evidence:

- `GET /rescue-requests/{id}`, `GET /missions/{id}` and `GET /missions/{id}/tracking`:
  expected-account disagreement -> 409 session_identity_changed; expired persisted
  auth session -> 401 authentication_required.
- Owner and assigned station mission/tracking reads -> 200, same route/position;
  foreign citizen and foreign station -> 404 mission_not_found. En-route reads share
  monotonically progressing backend state; arrival fixes the same position for both.
- `POST /rescue-requests/{id}/cancel`: valid pending/assigned-before-start -> 200;
  exact consent replay -> 200 without more writes; foreign owner -> 404; stale consent
  -> 409 stale_request_version; started request -> 409 request_not_pending with the
  updated before-travel explanation. Failure injection -> 503 database_unavailable.
- Cancel/start race -> one 200 and one 409; request/mission status agrees and capacity
  is either released or still reserved by the winning en-route mission.

### Remaining legacy failures — separate from current acceptance

Explicit legacy run: **6 failed, 1 passed**. These remain obsolete fixture/contract
failures; no assertions were skipped or retired endpoints/demo actor bypass enabled.

1. test_phase5_invalid_inputs_and_roles_leave_database_unchanged — missing cookie
   returns 401; fixture expects retired demo-role 403.
2. test_phase5_real_mongodb_lifecycle_updates_request_mission_and_history — retired
   manual assignment endpoint returns 404; fixture expects 201.
3. test_phase5_retry_conflict_stale_actor_and_transition_rejections_do_not_write —
   same retired manual-assignment setup fails before its assertions.
4. test_phase5_linked_lifecycle_conflict_rolls_back_all_records[request] — same
   retired setup fails before its specific linked-request conflict injection.
5. test_phase5_linked_lifecycle_conflict_rolls_back_all_records[team] — same retired
   setup fails before its specific team-conflict injection.
6. test_phase5_assignment_dependency_failure_returns_envelope_and_rolls_back —
   fixture expects team-alpha seed absent from canonical station initialization.

Current cookie, cancellation and offline suites retain ownership/station denial,
retry/stale-version/invalid-transition/no-write, concurrency and transaction rollback
coverage. The exact old linked-request/team/manual-dependency injections remain
unexecuted and require migration to current fixtures. Six failures are not claimed
resolved. The active product journey's old pending-only rejection setup now tests
stale assigned cancellation consent; new real tests cover permitted assigned cancel.

### Pending manual acceptance checklist

1. Use fresh separate citizen/rescuer browser profiles against the unchanged demo
   environment. Submit one synthetic U-Belt request; verify automatic assignment and
   identical station/route/tracking in both profiles.
2. Start, arrive, complete; verify frozen arrival, stopped terminal tracking, immutable
   history and capacity release.
3. Submit another request; cancel while assigned before start, confirm the dialog,
   and verify both profiles update and the station returns to available.
4. In a single profile switch accounts across tabs. Verify one explicit login recovery,
   no old data/controls flashing and original-owner offline events retained.
5. Exercise brief network outage/recovery and 429 cooldown; verify stale last position,
   bounded retries and no movement restart. Inspect dark request edit/review/confirmation
   and flood/severity field alignment at desktop/mobile widths.

Browser visual acceptance, screenshots and the original browser symptom remain
unverified. No separate retired hazard-report workflow was added to match an unavailable
image. A teammate can test the local candidate; no publish/delivery was authorized.

### Exact changed files in this checkpoint

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `backend/app/api/routes/rescue_requests.py`
- `backend/app/models/rescue_request.py`
- `backend/app/repositories/missions.py`
- `backend/app/repositories/rescue_requests.py`
- `backend/app/schemas/rescue_requests.py`
- `backend/app/services/missions.py`
- `backend/app/services/rescue_requests.py`
- `backend/tests/test_citizen_cancellation_mongodb.py`
- `backend/tests/test_product_journey_mongodb.py`
- `backend/tests/test_rescue_requests.py`
- `docs/STATUS.md`
- `docs/api/API_CONTRACT.md`
- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`
- `docs/workflows/RESCUE_LIFECYCLE.md`
- `frontend/src/api/client.test.ts`
- `frontend/src/api/client.ts`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/AuthContextIsolation.test.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/missions/useMissionJourney.test.ts`
- `frontend/src/features/missions/useMissionJourney.test.tsx`
- `frontend/src/features/missions/useMissionJourney.ts`
- `frontend/src/features/requests/CancelRequestDialog.tsx`
- `frontend/src/features/requests/cancellationPolicy.ts`
- `frontend/src/features/requests/hooks.ts`
- `frontend/src/features/requests/types.ts`
- `frontend/src/features/workspace/CitizenMap.test.tsx`
- `frontend/src/features/workspace/CitizenMap.tsx`
- `frontend/src/features/workspace/CitizenWorkspace.tsx`
- `frontend/src/features/workspace/MissionRoute.test.tsx`
- `frontend/src/features/workspace/MissionRoute.tsx`
- `frontend/src/features/workspace/RequestRescueModal.test.tsx`
- `frontend/src/features/workspace/RequestStatusModal.test.tsx`
- `frontend/src/features/workspace/RequestStatusPresentation.tsx`
- `frontend/src/features/workspace/RescuerWorkspace.tsx`
- `frontend/src/features/workspace/requestRescueModal.css`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/dashboard/views/citizen/CitizenRequestFlow.test.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestForm.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestStatusView.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerMissionCard.tsx`

## Dark auth, refresh isolation and fresh demo — 2026-10-12

This is the latest checkpoint and supersedes earlier statements that auth follows
shared light/dark preference or that no accounts/database were added. The existing
dirty tree was preserved on `feature/citizen-ui-advisory-refinement`, HEAD
`8ac45bf203617ff2b97632fe3ca044671689820e`. Local `main` remains `de0fc954` and
`temporary-main` remains `8ac45bf`; no commit, push, PR, merge, fetch or remote
mutation was performed in this checkpoint. No developer database records, legacy
missions, environment values, station IDs or favicon files were changed.

### Requirement status and changes

| Requirement | Local implementation / evidence | Remaining acceptance |
|---|---|---|
| Inspect baseline and existing contracts | Existing cookie AuthService, account/station mapping, actor-owned Dexie queues, account query keys, provisioning utilities, config and previous report inspected | None for inspection |
| Restore approved auth | Existing layout retained; explicit dark auth tokens and forced-dark auth BrandLogo independent of saved dashboard/OS preference | Rendered browser acceptance pending |
| Simplify Advisory | Data status card removed; compact refresh region retains last-updated/stale/offline/error/loading/cooldown/429/provider feedback; content-sized cards and responsive columns retained | Rendered browser acceptance pending |
| Diagnose refresh | Demonstrated cookie/expected-account mismatch on GET; repaired read identity guard and polling/recovery policies | Exact original browser request remains unverified |
| Fresh database | New `resqph_demo_20261012` on existing local rs0 at localhost:27018; indexes and multi-document transaction verified | Original localhost:27017 replica-set mismatch remains a separate blocker for default startup |
| Accounts | 5 citizens + 5 catalog-backed station accounts persisted with existing hashes/auth; 10 real API logins/role checks/session restoration/logout verified; wrong station denied | Separate-profile UI walkthrough pending |
| Local documentation | Ignored, untracked `local-demo/README.md`, directory 0700/file 0600; table, startup, profile separation, cache recovery and walkthrough present | Credentials intentionally absent from this tracked report |
| Fresh journey | 8 real Mongo cookie journey/recovery cases and 15 replay/rollback cases pass on guarded disposable databases | Browser visual/network acceptance pending |
| Checks | Frontend 409 passed; backend/integration 226 passed, 31 opt-in skips; explicit modern Mongo suites pass | Six legacy opt-in fixture failures listed individually below |

### Login regression

The preceding change made auth consume the dashboard's shared persisted preference;
a saved light preference therefore changed the formerly dark login. Auth now owns
explicit dark CSS variables and color-scheme, and auth BrandLogo forces dark rendering.
The existing navy auth design, forms, station selector, validation and accessibility
remain. No entering/leaving auth operation writes the dashboard theme preference.
Other logo placements retain theme behavior; favicon/index files have no diff.

### Refresh diagnosis and evidence limits

HttpOnly cookie selects the backend account. Client account IDs are assertions and
cache keys; station IDs are verified membership. Axios already uses credentials;
CSRF remains mutation-only. Ordinary auth mode never accepts demo headers as an actor.
Same-profile tabs share the cookie, while a tab can retain its previous user in memory.
The earlier expected-account guard covered mutations only: a read could execute
under a replacement cookie and return the new account's records into the old tab's
query key. This is a demonstrated isolation gap, not a proven explanation for every
historical stale-record message.

Real TestClient cookie requests to `GET /api/v1/missions?assigned_to=me` and
`GET /api/v1/rescue-requests` with a disagreeing `X-Expected-Account-Id` now return
HTTP 409, `error.code=session_identity_changed`, before reading authorized data.
The timed disposable journey suite completed in 52.70 seconds; no browser HAR or
historical request timing was available. Headers/cookies/tokens were not logged.
Mutation CSRF/ownership/station checks are retained. Public registration remains
citizen-only even when privileged role/station fields are submitted.

Frontend sends the assertion on authenticated reads as well as writes (auth routes
excluded). Request/detail/history/mission/tracking keys include account identity and
station where applicable. Auth login/logout clears query cache; actor-owned pending
Dexie events survive and cannot be replayed by another account. Legacy queue migration
and reconciliation/discard rules from the preceding checkpoint remain intact.
No existing browser storage or queued event was inspected, cleared or discarded.

401/403/session-identity errors stop affected polling and provide sign-in recovery.
429 respects Retry-After with bounded polling and disabled manual retry until its
cooldown; reconnect/focus cannot create retry storms. Network transport, 5xx, 409,
429 and client processing/schema errors have distinct feedback. Cached records are
explicitly stale and remain scoped to their owner. Advisory retains all necessary
cached/error feedback without a separate Data status card. Focused tests cover these
policies, saved-light/forced-dark branding and stale Advisory/record recovery.

A second demonstrated environment issue: the configured developer URI requests rs0
on localhost:27017, but that listener's MongoDB hello reports no replica-set name.
That URI fails server selection. Existing rs0 at localhost:27018 is healthy. The
normal developer server/DB was not reconfigured; demo uses explicit command overrides.
CORS/response validation were inspected; no claim that either caused the original
browser symptom is made. Browser tooling returned `No browser is available`.

### Dedicated demo provisioning and real API verification

Original configured database is `resqph` and remains untouched. New database is
`resqph_demo_20261012`; existing local replica set is `rs0` on port 27018. No developer
accounts or active records were copied. Fresh database has 10 accounts, 0 requests,
0 missions and 5 available stations. Required indexes were initialized by existing
setup; the transaction probe commits two writes and removes its probe record.

New provisioning command wraps existing citizen registration and station provisioning,
including existing password hashing/policy. It refuses normal/default names, remote
hosts, non-replica-set servers, tracked/unignored credential paths and unmanaged
existing databases. A managed rerun preserves passwords and membership; it never drops
or resets records. First run created 10/preserved 0; second created 0/preserved 10.
Unit regressions cover target guards and preserving all ten existing accounts.

Citizens: `citizen1@example.test` through `citizen5@example.test`.

| Station | Canonical ID | New login |
|---|---|---|
| Sampaloc Fire Station | sampaloc-fire-station | sampaloc@example.test |
| Central Sampaloc Fire and Rescue Volunteer Brigade | central-sampaloc-algeciras | algeciras@example.test |
| Central Sampaloc Fire and Rescue Brigade Headquarters | central-sampaloc-lacson-hq | lacson@example.test |
| Iverson Fire and Rescue Volunteer | iverson-fire-rescue | iverson@example.test |
| David Fire and Rescue Volunteer Inc. Headquarters | david-fire-rescue-hq | david@example.test |

All ten newly created logins passed real authentication API checks: correct role,
matching station where applicable, restored authenticated session, read authorization,
409 identity mismatch protection, logout and subsequent session 401. Each of five
wrong station selections returned 403. Citizen mission access returned 403; station
mission listing returned 200. Read-only checks left this reusable database empty of
requests/missions. Different random passwords exist only in ignored local README;
no credential values or hashes are in this report or verification output.

Start from repository root:

```sh
MONGODB_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_DATABASE=resqph_demo_20261012 bash ./dev.sh
```

Login URL: http://localhost:5173/login . Keep the existing port-27018 replica-set
container running. Use fresh separate browser profiles; inspect/reconcile existing
ResQPH queues before any application-scoped cleanup. Clearing local storage never
deletes server accounts. To switch back stop demo servers and run `bash ./dev.sh`
without overrides; original port-27017 replica-set conflict still needs resolution.

### Check commands and results

From `frontend/`: `npm run lint`, `npm run test -- --run`, `npm run build`.
409 tests pass in 60 files; lint passes with 5 existing warnings; production build
passes with existing bundle-size warning. Node also reports its experimental storage
warning during tests. No rendered/browser acceptance is inferred from these checks.

From `backend/`:

```sh
.venv/bin/ruff check app tests
.venv/bin/python -m pytest tests ../tests/integration
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_product_journey_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue62_offline_refresh_20261012_b41a .venv/bin/python -m pytest tests/test_offline_sync_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE=resqph_issue73_backend_refresh_20261012_629f .venv/bin/python -m pytest tests/test_phase5_acceptance.py
```

Ruff passes. Standard plus integration: 226 passed/31 opt-in skipped, existing
Starlette/httpx deprecation warning. Explicit current-cookie real Mongo: 8 passed.
Explicit offline replay real Mongo: 15 passed. Fixtures create/drop only their guarded
disposable databases, separately from the reusable demo. The fresh journey checks
registration/login/logout/restore, ownership, station mismatch/demo impersonation,
idempotent/concurrent request creation, automatic assignment, versioned tracking,
completion/history/capacity release, no-capacity pending/retry/cancellation, races
and transaction rollback. Offline cases cover lost-response replay, stale/conflicting
IDs, denied actors and rollback. Network UI behavior is component-tested; actual
browser network interruption is still pending.

### Six legacy opt-in failures — individual classification

Explicit legacy run: **6 failed, 1 passed**. They were not rewritten, skipped or made
green by enabling retired APIs. These are obsolete fixture/contract failures, not
proof of a current runtime regression. Their original assertions are currently
unreachable; passing newer coverage does not make this old suite pass.

| Failing case in test_phase5_acceptance.py | Actual failure / classification | Current equivalent evidence |
|---|---|---|
| test_phase5_invalid_inputs_and_roles_leave_database_unchanged | Missing cookie returns 401; fixture expects old demo-role 403. Obsolete authentication expectation | Cookie journey rejects forged roles/wrong stations/cross-account reads; validation/role unit tests |
| test_phase5_real_mongodb_lifecycle_updates_request_mission_and_history | Retired manual assignment endpoint returns 404; fixture expects 201. Obsolete lifecycle setup | Current cookie automatic-assignment lifecycle, tracking/history/capacity assertions |
| test_phase5_retry_conflict_stale_actor_and_transition_rejections_do_not_write | Same retired assignment setup returns 404. Obsolete setup | Current idempotent request conflict/race checks; real offline stale/version/invalid-transition/unauthorized no-write cases |
| test_phase5_linked_lifecycle_conflict_rolls_back_all_records[request] | Retired assignment setup returns 404. Obsolete setup | Current cookie end-simulation transaction failure rollback plus offline history-failure rollback; exact old linked-request injected conflict remains unexecuted |
| test_phase5_linked_lifecycle_conflict_rolls_back_all_records[team] | Retired assignment setup returns 404. Obsolete setup | Same modern transactional rollback evidence; exact old team-conflict injection remains unexecuted |
| test_phase5_assignment_dependency_failure_returns_envelope_and_rolls_back | Fixture expects seeded team-alpha; record is absent under canonical station setup. Obsolete seed | Assignment unit failure handling/pending retry and modern lifecycle rollback covered; exact retired manual-assignment dependency injection remains unexecuted |

Updating this retired suite requires migration to current cookie/catalog/automatic
assignment fixtures and retaining its specific conflict injections. This checkpoint
reports the remaining acceptance debt explicitly rather than weakening authorization.

### Exact files changed in this checkpoint

Backend: `app/api/dependencies/demo_role.py`, new
`app/management/provision_demo_accounts.py`, `tests/test_auth.py`, new
`tests/test_demo_provisioning.py`, `tests/test_product_journey_mongodb.py`.
Frontend: `src/api/client.ts`, new `src/api/queryRecovery.ts` and its test,
`src/components/brand/BrandLogo.tsx` and its test, `src/pages/auth/AuthLayout.tsx`,
`src/pages/auth/SignupPage.tsx`, `src/features/requests/hooks.ts`,
`src/features/missions/useMissionJourney.ts`, `src/features/offline/useOfflineMission.ts`,
`src/features/workspace/Records.tsx` and its test, `CitizenAdvisory.tsx` and its test,
`RescuerWorkspace.tsx`, `sharedVisualSystem.css`.
Documentation: this report, `docs/STATUS.md`, `docs/ui/LOCAL_VISUAL_RULES.md`,
skill `references/current-status.md`, `references/sync-history.md`.
Local-only: `local-demo/README.md` (ignored/untracked, 0600; preserved older credentials).
Other dirty files belong to the preceding checkpoint and were preserved.

## Landing theme and mission recovery — 2026-10-12

This checkpoint supersedes the earlier branding/theme and baseline notes below.
Initial tree was clean on `temporary-main`. `git ls-remote origin` confirmed
`temporary-main` at `8ac45bf203617ff2b97632fe3ca044671689820e`; the requested
`feature/citizen-ui-advisory-refinement` branch already pointed to the same revision.
Switched to that existing branch without pulling, fetching, merging or resetting.
No commit, push, PR, deployment or remote branch mutation. Local `main` remains
`de0fc954e903979e62822de6dce344ff155335c3`; `temporary-main` remains `8ac45bf`.

### Findings recorded before behavior changes

- Active LandingPage owns inline CSS, dark background `#0b1324`, an embedded WebP
  wordmark and SVG clipping that recolors ResQ separately from PH. LandingPage.css
  is not the authority for that design. BrandLogo still used the prior white PNG.
- Landing persisted `resqph-theme`; dashboard started with independent false/light
  state and auth followed OS preference independently. This caused route disagreement.
- HttpOnly session resolves the account through AuthService; rescuer actor user_id
  is the catalog team ID, while account ID is the local queue/cache key. Station
  membership is stored on the account and cannot be selected by a demo header in
  ordinary mode. CSRF is required for session-authorized mutations.
- The reported wording was emitted only by the final role-rejection branch of
  `_get_operable_mission`. A wrong assigned station reaches a different rejection.
  A same-profile citizen login replaces the shared cookie while another tab can
  retain rescuer state. Queues also preserve prior errors after reconnect. The
  old panel wrongly asserted nonacceptance without checking matching history.
- Existing coordinator cancellation only covered assigned missions. Repository
  lifecycle updates already transactionally update mission/request/team/history;
  recovery must reuse that transaction rather than expose coordinator authority.
- Active tracking map: 240px outer container, 210px wrapper/canvas (canvas used
  `!important`). The secondary mission preview had 210px Google canvas / 230px
  shell constraints. Both required scoped overrides, not a global map increase.

### Sync diagnosis and repair evidence

A real cookie-authenticated disposable test reproduces the role rejection by
submitting a station status transition under a citizen session: HTTP 403,
`forbidden`. It also reproduces cross-account cookie switching with an expected
station account header: HTTP 409 `session_identity_changed`. The backend now
rejects that disagreement before the mutation and instructs separate browser
profiles. The header asserts the existing authenticated account; it never chooses
an actor or grants permissions. Mission schemas now reuse the shared session actor
model, including authenticated account and station metadata. CORS permits this
assertion header. Original
role/assignment checks and CSRF remain enforced; no demo-header workaround.

**Limit:** the user's actual browser queue/cookies could not be inspected because
browser connection returned `No browser is available`. The demonstrated code path
and session mismatch are verified; the exact historical reported event's origin
or acceptance is not claimed. No developer mission or browser storage was changed.

Recovery retains the original event ID, actor ownership, payload and expected
version. Matching history must prove mission, station actor, role, transition,
source, client timestamp and sanitized note before reconciliation. Current failed
attempts show attempted status/version, server status/version when retrievable,
uncertain acceptance versus absent event evidence, and retained failure details.
Refresh server state checks again. Authentication/CSRF/session mismatch retries
are explicit; permanent authorization/stale-transition failures are not auto-retried.
Sign-in links guide recovery. Discard requires confirmation: only that local queue
entry is removed, never the server mission. Online history is checked first;
accepted evidence reconciles instead of discarding, conflicting evidence blocks
it. Offline confirmation explicitly states acceptance is unknown. A private
account-scoped recovery record is kept transactionally; other accounts are untouched.
Fresh mission state unlocks the next valid lifecycle control after resolution.

### Narrow simulated ending policy and API

`POST /api/v1/missions/{id}/end-simulation` accepts `event_id`,
`expected_mission_version`, and a required sanitized `reason` (3–500 characters;
post-sanitization bound enforced). Only a cookie-authenticated rescuer account at
that exact assigned station may use it, and only `data_source=synthetic` missions
in assigned/en-route/arrived state. Demo actors, citizens, wrong stations and
non-synthetic missions are rejected. Ordinary citizen pending-only cancellation
is unchanged; coordinator cancellation is not exposed to stations.

The existing transaction changes mission and linked request to cancelled, retains
immutable status history and the reason, stops tracking, and releases the linked
station once. Audit event stores station actor, authenticated recovery account,
original recovery version, event ID and reason. Same ID/account/version/reason
replays return current mission; changed evidence conflicts. Stale or terminal
state conflicts. Completed missions are never overwritten. Existing pending jobs
may retry when capacity is released; no replacement of the cancelled request is
created. Tracking controls cannot write into a terminal mission after a race.

UI requires an explicit reason/confirmation and blocks ending while a local event
is unresolved. Lost-response retries keep the same recovery payload/ID; explicit
server rejections allow review of a new attempt after refresh. History remains
available and citizen polling observes the cancelled outcome. Nothing was ended
against developer records; only disposable test missions were used.

### Visual changes

Shared BrandLogo extracts the **unchanged** WebP bytes and SVG viewBox/clipping
from the active landing page. Only ResQ changes dark/light color; PH is unfiltered.
Compact navigation uses a separate unchanged copy of the approved emblem PNG;
its filter separates white glyphs from the original red accents and source alpha.
No approved favicon files or references changed (byte comparison against HEAD).
The earlier selected PNG remains preserved in the repository.

One shared synchronous theme hook reads the existing persisted preference and OS
fallback, synchronizes consumers/storage events, and supplies landing/auth/dashboard.
Dashboard dark base is `#0b1324`, surfaces `#152139`, insets `#101b30`, with separate
raised/hover levels and readable shared text/border tokens. No decorative glows
copied into workspaces; status/route/brand colors remain. Auth follows the same
selection rather than a competing media-query state.

My Mission tracking map and secondary preview now use desktop
`clamp(360px,46vh,440px)` and 320px on narrow screens. Changes are scoped to the
active mission view/preview; map instances, following and overlays are unchanged.
The specified repetitive Prototype paragraph was removed; tracking labels, Help,
notices, recovery messages and attribution remain.

### Verification and limitations

From `frontend/`: `npm run lint` passes (five existing warnings),
`npm test -- --run` passes 404 tests / 59 files, `npm run build` passes with the
existing >500KB chunk warning. Node also reports its existing localStorage
experimental warning. `git diff --check` passes. Approved favicon/index files
are byte-identical to baseline; extracted landing asset is byte-identical to the
embedded source and sidebar emblem copy is byte-identical to favicon-48.

From `backend/`, working Python environment:

```sh
.venv/bin/python -m ruff check app tests ../tests/integration
.venv/bin/python -m pytest tests ../tests/integration
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' .venv/bin/python -m pytest tests/test_product_journey_mongodb.py
RUN_MONGODB_INTEGRATION=1 MONGODB_INTEGRATION_URI='mongodb://localhost:27018/?replicaSet=rs0&directConnection=true' MONGODB_INTEGRATION_DATABASE='resqph_issue62_offline_recovery_20261012_c74a' .venv/bin/python -m pytest tests/test_offline_sync_mongodb.py
```

Ruff passes. Standard suite: **219 passed, 31 skipped**, one existing Starlette/httpx
deprecation warning; skips are opt-in MongoDB cases. Product journey: **8 passed**,
including current auth/dispatch/ordinary lifecycle, wrong citizen/station/session,
all three active recovery states, duplicate/changing-evidence recovery, atomic
rollback after injected history-write OperationFailure, terminal tracking, citizen
visibility, next assignment, and races against acceptance/arrival/completion.
Each race has one successful versioned transition and one 409, with one station
version increment. Rollback compares complete mission/request/team/event snapshots.
Offline MongoDB replay suite: **15 passed**, including concurrent/lost-response
replay, changed actor/evidence, stale versions and history transaction rollback.
Frontend covers account switches, accepted-event evidence, confirmed discard and
private recovery record isolation, shared theme and branding source/filter behavior.

A supplementary combined old acceptance run used an incorrect common database
prefix (15 offline fixture setup errors); rerunning offline with its required
Issue62 prefix passed all 15. Six legacy Phase5 opt-in cases fail because they
expect retired manual assignment/coordinator/demo-header endpoints and team-alpha/
bravo seed records; one Issue15 API case was skipped for its different database
prefix. These are obsolete acceptance dependencies, not asserted passing evidence.
They were left unchanged; the current cookie-authenticated workflow passed on
fresh station-catalog databases. No retired authorization was enabled to make
legacy tests pass. Initial implementation failures were repaired before final runs.

Browser visual/lifecycle acceptance is **pending**, not replaced by mocks. Remaining
manual walkthrough: separate citizen/rescuer profiles; landing/auth/dashboard theme
navigation and refresh; both sidebar states/themes; larger tracking map with following;
ordinary completion; failed-event refresh/reconcile/discard; a separate disposable
mission ending and citizen terminal display; subsequent station assignment.

Existing disposable MongoDB server on port 27018 was reused. Fixtures guard against
existing databases and drop only their newly created `resqph_station_disposable_*`
and explicit Issue62/73 test databases in finally blocks. Developer database,
accounts, environment files, historical missions and containers were not reset.

### Files changed in this continuation

- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/STATUS.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`
- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `frontend/public/brand/README.md`
- `backend/app/api/dependencies/demo_role.py`
- `backend/app/api/routes/missions.py`
- `backend/app/main.py`
- `backend/app/models/mission_status_event.py`
- `backend/app/repositories/missions.py`
- `backend/app/schemas/missions.py`
- `backend/app/services/missions.py`
- `backend/tests/test_product_journey_mongodb.py`
- `frontend/src/App.tsx`
- `frontend/src/api/client.ts`
- `frontend/src/api/missions.ts`
- `frontend/src/components/brand/BrandLogo.test.tsx`
- `frontend/src/components/brand/BrandLogo.tsx`
- `frontend/src/components/ui/SyncStatusBadge.test.tsx`
- `frontend/src/components/ui/SyncStatusBadge.tsx`
- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/offline/offlineStore.test.ts`
- `frontend/src/features/offline/offlineStore.ts`
- `frontend/src/features/offline/useOfflineMission.test.tsx`
- `frontend/src/features/offline/useOfflineMission.ts`
- `frontend/src/features/workspace/RescuerWorkspace.tsx`
- `frontend/src/features/workspace/sharedVisualSystem.css`
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/pages/auth/AuthAccessibility.test.tsx`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerMissionCard.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerOfflinePresentation.test.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerOfflineQueue.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerPhase2.test.tsx`
- `frontend/public/brand/landing-wordmark.webp`
- `frontend/public/brand/sidebar-emblem.png`
- `frontend/src/features/theme/useTheme.ts`
- `frontend/src/features/theme/useTheme.test.tsx`

## Selected logo and Practical Tips — latest acceptance, 2026-10-12

This section supersedes the earlier logo-blocker/fallback entries below. The user
explicitly selected the 2170×725 PNG in their latest message. The matching local
image was copied unchanged to `frontend/public/brand/resqph-wordmark.png`; source
and destination SHA-256 both equal
`cc63cc06bc2484f7c0b366b2e1dd6189db7158ae4849a6e10dfd284a4da18a22`.
It is RGBA with alpha range 0–255. No new image generation or cleanup was performed.
The previous incorrect logo persisted because shared BrandLogo still pointed at
`/resQPHlogo_temporary.jpg`; this was a source selection issue.

- Shared BrandLogo now points to the selected PNG for login, all signup steps,
  expanded citizen/rescuer sidebars, SiteHeader and SiteFooter. CSS preserves its
  proportions with automatic height, no filter, and no added image background.
  Compact branding remains the approved emblem.
- Checksums for index.html, all three approved favicon PNGs and existing compact
  source images match the pre-task snapshot. No favicon, manifest or icon-reference
  changes were made in this continuation; earlier working-tree edits are preserved.
- Practical Tips had empty space because the grid stretched it to the neighboring
  weather card. Grid start alignment and natural card height remove that stretch.
  The existing two-column desktop / one-column narrow layout remains responsive.
- Suggestions use one shared deterministic rule source, preserving rainy-kind,
  60% probability and 32 °C thresholds and the existing string API. Each current
  suggestion explains its actual condition or measurement and threshold.
  “Before heading out” is explicitly general preparation, independent of weather;
  hydration is omitted there when the current heat tip already covers it.
- Weather cache sharing, timestamps, stale/offline/error pausing, loading, missing
  measurements, manual refresh and 429 cooldown remain unchanged. No new network
  requests, polling, services, environment variables or backend changes.

Verification: `npm run lint` passed (six existing warnings), `npm test -- --run`
passed **400 tests / 58 files**, `npm run build` passed (existing large-chunk warning),
and `git diff --check` passed. Tests cover selected logo source, matching condition
and threshold explanations, multiple/no tips, unavailable/stale preparation and
no duplicated hydration. Existing offline and rate-limit checks also pass.

Browser runtime returned `No browser is available`. No before/after screenshots or
real browser visual acceptance are claimed. Pending manual checks: desktop/mobile,
light/dark auth and both role sidebars; selected PNG proportions/transparency and
readability; one/multiple/no-tip Advisory cards, long conditions, and offline/error
states. Use the existing manual checklist below. All prior uncommitted work remains
on `feature/citizen-ui-advisory-refinement`; no commit, push, PR or remote actions.

## Earlier continuation checkpoint — 2026-10-12


Same branch, baseline `e6623bc`, all earlier uncommitted work preserved. Removed the
remaining legacy navy dark-table declarations in shared CSS in favor of the existing
neutral raised/hover tokens, added shared BrandLogo source/compact-emblem tests, removed
forced square auth-logo aspect ratio, and recorded favicon provenance under
`frontend/public/brand/README.md`.

Latest verification: lint passed with six existing warnings; **398 tests / 58 files
passed**; TypeScript/Vite build passed with the existing chunk warning; production
favicon PNG sizes/alpha and `git diff --check` passed. Browser again unavailable.
The supplied reference is visible and was inspected, but the original file still is
not present locally and generated edits remain rejected. Full-logo replacement is
still blocked pending the original source/file path or exact transparent PNG. Shared
BrandLogo continues to use the documented opaque fallback. No commits, pushes, PR,
branch switching, backend/environment/database changes or real mission mutations.

## Focused branding/styling correction (latest follow-up)

Same branch and baseline `e6623bcd20e4d57d75fb4e6065160b674774d6ea`; all prior
uncommitted changes preserved. No remote or Git history actions.

### Logo source and exact-asset blocker

The user subsequently supplied the 400×118 wordmark in chat: white “ResQ,” blue “P,”
red “H” on charcoal. **That reference was inspected.** No original image file is
present in the attachment folder and no matching transparent repository source exists.
The image tool's background-removal attempts produced noisy edges/changed details;
those outputs were rejected and are **not bundled or used**. Lossless original-file
background removal or a supplied transparent PNG is pending the user's reply/file.
Do not claim the requested wordmark is implemented or that its transparency passed.

`BrandLogo.tsx` now owns all active logo placements (auth including final signup step,
sidebar, SiteHeader, SiteFooter). Its full-logo source temporarily remains the existing
`/resQPHlogo_temporary.jpg`; it is opaque and does not match the new reference. Compact
sidebar uses the existing-emblem favicon variant. The former approximated SVG is
preserved as a file but no longer used in these placements. Final transparent wordmark
sizing/readability in both themes remains part of the blocker and manual acceptance.

### Favicon

`public/brand/favicon-{16,32,48}.png`: white/red edit of existing `/logo.png` rescue
emblem using imagegen, then size exports from that one master using macOS `sips`.
No wordmark or blue background. All three inspected at native dimensions; PNG RGBA,
exact sizes, alpha extrema 0–255 and fully transparent four corners verified.
`index.html` references only these PNG favicon sizes; previous JPG/Apple icon references
removed. No manifest/maskable/PWA icon configuration found; offline service worker
untouched. Production asset paths checked. Actual browser tab readability and favicon
cache eviction remain pending: hard reload/new tab or clear cached site favicon.

### Winning CSS declarations corrected

- Home outer cards: `figmaWorkspace.css` uses the more specific
  `.workspace-shell[data-role][data-view] .screenshot-home .workspace-card` rule, which
  paints `--home-surface`, not `--shared-surface`. Weather cards now also scope
  `--home-surface` to neutral. The old blue card shadow now uses `--surface-shadow`;
  the separate semantic red rescue CTA gradient/shadow is preserved.
- Nested current/hourly weather: `weatherSummary.css` and `hourlyWeather.css` dark
  backgrounds `#20364b`/borders `#476780` now read shared surface/border tokens.
  `screenshotHome.css` dark metric/row background `#172a40` now reads shared inset.
  Loading shapes inherit a neutral Home-selected token within weather cards.
- My Requests: `screenshotRequests.css` role/view/theme selectors beat generic dark
  table rules. `#3d6889` header and `#355976` hover now use neutral raised/hover tokens.
  Filters now read scoped tokens instead of fixed `#7fa5c2`; selected filters retain
  an accent border and distinct charcoal fill. Refresh action now reads theme tokens.
  The page scopes inset/surface/selected/foreground/border tokens; headers, rows,
  loading, empty and selected states retain tonal separation. Light-mode behavior
  and operational status/route colors remain.
- Role text: the dark selector with `[data-theme=dark]` explicitly set navy
  `#052354`, beating the prior generic role-badge override. That declaration now reads
  neutral near-white ink/charcoal surface; light mode still uses dark readable ink.
- Theme images: Figma's `auto !important` img dimensions plus inherited scale transform,
  and a 61.5×32 moon artwork containing a slash, made nominal size increases misleading.
  Header now uses existing shared Icon family with small original sun/moon paths and
  currentColor, independent of image/scale constraints. No broad filter/important fix.

### Dimensions and headings

| Property | Before this correction | After (source values) |
|---|---|---|
| Theme switch | 88×44 px | 100×48 px |
| Theme icons | nominal 24×24 px, inherited Figma scale | actual SVG 30×30 px |
| Theme slots / thumb | 38×32 / 36×34 px | 44×38 / 44×38 px |
| Thumb movement | 42 px | 46 px |
| Desktop Home gap | 20 px | 18 px |
| Desktop status min-height / padding | 124 / 18 px | 116 / 16 px |
| Desktop weather outer padding | 16 px | 14 px |
| Section heading bottom gap | 16 px | 14 px |
| Weather section top gap | 34 × home-unit | 18 px |
| Rescue button padding / gap | 38 / 55 × figma-unit | 30 / 44 × figma-unit |

Only native decorative asset geometry is fitted to smaller Home icon slots; no page,
card or text is scaled, zoomed or clipped. Same-viewport rendered comparison is pending,
so these dimensions are source changes, not measured screenshot acceptance.

Sidebar “Advisory” and topbar h1 “Advisory” stay. The second displayed heading is now
one h2 “Weather advisory”; the separate repeated section heading is removed. Current
weather, Practical tips and Data status retain their structured cards and state logic.
The exact Account paragraph is removed from the shared page for both roles; identity
remains read-only, membership unavailable for editing, save/error/logout retained.

### Latest checks and remaining manual verification

- `npm run lint`: passed with the same six existing warnings.
- `npm test -- --run`: **396 passed / 57 files**; account copy/identity checks for both
  roles, single Advisory heading, shared theme SVG dimensions and previous auth/request/
  map/lifecycle/offline tests pass. An initial test-fixture initialization error was fixed
  before this successful run.
- `npm run build`: passed (existing large-chunk warning); packaged favicon PNG paths.
- `git diff --check`: passed.
- Browser again returned `No browser is available`: no before/after screenshots,
  computed CSS, autofill, tab favicon or actual viewport acceptance claimed.
- Manual: matching desktop/mobile viewports; dark/light Citizen/Rescuer role badge,
  My Requests filters/headers/hover/selection/loading, Home weather layers and spacing,
  theme focus/alignment with both sidebar states, long content; request submission and
  rescuer Routes/lifecycle with disposable records. Preserve normal database.
- Exact full-logo asset remains blocked as described above. Backend, environment,
  database, station catalog, weather rules, sessions and mission behavior untouched.

### Exact cumulative changed files on this branch

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `docs/STATUS.md`
- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`
- `frontend/index.html`
- `frontend/public/assets/rescue-station.svg`
- `frontend/public/brand/README.md`
- `frontend/public/brand/favicon-16.png`
- `frontend/public/brand/favicon-32.png`
- `frontend/public/brand/favicon-48.png`
- `frontend/src/components/art/Icon.tsx`
- `frontend/src/components/brand/BrandLogo.test.tsx`
- `frontend/src/components/brand/BrandLogo.tsx`
- `frontend/src/components/layout/SiteFooter.css`
- `frontend/src/components/layout/SiteFooter.tsx`
- `frontend/src/components/layout/SiteHeader.css`
- `frontend/src/components/layout/SiteHeader.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/map/LocationOptions.test.tsx`
- `frontend/src/features/map/LocationOptions.tsx`
- `frontend/src/features/map/NavigationCamera.test.tsx`
- `frontend/src/features/workspace/AccountWorkspace.test.tsx`
- `frontend/src/features/workspace/AccountWorkspace.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.test.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.tsx`
- `frontend/src/features/workspace/CitizenMap.test.tsx`
- `frontend/src/features/workspace/CitizenMap.tsx`
- `frontend/src/features/workspace/WorkspaceHeader.test.tsx`
- `frontend/src/features/workspace/WorkspaceHeader.tsx`
- `frontend/src/features/workspace/figmaWorkspace.css`
- `frontend/src/features/workspace/hourlyWeather.css`
- `frontend/src/features/workspace/screenshotHome.css`
- `frontend/src/features/workspace/screenshotRequests.css`
- `frontend/src/features/workspace/sharedVisualSystem.css`
- `frontend/src/features/workspace/weatherSummary.css`
- `frontend/src/pages/auth/AuthAccessibility.test.tsx`
- `frontend/src/pages/auth/AuthLayout.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/auth/auth.css`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/views/citizen/CitizenRequestFlow.test.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestLocationMap.tsx`
- `frontend/src/test/phase5RoleFlows.test.tsx`

Previous follow-up details below are historical; latest correction above supersedes
older logo/favicon/heading/dimension claims.

## Follow-up presentation and usability

- Auth: `AuthLayout.tsx`, `SignupPage.tsx`, `auth.css`, `AuthAccessibility.test.tsx`.
  Center the existing `/resQPHlogo_temporary.jpg` blue-and-red logo at all auth steps;
  remove the registration explanatory block and station-login link only. Ordinary
  login link, citizen-only registration endpoint, role/station selector, password
  controls and redirects remain. Shared neutral tokens follow browser light/dark.
- Branding: `DashboardPage.tsx`, `index.html`. Same existing colored logo in expanded
  and collapsed navigation, with proportional dimensions and no recoloring filter.
  Favicon and Apple icon use existing `/logo-ref.jpg`; it includes the recognizable
  rescue mark and colored wordmark on navy. No manifest/PWA icon configuration was
  found; custom service-worker/offline-shell behavior is unchanged. Both assets are
  copied locally by Vite. Browser favicon legibility/caching is pending.
- Shared visual rules: `sharedVisualSystem.css`, `AccountWorkspace.tsx`. Semantic
  `--neutral-*` page/surface/inset/ink/muted/line tokens scope light gray and dark
  charcoal to weather, Advisory, Account and the top-right role badge. Account uses
  the existing currentColor Icon family for profile/avatar/photo decoration; original
  Figma assets are retained. Shared header/sidebar/Account affects citizen and rescuer
  (and existing coordinator consumers); operational route/status/branding colors stay.
  Theme icons grow from 20px to 24px within the existing 88×44 control. Home card
  padding/gaps/minimum heights tighten modestly, plus shared rescuer mission padding.
- Advisory: `CitizenAdvisory.tsx`, its tests. “Weather advisory” introduces a responsive
  current-weather/tips grid and compact data-status card. Tips receive short headings
  and icons. Rules, source, query keys, refresh bounds and backend behavior stay intact;
  stale/offline/error/partial/429 feedback and PHT provider timestamp remain visible.
- Maps: `InteractiveFloodMap.tsx`, `NavigationCamera.test.tsx`,
  `public/assets/rescue-station.svg`. Small original building with a rescue cross,
  drawn locally for this task; no external image/license dependency. Five catalog IDs,
  names, addresses, coordinates, assigned outline and single-active-popup remain.
- Location: shared `LocationOptions.tsx` and tests, `RequestLocationMap.tsx`,
  `CitizenMap.tsx`, citizen request/Map/phase-five flow tests. Closed by default;
  source summary stays outside hidden fieldset. Toggle exposes native radios without
  requesting GPS; toggle, Escape and outside pointer dismiss. Escape returns trigger
  focus; outside dismissal restores focus when it was inside. Nonmodal, no trap,
  aria-expanded/controls, stable fieldset ID. The panel anchors inside the existing map
  wrapper and stops pointer/click bubbling; opening/closing never recreates the map.
  GPS loading/errors, selected summary, keyboard pin buttons and green confirmation
  stay visible. Existing source/pin changes invalidate confirmation.

All screenshot references remain unavailable: attachment contains only written text.
Logo assets were inspected directly; this does not establish rendered browser acceptance.

## Implemented and tested

- Login role cards retain native radios and selected red surfaces. Radios are visually
  hidden with a separate visible keyboard-focus outline. Top auth tabs are removed;
  login and every signup step have an alternative account-access link. Station selection
  still uses the existing catalog/authentication implementation.
- Auth background/overlay image is removed in CSS; its shared image asset is preserved.
  Auth surfaces follow browser light/dark preferences. Fields have one wrapper border
  and focus outline, with matching autofill backgrounds and readable errors/links.
- Road conditions hides all green/yellow/red road overlays and controlled flood shading.
  Basemap, study boundary, incident/HQ/response markers and mission route remain.
  Legend visibility matches the display toggle. No routing/dispatch constraints change.
- Recenter is an accessible, titled target icon with a 44px touch target. Existing follow
  behavior remains. Repetitive general map explanation moves to Help; operational
  feedback and Google/OpenStreetMap attribution remain.
- One InfoWindow per mounted map replaces previous road/marker popups. Empty clicks
  dismiss while retaining incident selection. Layer removal closes its popup and removes
  its listeners; marker deletion and map teardown remove marker/drag/click listeners.
- Shared theme control uses fixed equal icon slots and a correctly sized thumb.
  Dark surfaces use near-black/charcoal tokens with separate insets and borders.
  Home removes excess fill height and reduces gaps/padding without scaling or clipping.
- Help & Limitations has a real `?view=help` page for both active roles. Advisory is
  citizen-only at `?view=advisory`. Direct entry, remount/reload and back/forward are tested.
  Help explains pin confirmation, assignment, pending requests, tracking, supported
  polygon, weather, account access and offline limits. Cancellation was checked in
  `backend/app/services/rescue_requests.py`: citizen cancellation is pending and unassigned
  only, ownership/version checked, and reflects server acceptance.

## Root causes

1. Input overlap: `.auth-pill-field:focus-within` drew the outer treatment while a
   later `.auth-mobile-page :focus-visible` drew an inner outline on the input.
   The nested input now has no independent border/ring; the wrapper preserves focus.
   Native autofill is explicitly styled to match the field surface. This is source-level
   diagnosis; actual browser autofill appearance remains to be checked.
2. Toggle: roads were constructed unconditionally; only flood polygons checked
   `floodVisible`. Road and shading creation now share the same display condition.
3. Popups: each road/flood/route click constructed a new InfoWindow, while retained
   marker listeners captured effect-local windows. There was no single popup owner,
   and detached overlay listeners were not explicitly removed. A map-owned window
   and explicit listener cleanup now handle every supported click target.

## Advisory source, rules and cost

- Uses the existing authenticated `/api/v1/weather/ubelt` adapter; only the backend
  communicates with Google Weather using its server key. Location is the adapter's
  fixed U-Belt point (14.6042 N, 120.9946 E), not the citizen's GPS/request pin.
- The backend returns structured `kind` (`clear`, `cloud`, `rain`) and metric values.
  The frontend retains unrounded `temperatureC` alongside existing rounded Home values.
- `kind=rain`: umbrella/raincoat and protect belongings. Otherwise rain probability
  at least 60%: rain is possible, consider an umbrella. Temperature at least 32 °C:
  drinking water and reduced prolonged exposure. Thresholds are practical app choices,
  not official alert levels or a medical heat-index calculation. No LLM or string matching.
- Thunderstorm-specific provider codes are not exposed by the current adapter; no
  thunderstorm-specific advice is inferred. Suggestions do not determine flood depth,
  passability, evacuation orders, mission urgency or routing.
- Missing optional measurements show Unavailable; missing core/malformed weather is
  unavailable. No fabricated rain/clear weather or fallback demonstration measurements.
- Provider times older than 15 minutes, failed refreshes, and offline cached weather are
  labeled stale; suggestions pause. Times are displayed in PHT. Advisory displays current
  conditions only; Home's hourly and daily ranges retain their forecast distinction.
- Home/Advisory share `['weather','ubelt']`, with 15-minute freshness and 30-minute inactive
  memory-cache retention. No polling, focus or reconnect refetch. The previous `gcTime:0`
  discarded weather on navigation; retaining cache avoids repeated paid calls per view.
- Advisory manual refresh is bounded to at most one attempt per minute using shared query
  success/error timestamps; a longer server Retry-After takes precedence. No automatic
  retries. Local clocks update stale/countdown labels only and make no weather requests.
- Inspection found **no existing backend weather response cache**: adapter responses use
  `Cache-Control: no-store`. This task reuses that adapter and reduces requests through
  shared frontend caching; server caching across users is an existing limitation. No
  backend change, new provider/service, billing change or secret exposure.

## Verification

From `frontend/`:

```sh
npm run lint
npm test -- --run
npm run build
```

- Lint: passed with six pre-existing warnings in LandingPage, shared.tsx, AuthContext
  and MissionContext; no new warnings in this refinement.
- Tests: 57 files, 394 passed. Includes native auth role/focus semantics and links,
  road classes/shading removal and repeat restoration, preserved route/markers,
  single popup replacement/dismissal/listener cleanup, accessible icon-only Recenter,
  direct Help/Advisory navigation and history, deterministic rules, metric precision,
  missing core/optional weather, provider timestamps/stale/offline/error/429 states,
  shared weather cache across mounts and bounded refresh. Existing citizen and rescuer
  request/lifecycle/offline suites passed.
- Follow-up tests additionally cover notice removal, structured Advisory headings,
  collapsed location options, selection, Escape/focus/outside dismissal, interaction
  containment, disabled GPS options, stable map instance and headquarters asset identity.
- Build: TypeScript/Vite passed, existing large-chunk warning remains.
- `git diff --check`: passed.
- Backend untouched; backend tests/lint were not rerun.

Browser connection returned `No browser is available`. No screenshots were inspected
or captured. Actual visual/keyboard/autofill/Google-map acceptance and disposable-record
citizen/rescuer browser smoke tests are pending, rather than established by SDK mocks.

## Manual testing

The working checkout is already on the branch. Run from the repository root:

```sh
bash ./dev.sh
```

If ports 8000/5173 are occupied by other local projects, stop their development servers
first. No new environment placeholders or services are required. Existing keys stay local.

- Open `http://localhost:5173/login` and `/signup` on desktop/mobile. Verify one clear
  alternative account link, visible labels, password toggle, station selection, native
  role keyboard arrows, separate selection/focus, autofill, validation and disabled states.
  Test light/dark OS preference; auth follows that preference. Image is absent.
- Dashboard: test theme toggle alignment and neutral dark cards/insets, readable text,
  placeholders/errors/focus. Check Home natural compact height at narrow/short/large sizes.
- Open `/dashboard?view=help` and `/dashboard?view=advisory` directly and from the sidebar.
  Reload, then use browser Back/Forward. Verify active navigation and distinct content.
- Map: toggle conditions repeatedly; all green/yellow/red roads and flood shading hide
  and restore exactly once. Incident, five headquarters, route and moving responder remain.
  Click several roads/stations, then blank map space: one popup at a time, dismissal and
  click-to-pin still work. Recenter remains accessible and restores following.
- Advisory: check real provider data, PHT time, units, missing precipitation, fresh/no-tip,
  error/rate-limit cooldown and offline/stale states. Navigate Home/Advisory repeatedly;
  verify cached weather is shared and no frequent automatic requests occur.
- With separate citizen/station profiles and **disposable synthetic records**, submit a
  confirmed request, observe automatic assignment and station receipt, Accept & Start,
  follow/recenter, Arrived and explicit completion. Check existing offline queue/replay.
  Keep developer and historical records intact. Record sanitized screenshots if possible.

## Changed files grouped by feature

### Authentication

- `frontend/src/pages/auth/AuthAccessibility.test.tsx`
- `frontend/src/pages/auth/AuthLayout.tsx`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/RoleChooser.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/auth/auth.css`

### Maps

- `frontend/src/components/art/Icon.tsx`
- `frontend/src/features/map/InteractiveFloodMap.test.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/map/NavigationCamera.test.tsx`
- `frontend/src/features/map/map.css`

### Weather and Advisory

- `frontend/src/api/weather.ts`
- `frontend/src/features/workspace/CitizenAdvisory.test.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.tsx`
- `frontend/src/features/workspace/useUbeltWeather.ts`
- `frontend/src/features/workspace/weatherAdvisories.test.ts`
- `frontend/src/features/workspace/weatherAdvisories.ts`

### Navigation, Help, Home and theme

- `frontend/src/features/workspace/CitizenHome.test.tsx`
- `frontend/src/features/workspace/CitizenHome.tsx`
- `frontend/src/features/workspace/HelpLimitations.tsx`
- `frontend/src/features/workspace/RequestRescueModal.test.tsx`
- `frontend/src/features/workspace/sharedVisualSystem.css`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/DesktopWorkspace.test.tsx`

### Documentation and context

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `docs/STATUS.md`
- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`

## Follow-up manual acceptance still pending

1. Desktop and narrow mobile: login/signup, keyboard and native autofill, both OS themes;
   centered logo and no top tabs/registration notice. Signup still creates only citizens.
2. Both roles and sidebar states: brand readability/proportions, theme icons, long station
   names, badge wrapping and focus. Favicon may require a hard reload or clearing the
   site’s cached favicon; confirm it on the production preview as well.
3. Citizen Home, Requests, Map, Advisory, Help, Account; rescuer My Mission, Routes,
   History, Help, Account: neutral weather/profile surfaces in both themes, readable
   account icons/text, compact Home without clipping loading/error/long-content states.
4. All five HQ markers: building icon versus moving vehicle, assigned outline, catalog
   address popup, single popup at a time and fixed HQ positions during tracking.
5. Location options: default closed, no GPS on opening, toggle/Escape/outside dismiss,
   keyboard focus return, mobile containment, no map pin beneath panel interaction.
   GPS loading/permission failures remain visible with panel closed; keyboard/map pin
   changes and GPS/demo selection reset confirmation. Green action stays available.
6. Disposable citizen request submission and separate rescuer browser-profile lifecycle/
   Routes controls. Preserve the normal developer database. DOM/SDK tests do not replace
   this real-browser/API acceptance.
