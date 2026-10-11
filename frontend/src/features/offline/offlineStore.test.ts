import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { MissionDetail, OfflineQueueEntry } from '../../api/missions'
import { acknowledgeEvent, readMission, readQuarantined, recoverInterruptedEntry, resetOfflineDatabaseForTests, validateCacheRecord, validateQueueEntry, writeMission } from './offlineStore'

const mission: MissionDetail = {
  id: 'mission-offline-001', request_id: 'request-offline-001', team_id: 'rescuer-alpha',
  assigned_rescuer_id: 'rescuer-alpha', status: 'en-route', version: 2,
  assigned_at: '2026-10-04T00:00:00Z', created_at: '2026-10-04T00:00:00Z', updated_at: '2026-10-04T00:00:00Z',
  request_summary: null, status_history: [], data_source: 'synthetic', sync_status: 'synced',
}

const event: OfflineQueueEntry & { actor_id: string } = {
  actor_id: 'rescuer-alpha', localId: 'event-1', missionId: mission.id,
  body: { event_id: 'event-1', new_status: 'arrived', expected_mission_version: 2, client_recorded_at: '2026-10-04T00:05:00Z', source: 'offline-sync' },
  syncState: 'pending', enqueuedAt: '2026-10-04T00:05:00Z',
}

describe('offline record validation', () => {
  it('caches a fresh API mission with omitted optional request details', () => {
    const record = {schema_version: 1, actor_id: 'rescuer-alpha', last_synced_at: mission.updated_at,
      mission: {...mission, request_summary: {headcount: 2, vulnerabilities: [], medical_needs: false, reported_flood_level: 'unknown',
        location: {address: 'Synthetic U-Belt test', point: {type: 'Point', coordinates: [120.9946, 14.6042]}, landmark: null, description: null},
        situation_summary: null}}}
    expect(validateCacheRecord(record, 'rescuer-alpha')).toBe(true)
  })
  it('accepts actual API history fields and nulls but rejects unrelated history', () => {
    const history = { event_id: 'accepted', mission_id: mission.id, prior_status: 'assigned',
      new_status: 'en-route', actor_id: 'rescuer-alpha', actor_role: 'rescuer', source: 'online',
      client_recorded_at: null, server_recorded_at: mission.updated_at, note: null }
    const record = { schema_version: 1, actor_id: 'rescuer-alpha', last_synced_at: mission.updated_at,
      mission: { ...mission, status_history: [history] } }
    expect(validateCacheRecord(record, 'rescuer-alpha')).toBe(true)
    expect(validateCacheRecord({ ...record, mission: { ...record.mission,
      status_history: [{ ...history, mission_id: 'unrelated' }] } }, 'rescuer-alpha')).toBe(false)
  })
  it('accepts schema-v1 mission records only for their actor and valid mission data', () => {
    const record = { schema_version: 1, actor_id: 'rescuer-alpha', last_synced_at: '2026-10-04T00:00:00Z', mission }
    expect(validateCacheRecord(record, 'rescuer-alpha')).toBe(true)
    expect(validateCacheRecord(record, 'rescuer-beta')).toBe(false)
    expect(validateCacheRecord({ ...record, schema_version: 2 }, 'rescuer-alpha')).toBe(true)
    expect(validateCacheRecord({ ...record, mission: { ...mission, status: 'unknown' } }, 'rescuer-alpha')).toBe(false)
  })

  it('validates station missions against the authenticated account cache key and station team identity', () => {
    const record = { schema_version: 2, actor_id: 'account-7', last_synced_at: mission.updated_at,
      mission: { ...mission, station_id: 'station-7', tracking_state: { status: 'running' } } }
    expect(validateCacheRecord(record, 'account-7', 'station-7', 'rescuer-alpha')).toBe(true)
    expect(validateCacheRecord(record, 'other-account', 'station-7', 'rescuer-alpha')).toBe(false)
    expect(validateCacheRecord(record, 'account-7', 'another-station', 'rescuer-alpha')).toBe(false)
    expect(validateCacheRecord(record, 'account-7', 'station-7', 'another-team')).toBe(false)
  })

  it('rejects corrupt queue entries and recovers interrupted syncing without changing the event', () => {
    expect(validateQueueEntry(event, 'rescuer-alpha')).toBe(true)
    expect(validateQueueEntry(event, 'rescuer-beta')).toBe(false)
    expect(validateQueueEntry({ ...event, localId: 'different' }, 'rescuer-alpha')).toBe(false)
    const interrupted = { ...event, syncState: 'syncing' as const }
    const recovered = recoverInterruptedEntry(interrupted)
    expect(recovered).toEqual({ ...event, syncState: 'pending' })
    expect(recovered.body).toBe(interrupted.body)
    expect(recovered.localId).toBe(interrupted.localId)
  })

  it.each([0, -1, 1.5, NaN])('rejects invalid event version %s', (version) => {
    expect(validateQueueEntry({ ...event, body: { ...event.body, expected_mission_version: version } }, 'rescuer-alpha')).toBe(false)
  })

  it('rejects malformed nested history without throwing and rejects another assigned actor', () => {
    const record = { schema_version: 1, actor_id: 'rescuer-alpha', last_synced_at: mission.updated_at, mission }
    expect(validateCacheRecord({ ...record, mission: { ...mission, status_history: [null] } }, 'rescuer-alpha')).toBe(false)
    expect(validateCacheRecord({ ...record, mission: { ...mission, assigned_rescuer_id: 'someone-else' } }, 'rescuer-alpha')).toBe(false)
  })
})

