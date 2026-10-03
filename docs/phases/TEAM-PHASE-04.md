# Team Phase 4 — Limited Offline Support

**Status:** Ready to start
**Gate owner:** Ranee
**Entry baseline:** merged PR #58, `8f2a7ea`; Team Phase 3 approved with conditions.

## Goal and locked scope

Persist one assigned mission and at most one next-valid status event across
reloads. Reconnect using the same event ID, update the cache only from the
accepted server response, and preserve failed events for explicit review.

No offline request creation, tile downloads, multiple-event queue, automatic
conflict merge, model activation, or new authentication is included.

## Authoritative inputs

- `docs/offline/OFFLINE_CONTRACT.md`
- `docs/offline/OFFLINE_IMPLEMENTATION.md`
- `data/samples/offline-mission.example.json`
- `frontend/src/api/missions.ts`
- `backend/app/schemas/missions.py`
- `docs/workflows/RESCUE_LIFECYCLE.md`
- `docs/ui/UI_STATES.md`

The backend's existing mission GET and status-event POST are the sync boundary.
Use the accepted fixture and mocked API responses until implementation changes
are merged. Members pull reviewed `main`; no personal handoff or peer approval.

## Independent ownership

| Owner | Complete package | Exact boundary |
|---|---|---|
| Elle | Durable one-mission cache, single event queue, synchronization hook and rescuer wiring | New offline storage/controller modules and `RescuerView.tsx` |
| Clarence | Accessible cached/stale/pending/syncing/failed presentation | Existing rescuer cards/queue, indicator and their component tests |
| Jared | Offline retry, assignment, version, atomic history and MongoDB acceptance | New backend offline-sync tests and only necessary mission-layer repairs |
| Matthew | Repeatable offline API acceptance scenarios and demo checklist | New cross-component acceptance test and offline evidence matrix |
| Ranee | Review, integration, setup and gate | Locked inputs, CI, integration corrections, evidence/status/context |

Elle resumes her permanent frontend role. Ranee's temporary coverage has ended.

## Required behavior and output

- One sanitized assigned mission is readable after reload without a network response.
- Cache and event storage are scoped to the simulated actor; logout/account switch clears or isolates them.
- Cache labels show last synchronization time and warn that conditions may have changed.
- A queued status event keeps its ID, expected version, source and client time across reload/retry.
- A second event cannot silently replace the first; no optimistic accepted status is shown.
- Only one sync request is in flight. A lost response can retry the same event safely.
- On 409, preserve the attempted event, retrieve current server state, show Sync Failed,
  and require explicit discard/review. Never create a new ID to bypass conflict.
- Transport/503 failures remain pending and recoverable; assignment/403 errors block sync.
- Quota/unavailable/corrupt storage errors are visible; never claim persistence after a failed write.
- Stored route results retain scenario/source labels; no tiles or live data are claimed cached.

## Exit gate

Ranee verifies reload persistence, single-event enforcement, accepted replay once,
lost-response retry, stale-version conflict, wrong actor, offline/no-cache,
storage failure and truthful accessible UI. Relevant frontend/backend/integration
checks and the disposable MongoDB evidence must pass. Record the gate only after
accepted packages are merged; Team Phase 5 opens afterward.

