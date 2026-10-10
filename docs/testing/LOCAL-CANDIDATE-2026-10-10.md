# Local candidate verification — 2026-10-10

Branch: `feature/local-desktop-role-workspaces`. This is not final acceptance or deployment approval.

## Cleanup

- Source-scoped frontend lint; duplicate ignore entries removed; local test scratch and visual captures excluded.
- Account laptop/large-monitor rules consolidated into sizing variables without changing their dimensions.
- Eight unused, unregistered Volunteer/report files archived outside the checkout, not destroyed. Historical database records remain intact.
- Superseded local preview instructions replaced with current three-role and informational-weather scope.
- CORS acceptance tests the configured allowlist instead of hard-coding a developer port; rejection of an untrusted origin remains checked.
- Initial hosted CI exposed Python-target-dependent lint differences. UTC aliases/imports and UTC timestamp parsing were updated for the approved Python 3.12 baseline; CI now specifies that target explicitly. Regression remained 201 passed/28 skipped after this change.

## Fresh verification

- Frontend: 340 tests across 46 files passed; production build passed. Lint passes with four existing warnings (three mixed component exports and one landing-page effect).
- Backend/cross-component default suite: 201 passed, 28 optional checks skipped; Ruff passed.
- Real-MongoDB journey: 5 passed in uniquely named disposable databases. Covers request, assignment, route, mission progression/history/team release, cancellation/atomic rollback, identity guards, and retired endpoints preserving records. Counts overlap the default suite's collected cases.
- Initial sandbox runs encountered socket/file permission errors. Successful reruns used localhost permission and fresh disposable temp paths, not weakened validation.
- Browser: synthetic Citizen login, same-route rescue modal, review before submission, API-confirmed submission to My Requests, status popup, Escape/focus return, and cancellation closing the popup with page feedback.
- Rescuer Account and Dispatcher overview/Account rendered with the shared shell. Not an exhaustive visual review of all role states.

## Initial release gates (superseded by the follow-up evidence below)

### Continuation evidence

- GitHub CI passed all three jobs (frontend, backend, ML evidence) for commit `550eb8b`, run `38048534500`.
- A separate production build on port 5193 and API on 8034 use a new native MongoDB replica set on 27034, database `resqph_release_browser_20261010_1930`. Existing preview data was not modified.
- First production tab rendered and submitted a synthetic request on retry; the first attempt showed preserved-draft transport failure and no POST in the API log. Its cause is not established.
- A second production login tab remained blank after one reload. Its DOM contained the expected root/script/style elements but no mounted application. Direct HTTP checks returned 200 for the 853,071-byte JavaScript asset and the expected CORS allowlist. Browser error capture returned no entries. This does not establish whether the cause is application/service-worker behavior or the embedded browser environment.
- Stop gate: reproduce the blank production page in a regular browser and inspect its Console/Network before declaring reload/offline acceptance. Do not merge merely because CI passed.

- Fresh production-build offline reload, one queued status update, reconnect/replay, durable server state and conflict recovery need browser verification. Development-server and unit-test results do not replace this.
- Fresh cross-role browser assignment-to-completion is incomplete in this run: all three preview teams were assigned and existing missions were left untouched. Use an isolated seeded preview.
- Teammate review and hosted CI remain separate gates. Keep the PR draft until outstanding acceptance is resolved.
- Build reports an approximately 853 kB JavaScript chunk; dependencies emit Starlette/HTTPX deprecation warnings. Runtime ML remains disabled.

The synthetic Citizen request created during verification was cancelled through its own UI.
No existing preview mission was cancelled/completed, and no deployment or issue closure was performed.

## Startup repair and isolated browser acceptance follow-up

- Reproduced the blank page with the production preview stopped. Temporary startup diagnostics identified failed JavaScript and CSS assets despite a controlled service worker. Those diagnostics were removed before delivery.
- The preview serves `Vary: Origin`; precache and module requests can differ in their Origin headers. Matching the strictly allowlisted public shell/build assets with `ignoreVary: true` resolved the reproduced outage reload. Content-hashed assets are cache-first; denied cache access/write failures cannot convert a successful network response into a failed load. HTTP error responses can use an existing cached copy. API requests, submissions, arbitrary resources and cross-origin tiles remain excluded.
- Reopened the production rescuer dashboard with both frontend and API stopped; cached mission data was marked possibly stale. Queued one arrival update, reloaded while both servers remained stopped, and observed the same pending event. After restarting services, Retry Sync Now produced server-confirmed Arrived. An earlier en-route event also persisted and replayed after API recovery.
- Isolated browser journey completed: synthetic Citizen request -> Dispatcher assignment to the available test team -> Rescuer route evaluation (98 m, rule-based fallback) -> en-route -> arrived -> completion with sanitized notes. MongoDB readback confirmed mission version 4/completed, request history pending/assigned/en-route/arrived/completed, and team-alpha available with no assigned mission.
- This exercised origin/API outages, not an operating-system network disconnect; the browser's network indicator remained online. Offline conflict cases remain covered by automated tests, not a new manual conflict exercise.
- Final frontend suite: 349 passed across 46 files; lint passes with the same four existing warnings; production build passes with the existing large-chunk warning. Backend code is unchanged by this startup repair; earlier backend/real-MongoDB results above still apply.
- Fresh production login rendered without manual refresh. The repaired cache mismatch explains the reproduced unavailable-origin blank screen; it does not prove the cause of every earlier intermittent transport failure.
- GitHub main uses a ruleset requiring one approving code-owner review. PR #86 has a review request for Elle; approval and merge are still separate from the completed local repair. Do not bypass that rule. No deployment or issue closure is authorized by this verification.
