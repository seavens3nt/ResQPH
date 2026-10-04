# Team Phase 4 integration evidence

**Date:** 2026-10-05 (Asia/Manila)
**Owner:** Ranee — Issue #64
**Baseline:** main `3ecedb1`, including reviewed PRs #65–#68.

## Repairs demonstrated by integration

- Strict cache history rejected actual API `mission_id` and nullable timestamp/note fields. Types/schema now accept the wire format, reject unrelated mission history and retain legacy schema-v1 records.
- Failed-event reload now supplies the latest authorized state for review.
- RescuerView uses the finished queue presentation, not an obsolete fallback.
- Vite's allow-list now includes the frontend root.
- True disconnected reload lacked an application shell. Production builds now cache index and their same-origin built JS/CSS only; API and map resources are excluded.

## Automated checks

Frontend: `npm ci; npm run lint; npm test -- --run; npm run build`: **234 tests passed**, lint/build passed. Existing four lint warnings and large-bundle warning are disclosed.

Backend/integration: Ruff passed. **177 passed across two commands**, with `RUN_MONGODB_INTEGRATION=1` on MongoDB 8.3.7 isolated replica set at port 27019. The general suite has 176 tests; the existing full-API test uses a separate disposable prefix and passes independently. All **15 offline MongoDB tests** ran, not skipped, covering unique index, same-ID/concurrent replay, loss of response, changed payload, stale/invalid transitions, wrong/reassigned actor and atomic rollback.

## Real browser + API + IndexedDB + MongoDB

Production preview port 5189; real FastAPI port 8014; task-created synthetic database. Existing database on 27017 was untouched.

| Acceptance | Observed evidence |
|---|---|
| Cache/reload | Synthetic mission en-route, version 2 read from IndexedDB; dashboard reloaded with browser network disabled |
| One queued event | Event `f1f25f93-015e-4ec8-b47c-697ec1b34c87`, expected version 2, retained byte-identical body and ID after disconnected reload |
| Accepted replay | Reconnection produced arrived/version 3; IndexedDB queue cleared; API history contains that ID, mission_id and null note |
| Durable acceptance | MongoDB event count and mission history count both 1 |
| Conflict/reload | Queued completion `f1b60d41-d66e-40a4-8db9-2453139e7b33` at version 4; controlled server bump to 5; stale-version rejection preserved failed entry and displayed arrived/version 5 after reload |
| Queue lock | Failed event kept mission action locked pending explicit review/discard |
| Actor isolation | Switching to rescuer-beta while disconnected showed Mission unavailable offline, not alpha's record |
| Corrupt storage | Deliberately invalid schema version rejected on disconnected reload with explicit storage error; no invented mission |
| UI accessibility | PR #68 real-browser keyboard retry/discard, visible focus and 320px panels without overflow; regression tests retained |

Quota/unavailable storage and network/503 recovery are covered by controller negative tests; real IndexedDB corruption was also exercised. No claim that all browser quota policies or all physical devices were tested.

## Reproduction

Use a disposable replica set, never a real-data database. From backend, set `RUN_MONGODB_INTEGRATION=1`, explicit replica-set `MONGODB_INTEGRATION_URI` and fresh `resqph_issue62_offline_<suffix>` database. Run `python -m pytest tests ../tests/integration -k "not test_full_fastapi_request_to_assignment_slice_against_mongodb"`. Run that excluded test separately with a fresh `resqph_issue15_api_test_<suffix>` database and matching app `MONGODB_URI/MONGODB_DATABASE`.

For true offline browser reload, build then run `npm run preview`; first visit online and allow the service worker to install. With an assigned synthetic rescuer mission, disconnect, queue a next-valid transition, reload, verify unchanged event ID/version, reconnect and inspect both IndexedDB and server event history. Corrupt only task-created browser records when exercising failure cases.

## Remaining final-quality work

The jsdom-to-undici development dependency audit warning, existing lint warnings and large bundle are assigned to Phase 5. Maps provider migration and external-model runtime activation remain deferred. Passing this gate is not deployment or submission acceptance.
