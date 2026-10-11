# ResQPH project status

**Last updated:** 2026-10-11 (Asia/Manila)

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
