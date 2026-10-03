# Locked offline implementation boundary

**Status:** Ready to start
**Owner:** Ranee
**Locked fixture:** `data/samples/offline-mission.example.json`

## Storage and client contract

Reuse `MissionDetail`, `OfflineQueueEntry`, `StatusEventBody` and
`nextValidStatus` from `frontend/src/api/missions.ts`.
Use Dexie/IndexedDB (already installed), one actor-scoped mission slot and one
actor-scoped pending-event slot. Schema version is 1.

Cache record: `{ schema_version: 1, actor_id, last_synced_at, mission }`.
Queue record: `OfflineQueueEntry`, with `localId === body.event_id`.
Only server-confirmed data enters the mission slot. Use a transaction to
reject a second event and to clear a successfully acknowledged event while
updating the mission. Failed events count toward the single-event limit.

Reload recovers an interrupted `syncing` entry as `pending`, using the same ID.
Do not persist simulated contacts beyond the sanitized mission summary.
Account change must prevent replay under a different actor.
No dependency installation or architecture replacement is needed.

## Locked presentation inputs

Existing `RescuerMissionCard` props remain the interface: mission, lastSyncedAt,
isStale, isAdvancing and onAdvanceStatus. Clarence may add optional props
`isCached?: boolean` and `isQueueLocked?: boolean`, default false, so existing
callers remain compatible. The controller sets queue locking explicitly.

Existing `RescuerOfflineQueue` props remain the interface: entry, isOffline,
onRetrySync and onDismissFailed. Optional `currentServerMission?: MissionDetail | null`
and `storageError?: string | null` disclose verified state and persistence failures.
Never say current server state was fetched unless the parent provides it.

Elle owns network/storage operations and `RescuerView.tsx`; Clarence owns
prop-driven presentation and no network requests. Both can test against the
locked fixture without waiting for each other.

## Backend wire contract

- GET `/api/v1/missions/{mission_id}`: latest authorized mission.
- POST `/api/v1/missions/{mission_id}/status-events`: send only the queued `body`.
- Headers: existing `X-Demo-User-Id`, `X-Demo-Role: rescuer`.
- 200: accepted/current mission; retry same event ID returns current mission without duplicate history.
- 409: existing error envelope; fetch latest authorized mission separately.
- 403/404: unauthorized/unavailable assignment; preserve attempted event for review.
- Network/503: retain pending event and original key.
- Valid sequence: assigned -> en-route -> arrived -> completed.

Existing transaction and unique-event index are authoritative. Do not add a
batch-sync endpoint or alter lifecycle semantics.

## Acceptance cases

1. Sync and cache one mission; disconnect; reload; view Cached/Stale with last sync time.
2. Queue next valid event; reload; second event is rejected without replacement.
3. Reconnect; accept exactly once; replace cache from 200 and clear acknowledged event.
4. Drop response after server commit; retry same ID; history still has one event.
5. Change server version; replay yields 409; event is preserved and current server state shown.
6. Different actor cannot replay or read another actor's stored record.
7. Network/503 leaves Pending Sync; quota/corrupt-storage error is explicit.
8. Empty offline cache shows unavailable, with no invented mission/map/route.

