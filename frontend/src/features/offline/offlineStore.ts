import Dexie, { type Table } from 'dexie'
import type { MissionDetail, OfflineQueueEntry } from '../../api/missions'

export interface OfflineMissionRecord {
  schema_version: 1
  actor_id: string
  last_synced_at: string
  mission: MissionDetail
}

interface OfflineActorRecord {
  actor_id: string
}

class ResQPHOfflineDatabase extends Dexie {
  missions!: Table<OfflineMissionRecord, string>
  queues!: Table<OfflineQueueEntry & OfflineActorRecord, string>

  constructor() {
    super('resqph-offline-v1')
    this.version(1).stores({ missions: '&actor_id', queues: '&actor_id' })
  }
}

const database = new ResQPHOfflineDatabase()

function requireIndexedDb(): void {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is unavailable; offline persistence is disabled.')
}

function validMission(value: unknown): value is MissionDetail {
  if (!value || typeof value !== 'object') return false
  const mission = value as Partial<MissionDetail>
  const allowedMissionKeys = ['id', 'request_id', 'team_id', 'assigned_rescuer_id', 'status', 'version', 'assigned_at', 'created_at', 'updated_at', 'request_summary', 'status_history', 'latest_route_result', 'data_source', 'sync_status', 'completed_at']
  if (Object.keys(value).some((key) => !allowedMissionKeys.includes(key))) return false
  const summary = mission.request_summary
  const summaryKeys = ['location', 'headcount', 'vulnerabilities', 'medical_needs', 'medical_details', 'reported_flood_level', 'situation_summary', 'fixture_notice']
  if (summary && (typeof summary !== 'object' || Object.keys(summary).some((key) => !summaryKeys.includes(key)))) return false
  if (summary && (
    !summary.location || Object.keys(summary.location).some((key) => !['address', 'point', 'landmark', 'description'].includes(key)) ||
    typeof summary.location.address !== 'string' || !summary.location.point ||
    Object.keys(summary.location.point).some((key) => !['type', 'coordinates'].includes(key)) ||
    summary.location.point.type !== 'Point' || !Array.isArray(summary.location.point.coordinates) || summary.location.point.coordinates.length !== 2 ||
    !summary.location.point.coordinates.every(Number.isFinite) ||
    typeof summary.headcount !== 'number' || !Array.isArray(summary.vulnerabilities) ||
    typeof summary.medical_needs !== 'boolean' || typeof summary.reported_flood_level !== 'string' ||
    typeof summary.situation_summary !== 'string'
  )) return false
  return typeof mission.id === 'string' && mission.id.length > 0 &&
    typeof mission.request_id === 'string' && typeof mission.team_id === 'string' &&
    typeof mission.version === 'number' && Number.isInteger(mission.version) && mission.version >= 1 &&
    Number.isFinite(Date.parse(mission.assigned_at ?? '')) &&
    Number.isFinite(Date.parse(mission.created_at ?? '')) &&
    Number.isFinite(Date.parse(mission.updated_at ?? '')) &&
    ['assigned', 'en-route', 'arrived', 'completed', 'cancelled'].includes(String(mission.status)) &&
    Array.isArray(mission.status_history) && mission.status_history.every((item) =>
      Object.keys(item).every((key) => ['event_id', 'prior_status', 'new_status', 'actor_id', 'actor_role', 'source', 'client_recorded_at', 'server_recorded_at', 'note'].includes(key)) &&
      typeof item.event_id === 'string' && typeof item.actor_id === 'string' &&
      ['assigned', 'en-route', 'arrived', 'completed', 'cancelled'].includes(item.prior_status) &&
      ['assigned', 'en-route', 'arrived', 'completed', 'cancelled'].includes(item.new_status) &&
      ['online', 'offline-sync'].includes(item.source) && Number.isFinite(Date.parse(item.server_recorded_at)),
    ) && typeof mission.data_source === 'string' && typeof mission.sync_status === 'string'
}

export function validateCacheRecord(value: unknown, actorId: string): value is OfflineMissionRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<OfflineMissionRecord>
  if (Object.keys(value).some((key) => !['schema_version', 'actor_id', 'last_synced_at', 'mission'].includes(key))) return false
  return record.schema_version === 1 && record.actor_id === actorId &&
    typeof record.last_synced_at === 'string' && Number.isFinite(Date.parse(record.last_synced_at)) &&
    validMission(record.mission)
}

export function validateQueueEntry(value: unknown, actorId: string): value is OfflineQueueEntry & OfflineActorRecord {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<OfflineQueueEntry & OfflineActorRecord>
  const entryKeys = ['actor_id', 'localId', 'missionId', 'body', 'syncState', 'failureReason', 'enqueuedAt']
  const bodyKeys = ['event_id', 'new_status', 'expected_mission_version', 'client_recorded_at', 'source', 'note']
  return Object.keys(value).every((key) => entryKeys.includes(key)) &&
    Boolean(entry.body && Object.keys(entry.body).every((key) => bodyKeys.includes(key))) &&
    entry.actor_id === actorId && typeof entry.localId === 'string' &&
    entry.localId === entry.body?.event_id && typeof entry.missionId === 'string' &&
    typeof entry.body?.expected_mission_version === 'number' &&
    entry.body.source === 'offline-sync' && Number.isFinite(Date.parse(entry.body.client_recorded_at)) &&
    ['en-route', 'arrived', 'completed'].includes(String(entry.body.new_status)) &&
    ['pending', 'syncing', 'failed'].includes(String(entry.syncState)) &&
    typeof entry.enqueuedAt === 'string' && Number.isFinite(Date.parse(entry.enqueuedAt))
}

