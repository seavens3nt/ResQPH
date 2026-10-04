# Team Phase 4 Offline Acceptance Scenarios

**Evidence date:** 2026-10-04 (Asia/Manila).
**Scope:** Issue #63; tests/evidence only. This is not a Phase 4 completion gate.

## Repeatable API acceptance

The tests use the production mission router, Pydantic request/response models
and `MissionService`. Only repository persistence is replaced by test-owned
in-memory adapters. No transition, authorization or replay logic is duplicated
in a mock service. A fresh FastAPI app is used per test, so dependency overrides
cannot leak into other tests.

Locked input: [offline fixture](../../data/samples/offline-mission.example.json).
Rules: [offline implementation](../offline/OFFLINE_IMPLEMENTATION.md) and
[phase guide](../phases/TEAM-PHASE-04.md).

From `backend/`, with its configured environment:

```powershell
.\.venv\Scripts\python.exe -m ruff check app tests ..\tests\integration
.\.venv\Scripts\python.exe -m pytest ..\tests\integration\test_team_phase4_offline_flow.py -v
.\.venv\Scripts\python.exe -m pytest tests ..\tests\integration -q
```

Verified with Python 3.12.10: **15 acceptance cases passed**;
broader backend/integration suite **136 passed, 2 skipped**. Ruff passed.
The skipped MongoDB tests are not a persistence pass.

| API scenario | Expected and verified result | Test evidence |
|---|---|---|
| Accepted offline event | 200; en-route -> arrived; version 2 -> 3; exactly one history item, original source/client time/actor/mission IDs | `test_accepted_offline_event` |
| Discarded first response, unchanged replay | Same 200 representation, version/history unchanged; models a missing response, not an induced wire-level drop | `test_duplicate_replay_after_dropped_response` |
| Stale version | 409 `stale_mission_version`; stores unchanged | `test_stale_version_conflict` |
| Wrong actor / role | 403; no mutation, including citizen/volunteer/unknown role | `test_wrong_actor_forbidden`, `test_wrong_role_does_not_mutate` (3 cases) |
| Changed status/source with accepted ID | 409 `duplicate_event`; no mutation | `test_conflicting_reuse_of_event_id_does_not_mutate` (2 cases) |
| Invalid transition | 409 `invalid_transition`; no mutation | `test_invalid_transition_does_not_mutate` |
| Completion replay | Completed/version 4/two history entries stay unchanged on retry | `test_completed_event_retry_preserves_terminal_history` |
| Authorized refresh after conflict | GET returns current arrived/version 3; other rescuer gets 404 | `test_authorized_refresh_after_conflict` |
| Controlled storage outage | 503 error envelope; no mutation | `test_503_repository_outage_does_not_mutate` |
| Event-write failure | Harness rollback; same original payload succeeds once storage recovers | `test_event_write_failure_rolls_back_then_same_payload_can_retry` |
| Invalid version | 422 validation envelope; no mutation | `test_schema_validation_does_not_mutate` |

## Browser acceptance matrix

Runtime baseline: merged PR #65, `e19d215`. Browser statuses below are not inferred
from Python or component tests. API harness evidence does not establish browser
persistence, MongoDB indexes, isolation or real transaction behavior.

| Scenario | Exact steps and required outcome | Evidence/status |
|---|---|---|
| Cache reload | Fetch a sanitized mission; disconnect API; reload with frontend assets available. Show Cached/Stale, last sync time and controlled-source notice. Full network-offline app-shell loading must be assessed separately. | Not verified with the actual wire-shaped response in this review |
| Queue reload | Queue next-valid status; reload. Compare the entire body plus localId, missionId and enqueue time; no second event is invented. | Not verified in this review |
| Second-event lock | Try advancing while pending/failed. Existing ID/body stay unchanged and action is disabled. | Not verified in this review |
| Interrupted sync | Interrupt after server commit; reload; replay original ID/body; exactly one server history event and no remaining local slot after acceptance. | Not verified; accepted-response compatibility currently fails (see blocker below) |
| Failed storage | Inject quota/unavailable/corrupt IndexedDB failure. Visible error; no claim of cached success and no send after failed queue write. | Not verified in this review |
| No-cache | Fresh actor/storage, API disconnected. No invented cached mission, map or route; reconnect instructions shown. | Not verified in this review |
| 503 / transport | Return 503 or drop transport before acceptance. Preserve original event as **Pending Sync**, retain payload and permit same-ID retry; do not convert transient failure into review-only Sync Failed. | Not verified in this review |
| 409 conflict | Reject stale event; fetch authorized current state; preserve attempted ID/version; show Sync Failed; require explicit review/discard. Never manufacture a new event ID to bypass conflict. | Not verified in this review |
| Actor switch | With a pending event, change actor/logout and reload. Old data remain isolated; no replay under new actor and no late response alters its state. | Not verified in this review |
| Actual accepted API response | Use serialized real router/service output, not a simplified history mock. 200 should atomically cache accepted mission and remove the local slot. | **Failed / reproduced** on merged frontend baseline; API event is accepted but local slot remains Pending and cached version remains 2 |

## Reproduced integration defect — acceptance is not complete

The real API serializes each `status_history` item with `mission_id` and a
nullable `note` (the locked event has no note, so the response contains
`note: null`). The current strict schema in
`frontend/src/features/offline/offlineStore.ts` does not allow `mission_id`
and expects an optional string note rather than null.

Repeatable reproduction:

1. Use the locked fixture with the real router/service repository harness to
   obtain initial GET and accepted status-event POST representations.
2. In an isolated Edge browser with actual Dexie/IndexedDB, serve those
   representations through controlled API transport; preserve the client event
   ID in the accepted history item.
3. Load the initial en-route/version-2 mission and advance to arrived.
4. Observe `Accepted server mission failed actor/record validation.`
   The server representation is arrived/version 3, but the local event remains
   pending and the mission cache stays at version 2.

This browser reproduction passed as a **defect detection**, not as successful
offline acceptance. No page runtime errors were observed. Frontend assets
remained online; there was no live MongoDB. The real API's serialized shape,
not simplified prior browser mocks, was used.

Repair requires the frontend cache/type boundary to accept and preserve valid
wire fields and nullable values, with real-shape regression coverage. Those
runtime files are outside Issue #63's three owned files, so this PR records
the defect for Ranee's integration repair rather than silently modifying them.
**Do not approve the Team Phase 4 gate until repaired replay and the remaining
browser/disposable-MongoDB evidence pass.**

## Remaining evidence boundaries

- In-memory repository rollback is not proof of MongoDB atomicity, indexes or concurrent writes.
- Fully disconnected app-shell loading/service-worker delivery is not verified.
- Browser rows without executed evidence stay Not verified, even when unit tests pass.
- No model, routing, offline tiles, authentication or locked fixture changes.