describe('offline persistence against current API records', () => {
  it('stores and restores account-keyed station mission fields with stable team identity', async () => {
    await resetOfflineDatabaseForTests()
    const apiMission: MissionDetail = {
      ...mission,
      station_id: 'sampaloc-fire-station',
      tracking_state: { status: 'running', started_at: mission.updated_at },
      request_summary: {
        location: { address: 'Synthetic location', point: { type: 'Point', coordinates: [120.9946, 14.6042] } },
        headcount: 2, vulnerabilities: [], medical_needs: false, reported_flood_level: 'unknown',
        reported_severity: 'low', situation_summary: null,
      },
    }
    const cached = await writeMission('account-7', apiMission, 'sampaloc-fire-station', 'rescuer-alpha')
    const restored = await readMission('account-7', 'sampaloc-fire-station', 'rescuer-alpha')
    expect(cached.schema_version).toBe(2)
    expect(restored?.mission.station_id).toBe('sampaloc-fire-station')
    expect(restored?.mission.team_id).toBe('rescuer-alpha')
    expect(restored?.mission.tracking_state).toEqual(apiMission.tracking_state)
    expect(restored?.mission.request_summary?.reported_severity).toBe('low')
    await expect(readMission('other-account', 'sampaloc-fire-station', 'rescuer-alpha')).resolves.toBeNull()
  })

  it('acknowledges a queued event only when its exact event ID is in authoritative history', async () => {
    await resetOfflineDatabaseForTests()
    const queued: OfflineQueueEntry & { actor_id: string } = {
      ...event, actor_id: 'account-7', localId: 'accepted-event',
      body: { ...event.body, event_id: 'accepted-event', new_status: 'arrived' },
    }
    const { enqueueEvent, readQueue } = await import('./offlineStore')
    await enqueueEvent('account-7', queued)
    const accepted: MissionDetail = {
      ...mission, status: 'arrived', version: 3, station_id: 'sampaloc-fire-station',
      status_history: [{ event_id: queued.localId, mission_id: mission.id, prior_status: 'en-route',
        new_status: 'arrived', actor_id: 'rescuer-alpha', actor_role: 'rescuer', source: 'offline-sync',
        server_recorded_at: mission.updated_at }],
    }
    await acknowledgeEvent('account-7', queued.localId, accepted, 'sampaloc-fire-station', 'rescuer-alpha')
    expect(await readQueue('account-7')).toBeNull()
    expect((await readMission('account-7', 'sampaloc-fire-station', 'rescuer-alpha'))?.mission.version).toBe(3)
  })

  it('quarantines an incompatible queue without deleting its recovery record', async () => {
    await resetOfflineDatabaseForTests()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('resqph-offline-v1')
      opening.onsuccess = () => resolve(opening.result)
      opening.onerror = () => reject(opening.error)
    })
    const transaction = database.transaction('queues', 'readwrite')
    transaction.objectStore('queues').put({ actor_id: 'account-7', localId: 'broken', missionId: 'mission-1', body: null })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    await expect((await import('./offlineStore')).readQueue('account-7')).rejects.toThrow(/quarantined/)
    const recovery = await readQuarantined('account-7')
    expect(recovery).toHaveLength(1)
    expect(recovery[0].kind).toBe('queue')
    expect((recovery[0].record as { localId: string }).localId).toBe('broken')
  })
})