export function recoverInterruptedEntry(entry: OfflineQueueEntry): OfflineQueueEntry {
  return entry.syncState === 'syncing' ? { ...entry, syncState: 'pending' } : entry
}

export async function readMission(actorId: string): Promise<OfflineMissionRecord | null> {
  requireIndexedDb()
  const record: unknown = await database.missions.get(actorId)
  if (record == null) return null
  if (!validateCacheRecord(record, actorId)) {
    await database.missions.delete(actorId)
    throw new Error('Stored mission data is corrupt and was rejected.')
  }
  return record
}

export async function writeMission(actorId: string, mission: MissionDetail): Promise<OfflineMissionRecord> {
  requireIndexedDb()
  if (!validMission(mission)) throw new Error('Server mission data failed validation.')
  const summary = mission.request_summary
  const sanitized: MissionDetail = {
    id: mission.id,
    request_id: mission.request_id,
    team_id: mission.team_id,
    assigned_rescuer_id: mission.assigned_rescuer_id ?? null,
    status: mission.status,
    version: mission.version,
    assigned_at: mission.assigned_at,
    created_at: mission.created_at,
    updated_at: mission.updated_at,
    request_summary: summary ? {
      location: {
        address: summary.location.address,
        point: { type: 'Point', coordinates: [...summary.location.point.coordinates] as [number, number] },
        ...(summary.location.landmark ? { landmark: summary.location.landmark } : {}),
        ...(summary.location.description ? { description: summary.location.description } : {}),
      },
      headcount: summary.headcount,
      vulnerabilities: [...summary.vulnerabilities],
      medical_needs: summary.medical_needs,
      ...(summary.medical_details ? { medical_details: summary.medical_details } : {}),
      reported_flood_level: summary.reported_flood_level,
      situation_summary: summary.situation_summary,
      ...(summary.fixture_notice ? { fixture_notice: summary.fixture_notice } : {}),
    } : null,
    status_history: mission.status_history.map((item) => ({ ...item })),
    latest_route_result: mission.latest_route_result ? structuredClone(mission.latest_route_result) : null,
    data_source: mission.data_source,
    sync_status: mission.sync_status,
    completed_at: mission.completed_at ?? null,
  }
  const record: OfflineMissionRecord = {
    schema_version: 1,
    actor_id: actorId,
    last_synced_at: new Date().toISOString(),
    mission: sanitized,
  }
  await database.missions.put(record)
  return record
}

export async function readQueue(actorId: string): Promise<OfflineQueueEntry | null> {
  requireIndexedDb()
  const entry: unknown = await database.queues.get(actorId)
  if (entry == null) return null
  if (!validateQueueEntry(entry, actorId)) {
    await database.queues.delete(actorId)
    throw new Error('Stored offline event is corrupt and was rejected.')
  }
  const recovered: OfflineQueueEntry & OfflineActorRecord = entry.syncState === 'syncing'
    ? { ...entry, syncState: 'pending' }
    : entry
  if (recovered !== entry) await database.queues.put(recovered)
  const { actor_id: _actorId, ...publicEntry } = recovered
  return publicEntry
}

export async function enqueueEvent(actorId: string, entry: OfflineQueueEntry): Promise<void> {
  requireIndexedDb()
  if (entry.localId !== entry.body.event_id || entry.body.source !== 'offline-sync') {
    throw new Error('Offline event failed validation.')
  }
  await database.transaction('rw', database.queues, async () => {
    if (await database.queues.get(actorId)) throw new Error('An offline status event is already awaiting review or synchronization.')
    await database.queues.put({ ...structuredClone(entry), actor_id: actorId })
  })
}

export async function updateQueue(actorId: string, entry: OfflineQueueEntry): Promise<void> {
  requireIndexedDb()
  await database.queues.put({ ...structuredClone(entry), actor_id: actorId })
}

export async function acknowledgeEvent(
  actorId: string,
  eventId: string,
  mission: MissionDetail,
): Promise<OfflineMissionRecord> {
  requireIndexedDb()
  if (!validMission(mission)) throw new Error('Accepted server mission failed validation.')
  const record: OfflineMissionRecord = {
    schema_version: 1, actor_id: actorId, last_synced_at: new Date().toISOString(),
    mission: structuredClone(mission),
  }
  await database.transaction('rw', database.missions, database.queues, async () => {
    const queued = await database.queues.get(actorId)
    if (!queued || queued.localId !== eventId) throw new Error('The acknowledged event does not match the stored event.')
    await database.missions.put(record)
    await database.queues.delete(actorId)
  })
  return record
}

export async function discardEvent(actorId: string, eventId: string): Promise<void> {
  requireIndexedDb()
  await database.transaction('rw', database.queues, async () => {
    const queued = await database.queues.get(actorId)
    if (!queued || queued.localId !== eventId || queued.syncState !== 'failed') {
      throw new Error('Only the failed event currently under review can be discarded.')
    }
    await database.queues.delete(actorId)
  })
}

export async function clearActor(actorId: string): Promise<void> {
  await database.transaction('rw', database.missions, database.queues, async () => {
    await database.missions.delete(actorId)
    await database.queues.delete(actorId)
  })
}

export async function resetOfflineDatabaseForTests(): Promise<void> {
  await database.delete()
  await database.open()
}
