# ResQPH project status

2026-10-13 deployment preparation, baseline main `5131e45` (PR #92):
recent UI and routing retained on `setup/production-deployment`. Root-context
Render/Vercel templates, hosted security validation, bounded readiness and expanded
CI prepared. Owner approved free plans only; Atlas Free Singapore and staging-only
database user verified. No local history migrated. Frontend 433 tests/build, backend
252 checks, routing 150 checks, explicit disposable MongoDB 41 checks plus restart
lease test pass. These are local results, not hosted acceptance. Provider-connected
CD, normal PR review, secure service variables, Atlas transactions, backup restore
and hosted UI/lifecycle verification remain pending. See [deployment checkpoint](../deployment/README.md).

Earlier entries below are historical checkpoints, not current merge/deployment status.

2026-10-13 local station-distance repair, baseline `c95c8c3` on temporary-main:
controlled retained-position reproduction selects Iverson before and Sampaloc after
headquarters-only dispatch. Distance routing now uses nearest physical segments,
directed partial-edge travel, a 75 m coverage guard, finite road-length validation,
and persisted backend decision provenance. All five headquarters comparisons and
capacity race pass in disposable MongoDB; catalog/road geometry unchanged.
Historical reported decision remains unproven; port 8000 belongs to another project.
See [station evidence report](testing/STATION-DISTANCE-2026-10-13.md) for exact checks
and six retained legacy acceptance failures. No frontend/auth/offline/lifecycle
implementation changes; no commit, push, PR or merge.

2026-10-12 weather repair on local `temporary-main`: configured server key
reaches Google, but current/daily/hourly calls return provider HTTP 429.
Current conditions identifies a daily quota of 100 requests. Sanitized quota and
access-denied errors, per-endpoint failure cooldown, cross-origin Retry-After
exposure and Home/Advisory feedback implemented. Live weather remains blocked
until the Google Cloud quota resets or the project administrator changes it.
No keys, billing settings, database records or remote branches changed.
See backend README troubleshooting; no automated tests run for this repair.

Latest 2026-10-12 shared-journey/cancellation checkpoint, baseline `feb037d`:
account-switch recovery blocks old transports/mutations, hides the old workspace and
requires explicit login across refresh; shared journey keys bound tracking polling and preserve stale
server position. Citizens can cancel pending or assigned-before-travel requests with
confirmation; existing lifecycle transaction releases capacity once and preserves
history. Routes raw diagnostics removed; dark request panels/flood-field alignment
repaired. Frontend 424 checks/lint/build; backend 226 passed/38 opt-in skips; 7 new
cookie cancellation/session, 8 product journey and 15 offline Mongo cases pass.
Six legacy fixture failures remain; browser/screenshots/original symptom unverified.
Demo/developer databases and queues preserved. No remote actions/commit; see report.


Latest 2026-10-12 dark-auth/refresh/demo checkpoint supersedes prior auth theme notes:
explicit dark login/register preserves dashboard preference; compact Advisory refresh;
cookie-account assertions now protect reads and polling stops for expired/switched
sessions. New isolated `resqph_demo_20261012` on existing localhost:27018 rs0 contains
5 citizen and 5 canonical station accounts; all ten real API login/session/logout
checks pass, rerun preserves them. Developer DB untouched. Frontend 409 tests/lint/build;
backend/integration 226 passed, 31 opt-in skips; 8 current-cookie and 15 offline Mongo
cases pass. Six legacy opt-in failures remain individually documented. Browser
unavailable; original browser symptom and rendered acceptance pending. Ignored local
README contains credentials/startup. No commit/push/PR; see refinement report.


Latest 2026-10-12 landing-theme/mission recovery continuation: local feature branch
at baseline `8ac45bf`; shared landing wordmark and persisted theme, dark base
`#0b1324`, explicit queue reconciliation/discard and assigned-station synthetic
mission ending implemented. 404 frontend tests; standard backend 219 passed / 31
opt-in skips; 8 real cookie-authenticated MongoDB journey/recovery cases and 15
real offline replay cases pass. Browser unavailable; legacy opt-in Phase5 tests
still require retired coordinator/demo/team fixtures. See the existing refinement
report for evidence and limitations. Uncommitted/unpushed; developer DB unchanged.


Latest local correction (2026-10-12): the user explicitly selected the transparent
2170×725 white ResQ / blue P / red H PNG. Shared BrandLogo now uses that unchanged
asset for auth and expanded full-logo placements; compact branding and approved
favicons remain unchanged. Advisory cards size naturally, with measurement-based
suggestion explanations and a separate preparation checklist. All 400 frontend tests
across 58 files, lint and production build pass with existing warnings. Browser
visual acceptance remains pending; see the existing local testing report.

**Last updated:** 2026-10-12 (Asia/Manila)

## Citizen UI and Advisory local refinement (2026-10-11)

Current local branch `feature/citizen-ui-advisory-refinement`; follow-up baseline
`e6623bc` contains the prior UI/advisory implementation (original base `4ffa717`).
Follow-up adds centered existing colored branding/favicon, scoped neutral weather/
Account tokens, slightly larger theme icons, tighter Home, structured Advisory,
original fixed HQ building icons and shared collapsible location options. Frontend:
396 tests pass, lint passes with six existing warnings, build passes with the existing
chunk warning. Browser acceptance is pending: no connected browser is available.
Follow-up remains uncommitted/unpushed; no PR/deployment or database/environment changes.
See [local refinement evidence and manual checklist](testing/CITIZEN-UI-ADVISORY-2026-10-11.md).

## Navigation and request UX checkpoint (2026-10-11)

Current task branch: `feature/navigation-request-ux`, based on accepted
`origin/temporary-main` at `a143a18acea7fa6897cd7bce196dec912bf7dcdd`.
Rescuer heading-up following, an original vehicle SVG, shared lifecycle controls
on Routes, and validated citizen pin confirmation are implemented. Raw road
tables and citizen coordinate inputs are removed. Frontend: 376 tests pass,
lint passes with six pre-existing warnings, and production build passes with
the existing chunk-size warning. Backend contracts and database are unchanged.
Browser connection was unavailable: heading/tilt, appearance, and separate-session
full-flow acceptance remain pending. This is a feature checkpoint, not final acceptance.
See [navigation verification and teammate checklist](testing/NAVIGATION-REQUEST-UX-2026-10-11.md).
The branch/status notes below describe preceding checkpoints.

Latest candidate checks and remaining merge gates: [2026-10-10 evidence](testing/LOCAL-CANDIDATE-2026-10-10.md).
The branch is being packaged for review; it is not final acceptance. Older verification counts below are historical.

## Authorized citizen-to-station continuation (2026-10-10)

The active local branch for this task is `feature/station-login-markers` at
`origin/temporary-main` baseline `7a71bc70307d406558407c6a4c8edf772eb9f468`.
The authorized scope supersedes the earlier three-role/manual-dispatch
candidate: only Citizen and provisioned station Rescuer accounts are active;
station assignment is automatic; Google Maps is the display provider; local
A* and backend simulation remain authoritative. This feature-branch checkpoint
is not finally accepted while separate-profile browser verification is pending.

Continuation evidence and open gates are tracked in
[station workflow verification](testing/LOCAL-CANDIDATE-STATION-WORKFLOW-2026-10-10.md).
Do not treat the preceding 2026-10-10 three-role browser evidence as acceptance
of this expanded workflow.

2026-10-11 verification follow-up: frontend 363 tests, backend 172 tests,
cross-layer integration 47 tests, routing 136 tests, and the disposable Mongo
cookie-auth/dispatch/lifecycle/cancellation race acceptance passed. Backend and
routing Ruff checks passed; frontend lint exited successfully with existing
warnings; production build passed with the existing large-bundle warning. The
Mongo test removed its unique disposable database. Separate-profile browser
acceptance is still pending because no connected browser was available. The
reported historical Iverson mission exists in local Mongo, but its route has no
scenario/origin provenance; the original availability/ranking decision cannot
be reconstructed. Current synthetic station distances and limitations are in
the linked station workflow evidence.

Registration network follow-up: `dev.sh` now selects the localhost-only
development origin with strict port binding; CORS explicitly allows that
origin and only the API's methods/CSRF/idempotency headers. Wire-level
preflight results and the browser-origin limitation are recorded in the
[station workflow verification](testing/LOCAL-CANDIDATE-STATION-WORKFLOW-2026-10-10.md).

**Active phase:** Team Phase 5 — Integration, Testing, and Presentation.
**Health:** In progress; revised local implementation is not yet delivered or finally accepted.

Foundation 1–2 and Team Phases 1–4 are completed and verified. Phase 3 retains its accepted exploratory-ML conditions: runtime ML remains disabled.

Those are historical phase records, not proof that the revised candidate passes final acceptance. The 2026-10-05 fresh-request audit exposed cache/status/identity/route defects; Phase 5 must reverify those paths, including production offline reload/replay.

## Prior local candidate and issue reconciliation (historical)

Branch `feature/local-desktop-role-workspaces` contains uncommitted local integration and UI changes. Three roles remain: Citizen, Dispatcher (`coordinator` internally), and Rescuer. Volunteer/hazard-report entry points, rescuer hotline, alternative-route UI and manual coordinate editing are retired. Historical stored records and deterministic routing remain intact.

Added/changed locally: tab-scoped role simulation, dashboard rescue edit/review modal and draft handling, status popup with red reached progress, transient API-confirmed success, Map empty/selected/cancelled inspector states, permanent roads/boundary, rounded bottom-left zoom, Inter, shared cards/dropdowns, outlined collapsing navigation and full-width desktop page canvases. See [visual rules](ui/LOCAL_VISUAL_RULES.md). Local code is not equivalent to merged completion.

- #84: closed as not planned; removed volunteer work. #74: remains completed historical routing/ML evidence.
- Ranee #76/#77/#78/#82/#83: closed as not planned/superseded at Ranee's confirmed request. Their closure removes obsolete work packages, not remaining product acceptance. Local implementation/delivery is tracked under #70; do not reopen old tickets as prerequisites.
- #73: completed original Jared backend package through merged PR #80 and recorded database evidence. Candidate regression remains in #70, not a new assignment to restart Jared's package.
- #71: remaining positive three-role browser/offline acceptance; merged PR #79 tests/evidence are already delivered. Blocked pending a stable delivered candidate.
- #72: remaining revised-scope presentation/rehearsal; PR #81 documents are already delivered. Full rehearsal is blocked pending the candidate; material corrections can proceed.
- #70 and linked approval records describe the historical candidate; they do
  not authorize GitHub actions or deployment in this continuation.

Latest width-only checks: 19 frontend tests across four suites passed; production build passed with the existing large-bundle warning. Citizen Home/My Requests/Map/Account were visually reviewed; other roles were not visually rerun in that check. These results do not replace a full fresh-request cross-role acceptance run.

## Phase 4 acceptance

Reviewed packages: PR #65 (Elle), #66 (Matthew), #67 (Jared), #68 (Clarence), followed by Ranee's Issue #64 integration gate. See [gate](phases/TEAM-PHASE-04-GATE.md) and [evidence](testing/TEAM-PHASE-04-EVIDENCE.md).

Real browser/IndexedDB offline reload, queued identity, accepted API replay, durable MongoDB event count, conflict/reload review, actor isolation and corrupt-cache rejection were checked. The production UI shell is cached; API responses and map tiles are not.

Verification: frontend 234 tests plus lint/build; backend/integration 177 tests with real database cases enabled. Existing lint, bundle-size and development dependency warnings are final-quality work, not hidden completions.

## Phase 5 ownership

- Ranee: reproducible setup, CI/dependency quality, integration review and final release gate.
- Elle: browser role-flow and offline acceptance regression, keyboard/mobile evidence.
- Clarence: final demo, presentation script and source/limitation alignment.
- Jared: backend/API/database regression and safe local operational checks.
- Matthew: routing/fallback and external ML evidence reconciliation.

Use [Team Phase 5](phases/TEAM-PHASE-05.md) for historical phase context. The
new citizen-to-station, authentication, and Google Maps scope is authorized by
the user task and D-024 through D-027; runtime ML activation, nationwide scope,
and deployment remain outside this work.

Exact deadline and weekly capacity remain unrecorded. Hosting/submission decisions belong to Ranee.
