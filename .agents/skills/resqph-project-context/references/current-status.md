# Current Status

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

- 2026-10-11 local UI/advisory follow-up: `feature/citizen-ui-advisory-refinement`
  now starts from prior UI commit `e6623bc`; original base `4ffa717`. Colored auth/
  sidebar branding, local favicon, neutral weather/account tokens, compact Home,
  structured Advisory, original fixed HQ building icon and shared collapsed location
  options added. 396 frontend tests and lint/build pass with existing warnings.
  Browser unavailable; follow-up uncommitted/unpushed for manual testing. See
  `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`.

- 2026-10-11 navigation checkpoint: `feature/navigation-request-ux` starts at
  `a143a18` (`origin/temporary-main`). Existing Google map now supports simulated
  heading-up navigation and a locally drawn vehicle marker; citizen location
  confirmation validates the pin, with keyboard adjustments and no manual coordinate
  fields. 376 frontend tests, lint and build pass (existing warnings retained).
  No connected browser was available: actual camera/visual and separate-session
  acceptance remain pending. See `docs/testing/NAVIGATION-REQUEST-UX-2026-10-11.md`.
  Older branch and test-count statements below are historical snapshots.

- Release preparation (2026-10-10): see `docs/testing/LOCAL-CANDIDATE-2026-10-10.md`.
  Frontend 340 passed; backend/integration 201 passed, 28 skipped; separate real-MongoDB
  journey 5 passed. Candidate is being packaged for draft review, not merged acceptance.
  Production offline reload/replay and fresh cross-role browser completion remain gates.
  Older uncommitted-status statements below describe earlier snapshots.

- Local Google Weather amendment (2026-10-10): current/day summary and six-hour
  forecast adapters use a configured server-only key. Real endpoints returned
  HTTP 200; six forecast columns and current conditions rendered in the browser.
  Home demo weather image/values and controlled warning removed; routing remains
  controlled. No automatic weather refresh. Focused tests and build passed;
  this is local verification, not merged release or whole-system acceptance.

- Active: Team Phase 5 — Integration, Testing, and Presentation.
- Current local candidate (2026-10-09): `feature/local-desktop-role-workspaces`, uncommitted/unmerged. Three-role retirement, tab identity, rescue/review and status modals, Map inspector states, Inter/shared styles and full-width desktop canvases are pending delivery. See `docs/STATUS.md` and `docs/ui/LOCAL_VISUAL_RULES.md` for authoritative current detail.
- Confirmed backlog reconciliation (2026-10-09): #76/#77/#78/#82/#83/#84 closed as not planned/superseded; #73 completed original backend package via PR #80; #74 remains completed routing/ML evidence. Only #70 in-progress integration/final gate, #71 blocked remaining browser/offline acceptance and #72 blocked remaining presentation/rehearsal remain active. Reuse PR #79 tests and PR #81 documents. Closure does not establish delivered local code or final acceptance.
- Historical Phase 4 evidence is qualified by the fresh-request browser audit; renewed cross-role/production-offline acceptance is required. Latest width-only verification: 19 frontend tests and build passed; Citizen pages visually checked, other roles not rerun.
- Completed and verified: Foundation 1–2 and Team 1–4. Phase 3 remains conditional, with runtime ML disabled.
- Phase 4 packages: PRs #65–#68 plus Ranee's Issue #64 integration corrections and gate.
- Evidence: frontend 234 passed plus lint/build; backend/integration 177 passed with real isolated MongoDB acceptance. Browser offline reload/IndexedDB queue/reconnect, conflict review, actor isolation and corrupt-cache rejection checked.
- Offline: production UI shell service worker plus actor-scoped Dexie mission/event slots. No API-response or tile caching. Dev mode needs network to reload; use production preview for true offline reload acceptance.
- Phase 5 owners: Ranee setup/release; Elle frontend browser QA; Clarence demo/presentation; Jared backend/database QA; Matthew routing/ML evidence.
- Remaining final-quality checks: dev-only undici audit warning, existing lint/bundle warnings, whole-role final regression and submission package.
- Unknown: exact course deadline, weekly capacity and any hosting/submission requirement. No deployment is approved by the phase opening.
- Authority: docs/phases/TEAM-PHASE-05.md and docs/STATUS.md.
# Weather failure repair — 2026-10-12

Local temporary-main weather diagnostics: configured backend key receives Google
HTTP 429 on current/daily/hourly endpoints; current conditions identifies a
100-request daily quota. API quota errors now retain 429/Retry-After with a
per-endpoint process-local cooldown; access-denied errors distinguish configuration
from generic transport/schema failure. Home/Advisory show fixed sanitized copy.
Ruff and frontend production build pass; automated tests not run for this repair.
Live weather remains blocked by provider quota reset/administrator action.
Keys, billing settings and database records preserved; changes remain local.
See backend README troubleshooting.
