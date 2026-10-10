# ResQPH rehearsal checklist and evidence record

**Owner:** Clarence. **Documentation review:** Ranee, 2026-10-06 (Asia/Manila).
**Inspected application baseline:** main `818aeee`; PR #81 updated with main.
**Status:** Documentation corrected; full team/browser rehearsal remains blocked.
**Actual group rehearsal date/participants:** Not verified. No attendance or
successful group rehearsal is asserted. The earlier 14/14 PASS log was removed
because its screenshots/logs were absent and it contradicted the merged audit.

## 1. Recorded verification — keep unlike evidence separate

| Check | Revision/environment | Result |
| --- | --- | --- |
| Local backend Ruff | PR #81 updated with main; Python 3.12 review runtime | Passed |
| Local backend + cross-layer Pytest | Same source; ordinary suite | 186 passed, 17 opt-in MongoDB cases skipped; two test-runtime deprecation warnings |
| Fresh API technical walkthrough | Same source; isolated native MongoDB 8.3 replica set; actual HTTP | Passed: create, assignment, retrieval, route-found, no-route, en-route, duplicate replay, stale 409 and invalid-input 422 |
| Frontend component/build evidence | PR #79 merged evidence record, not rerun in this docs-only review | 248 passed; lint/build passed with disclosed warnings |
| Hosted CI | Latest pushed PR revision | Check GitHub before approval; previous green run is not proof for an updated head |
| Group/browser rehearsal | Fresh same-record cross-role journey | Blocked by product defects; not performed as a successful rehearsal |
| Final slides, screenshots and backup video | Deliverable files | Not provided/verified |

Local API checks use a task-created native MongoDB replica set rather than
Docker. This does not establish that a fresh teammate's Docker setup was
rehearsed. Never combine historical/component results into a browser pass count.

The reviewer executed the API block from DEMO_SCRIPT.md on 2026-10-06 using
loopback API port `8031`, MongoDB port `27031`, replica set `resqph_pr81` and
disposable database `resqph_pr81_rehearsal_20261006`. Source before these
documentation edits: `b0ac19de6672287194ca6cec71f1603b4f13d0f2` (includes main
`818aeee`). Only the script's API base URL was changed for the isolated ports.
Actual request: `request-64c5deff734f4d64a3e248d7c85badeb`; actual mission:
`mission-43e199c4b85f4e599960692fa723fd91`. Both first and repeated en-route
calls returned the same version with one history event. No UI, offline-browser,
completion/team-release or group-attendance pass is inferred from this run.

## 2. Environment checklist — record actual observations

- [ ] Pin exact `git rev-parse HEAD`; tree clean; ML disabled.
- [ ] Dependency installation and setup work in a fresh local checkout.
- [ ] Disposable database initialized; seeded team available; no real data.
- [ ] API health responds; configured preview origin matches CORS.
- [ ] Production build uses the actual API URL; preview port is free.
- [ ] Service worker controls the page before testing disconnected reload.
- [ ] Independent role sessions work in separate tabs after #82.
- [ ] Reviewer checks captures for private data and secrets.

Unmarked means not established, not a failure hidden behind a PASS label.

## 3. Browser rehearsal matrix — pending after named repairs

| Step | Expected evidence | Current blocker/status |
| --- | --- | --- |
| Citizen creates fresh request, blank optional details | Actual 201 and request ID; draft retained after errors | PR #79 submission observation exists; fresh full rerun required |
| Coordinator queue/count/inspector/assignment | Same request, available team and returned mission ID | #76: counters/inspector mix sample and API data |
| Rescuer identity and mission route | Normal email resolves chosen team; actual request destination | #76/#82: identity mismatch and absent mission route controls |
| Accepted status -> next action | Server, displayed status, queue and history agree | #76: null summary cache rejection masks accepted update |
| Completion and readable history | Same request/mission; completion time/details; team released | #83: consistency and missing surfaces |
| Disconnected reload and one queued event | Production shell, same cached mission/event ID, second action locked | Blocked until fresh online cache works |
| Reconnect and duplicate replay | Accepted API event exactly once; queue cleared | Real API replay can be checked independently; browser rerun still needed |
| Same-team conflict and review | 409; preserved event; current server state; deliberate discard | Browser rerun after cache repair; no invented reassignment |
| Other-team/no-cache/corrupt-cache | No leakage or fabricated record | #82 plus fresh browser rerun |
| Retired features absent | Three roles only; no hazard submission/review, rescuer hotline or alternative-route UI; stored history preserved | #82 retirement; #84 closed as not planned |
| Keyboard/navigation/mobile | Focus enters/traps/restores; working navigation; 320px/desktop | #78; no blanket accessibility pass |

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for exact endpoints and recovery. Do not
replace a failing fresh request with a rich fixture just to obtain a green badge.

## 4. Recording and submission requirements

- Capture after the product repairs pass, not before.
- Narrated 1080p MP4, plus readable desktop and 320px screenshots.
- Record revision, actual request/mission/event IDs, timestamps, expected/actual
  results and failures alongside captures.
- Include controlled route/no-route, offline reload/reconnect, conflict review,
  actor isolation and completion/history.
- Store large media outside Git in the approved shared location; record its
  accessible link and checksum only after the file exists.
- Check all media for synthetic-only data, readable warnings and no credentials.
- Final slide deck, backup video, full rehearsal and #70 acceptance stay pending.
  Merging documentation does not close the runtime repair issues or accept Phase 5.

## 5. References

[Scope](../requirements/MVP_SCOPE.md) · [API](../api/API_CONTRACT.md) ·
[Lifecycle](../workflows/RESCUE_LIFECYCLE.md) · [Offline](../offline/OFFLINE_CONTRACT.md) ·
[Phase 4 historical evidence](../testing/TEAM-PHASE-04-EVIDENCE.md) ·
[Current frontend findings](../testing/TEAM-PHASE-05-FRONTEND.md) ·
[Routing/ML evidence](../testing/TEAM-PHASE-05-ROUTING-ML.md)
