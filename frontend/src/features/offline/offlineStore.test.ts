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
})
