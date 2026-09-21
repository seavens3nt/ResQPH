# Limited offline contract

**Status:** Completed and verified Phase 1 contract baseline
**Last updated:** 2026-09-22

## Supported behavior

The MVP supports only:

1. Viewing one previously synchronized assigned mission while offline.
2. Queuing at most one next-valid mission-status update for later synchronization.

## Cached mission

The client may cache mission ID, request summary, sanitized citizen details needed by the team, location, latest accepted route, current status/version, scenario/source labels, and `last_synced_at`.

The offline UI must display `Cached` or `Stale`, the last synchronization time, and a notice that conditions may have changed. Cached information must not appear live.

## Queued event

```json
{
  "event_id": "client-generated-idempotency-key",
  "mission_id": "mission-001",
  "new_status": "arrived",
  "expected_mission_version": 2,
  "client_recorded_at": "2026-09-21T04:00:00Z",
  "source": "offline-sync"
}
```

Only one event may be pending. The client must not silently replace an existing queued event.

## Reconnection behavior

1. Client sends the queued event with the same `event_id`.
2. Backend validates role, mission assignment, expected version, and transition.
3. On success, backend records the event once and returns the current mission.
4. On conflict, the client marks `Sync Failed`, preserves the attempted event for review, and displays the current server state.
5. Retry with the same `event_id` is idempotent.

## Exclusions

- Offline request creation
- Multiple queued actions
- Offline map-tile packages
- Automatic conflict merging
- Multi-device reconciliation
- Mesh, radio, satellite, or peer-to-peer communication
