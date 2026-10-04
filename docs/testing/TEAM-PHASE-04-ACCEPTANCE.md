# Team Phase 4 Offline Acceptance Scenarios

## Objective
Independent cross-component mission API replay checks and an exact browser acceptance matrix for the bounded offline MVP.

## API Harness Evidence

### Environment
- **Python:** 3.12.10
- **Framework:** FastAPI + Pytest + TestClient
- **Fixture:** `data/samples/offline-mission.example.json` (locked, schema v1)
- **Execution:** `pytest tests/integration/test_team_phase4_offline_flow.py -v`

### Test Results
| ID | Scenario | Expected Status | Actual Status | Evidence |
|---|---|---|---|---|
| API-01 | Accepted offline event | 200 OK, version+1, history+1 | 200 OK | `test_accepted_offline_event PASSED` |
| API-02 | Duplicate replay (idempotency) | 200 OK, version same, history same | 200 OK | `test_duplicate_replay_after_dropped_response PASSED` |
| API-03 | Stale-version conflict | 409 Conflict | 409 Conflict | `test_stale_version_conflict PASSED` |
| API-04 | Wrong actor | 403 Forbidden | 403 Forbidden | `test_wrong_actor_forbidden PASSED` |

## Browser Acceptance Matrix

*Note: Browser rows are honestly marked "Not verified" pending the merged frontend Dexie/IndexedDB implementation, per task instructions.*

| Scenario | Expected Browser Outcome | Status |
|---|---|---|
| Cache reload | Mission loads from IndexedDB with `Cached`/`Stale` label and `last_synced_at` timestamp. No live data claimed. | Not verified |
| Queue reload | Pending event recovers with same `localId`, `expected_mission_version`, and `source: offline-sync`. | Not verified |
| Second-event lock | UI prevents queuing a second event; existing pending event is preserved. | Not verified |
| Interrupted sync | Lost response retains pending event; retry uses same `event_id`. | Not verified |
| Failed storage | Quota/corrupt DB error is visible; never claims persistence after failed write. | Not verified |
| No-cache | Empty state shows no mission; requires explicit sync to populate. | Not verified |
| 503 (Transport) | Retains pending event and original key; marks `Sync Failed` temporarily. | Not verified |
| 409 (Conflict) | Preserves attempted event, fetches current server state, shows `Sync Failed`, requires explicit discard/review. Never creates new ID. | Not verified |
| Actor switch | Logout/account switch clears or isolates mission slot; prevents replay under different actor. | Not verified |

## Limitations
- API tests use a mock service harness (`MockMissionState` via `app.dependency_overrides`) to isolate replay logic from MongoDB state without editing application modules.
- Browser acceptance requires the merged `frontend` Dexie implementation to execute.
- No ML, routing, or tile caching changes were made.