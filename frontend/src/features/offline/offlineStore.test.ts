import { describe, expect, it } from 'vitest'
import type { MissionDetail, OfflineQueueEntry } from '../../api/missions'
import { recoverInterruptedEntry, validateCacheRecord, validateQueueEntry } from './offlineStore'

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
    expect(validateCacheRecord({ ...record, schema_version: 2 }, 'rescuer-alpha')).toBe(false)
    expect(validateCacheRecord({ ...record, mission: { ...mission, status: 'unknown' } }, 'rescuer-alpha')).toBe(false)
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
