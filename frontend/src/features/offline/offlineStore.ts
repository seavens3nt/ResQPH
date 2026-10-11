import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { MissionDetail, OfflineQueueEntry } from '../../api/missions'

export interface OfflineMissionRecord {
  schema_version: 1 | 2
  actor_id: string
  last_synced_at: string
  mission: MissionDetail
}

interface OfflineActorRecord {
  actor_id: string
}

export interface OfflineRecoveryRecord {
  id: string
  actor_id: string
  kind: 'mission' | 'queue'
  reason: string
  created_at: string
  record: unknown
}

class ResQPHOfflineDatabase extends Dexie {
  missions!: Table<OfflineMissionRecord, string>
  queues!: Table<OfflineQueueEntry & OfflineActorRecord, string>
  quarantined!: Table<{ id: string; actor_id: string; kind: 'mission' | 'queue'; reason: string; created_at: string; record: unknown }, string>

  constructor() {
    super('resqph-offline-v1')
    this.version(1).stores({ missions: '&actor_id', queues: '&actor_id' })
    this.version(2).stores({ missions: '&actor_id', queues: '&actor_id', quarantined: '&id, actor_id, created_at' })
  }
}

const database = new ResQPHOfflineDatabase()

function requireIndexedDb(): void {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is unavailable; offline persistence is disabled.')
}

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)))
const status = z.enum(['assigned', 'en-route', 'arrived', 'completed', 'cancelled'])
const missionSchema = z.object({
  id: z.string().min(1), request_id: z.string().min(1), team_id: z.string().min(1),
  station_id: z.string().min(1).nullable().optional(),
  assigned_rescuer_id: z.string().min(1).nullable().optional(),
  status, version: z.number().int().positive(),
  assigned_at: timestamp, created_at: timestamp, updated_at: timestamp,
  request_summary: z.object({
    location: z.object({
      address: z.string(),
      point: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }).strict(),
      landmark: z.string().nullable().optional(), description: z.string().nullable().optional(),
    }).strict(),
    headcount: z.number().int().positive(), vulnerabilities: z.array(z.string()),
    medical_needs: z.boolean(), medical_details: z.string().nullable().optional(),
    reported_flood_level: z.string(), reported_severity: z.string().optional(), situation_summary: z.string().nullable(), fixture_notice: z.string().optional(),
  }).strict().nullable().optional(),
  status_history: z.array(z.object({
    event_id: z.string().min(1), mission_id: z.string().min(1).optional(), prior_status: status, new_status: status,
    actor_id: z.string().min(1), actor_role: z.string().min(1),
    source: z.enum(['online', 'offline-sync']), client_recorded_at: timestamp.nullable().optional(),
    server_recorded_at: timestamp, note: z.string().nullable().optional(),
  }).strict()),
  latest_route_result: z.record(z.string(), z.unknown()).nullable().optional(),
  tracking_state: z.record(z.string(), z.unknown()).nullable().optional(),
  data_source: z.string().min(1), sync_status: z.string().min(1),
  completed_at: timestamp.nullable().optional(),
}).strict().refine((mission) => mission.status_history.every((event) =>
  event.mission_id === undefined || event.mission_id === mission.id))

function validMission(value: unknown): value is MissionDetail {
  return missionSchema.safeParse(value).success
}

function missionSchemaIssues(value: unknown): string[] {
  const parsed = missionSchema.safeParse(value)
  return parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'mission'))]
}

function cacheFailureReason(value: unknown, actorId: string, stationId?: string, teamId?: string): string {
  if (!value || typeof value !== 'object') return 'record is not an object'
  const record = value as Partial<OfflineMissionRecord>
  if (record.actor_id !== actorId) return 'cache account ownership mismatch'
  const invalidFields = missionSchemaIssues(record.mission)
  if (invalidFields.length) return `mission schema fields failed validation: ${invalidFields.join(', ')}`
  if (record.mission?.team_id !== (teamId ?? actorId)) return 'mission station-unit ownership mismatch'
  if (stationId && record.mission?.station_id && record.mission.station_id !== stationId) return 'mission station membership mismatch'
  return 'cache envelope failed validation'
}

export function validateCacheRecord(value: unknown, actorId: string, stationId?: string, teamId?: string): value is OfflineMissionRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<OfflineMissionRecord>
  if (Object.keys(value).some((key) => !['schema_version', 'actor_id', 'last_synced_at', 'mission'].includes(key))) return false
  const expectedTeamId = teamId ?? actorId
  return (record.schema_version === 1 || record.schema_version === 2) && record.actor_id === actorId &&
    typeof record.last_synced_at === 'string' && Number.isFinite(Date.parse(record.last_synced_at)) &&
    validMission(record.mission) && record.mission.team_id === expectedTeamId &&
    (!record.mission.assigned_rescuer_id || record.mission.assigned_rescuer_id === record.mission.team_id) &&
    (!stationId || record.mission.station_id === undefined || record.mission.station_id === stationId)
}

export function validateQueueEntry(value: unknown, actorId: string): value is OfflineQueueEntry & OfflineActorRecord {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<OfflineQueueEntry & OfflineActorRecord>
  const entryKeys = ['actor_id', 'localId', 'missionId', 'body', 'syncState', 'failureReason', 'enqueuedAt']
  const bodyKeys = ['event_id', 'new_status', 'expected_mission_version', 'client_recorded_at', 'source', 'note']
  return Object.keys(value).every((key) => entryKeys.includes(key)) &&
    Boolean(entry.body && Object.keys(entry.body).every((key) => bodyKeys.includes(key))) &&
    entry.actor_id === actorId && typeof entry.localId === 'string' && entry.localId.length > 0 &&
    entry.localId === entry.body?.event_id && typeof entry.missionId === 'string' && entry.missionId.length > 0 &&
    typeof entry.body?.expected_mission_version === 'number' && Number.isInteger(entry.body.expected_mission_version) && entry.body.expected_mission_version > 0 &&
    (entry.body.note === undefined || typeof entry.body.note === 'string') &&
    (entry.failureReason === undefined || typeof entry.failureReason === 'string') &&
    entry.body.source === 'offline-sync' && Number.isFinite(Date.parse(entry.body.client_recorded_at)) &&
    ['en-route', 'arrived', 'completed'].includes(String(entry.body.new_status)) &&
    ['pending', 'syncing', 'failed'].includes(String(entry.syncState)) &&
    typeof entry.enqueuedAt === 'string' && Number.isFinite(Date.parse(entry.enqueuedAt))
}

export function recoverInterruptedEntry(entry: OfflineQueueEntry): OfflineQueueEntry {
  return entry.syncState === 'syncing' ? { ...entry, syncState: 'pending' } : entry
}

export async function readMission(actorId: string, stationId?: string, teamId?: string): Promise<OfflineMissionRecord | null> {
  requireIndexedDb()
  const record: unknown = await database.missions.get(actorId)
  if (record == null) return null
  if (!validateCacheRecord(record, actorId, stationId, teamId)) {
    const reason = cacheFailureReason(record, actorId, stationId, teamId)
    await quarantine(actorId, 'mission', reason, record)
    throw new Error(`Cached mission ${reason} and was quarantined. Refresh online to restore it.`)
  }
  const migrated = {
    ...record,
    schema_version: 2 as const,
    mission: {
      ...record.mission,
      station_id: record.mission.station_id ?? stationId ?? null,
      tracking_state: record.mission.tracking_state ?? null,
    },
  }
  if (record.schema_version !== 2 || record.mission.station_id === undefined || record.mission.tracking_state === undefined) {
    await database.missions.put(migrated)
  }
  return migrated
}

export async function writeMission(actorId: string, mission: MissionDetail, stationId?: string, teamId?: string): Promise<OfflineMissionRecord> {
  requireIndexedDb()
  const schemaIssues = missionSchemaIssues(mission)
  if (schemaIssues.length) throw new Error(`Server mission schema fields failed validation: ${schemaIssues.join(', ')}. The cached record was not changed.`)
  if (mission.team_id !== (teamId ?? actorId) || (stationId && mission.station_id !== stationId) || (mission.assigned_rescuer_id && mission.assigned_rescuer_id !== mission.team_id)) {
    throw new Error('Server mission identity does not match the authenticated station; the cached record was not changed.')
  }
  const summary = mission.request_summary
  const sanitized: MissionDetail = {
    id: mission.id,
    request_id: mission.request_id,
    team_id: mission.team_id,
    station_id: mission.station_id ?? stationId ?? null,
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
      ...(summary.reported_severity ? { reported_severity: summary.reported_severity } : {}),
      situation_summary: summary.situation_summary,
      ...(summary.fixture_notice ? { fixture_notice: summary.fixture_notice } : {}),
    } : null,
    status_history: mission.status_history.map((item) => ({ ...item })),
    latest_route_result: mission.latest_route_result ? structuredClone(mission.latest_route_result) : null,
    tracking_state: mission.tracking_state ? structuredClone(mission.tracking_state) : null,
    data_source: mission.data_source,
    sync_status: mission.sync_status,
    completed_at: mission.completed_at ?? null,
  }
  const record: OfflineMissionRecord = {
    schema_version: 2,
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
    const reason = queueFailureReason(entry, actorId)
    await quarantine(actorId, 'queue', reason, entry)
    throw new Error(`Queued event ${reason} and was quarantined. Download the recovery record before continuing.`)
  }
  const recovered: OfflineQueueEntry & OfflineActorRecord = entry.syncState === 'syncing'
    ? { ...entry, syncState: 'pending' }
    : entry
  if (recovered !== entry) await database.queues.put(recovered)
  const { actor_id: _actorId, ...publicEntry } = recovered
  return publicEntry
}

function queueFailureReason(value: unknown, actorId: string): string {
  if (!value || typeof value !== 'object') return 'record is not an object'
  const entry = value as Partial<OfflineQueueEntry & OfflineActorRecord>
  if (entry.actor_id !== actorId) return 'account ownership mismatch'
  if (!entry.body || typeof entry.body !== 'object') return 'body field failed validation'
  for (const field of ['event_id', 'new_status', 'expected_mission_version', 'client_recorded_at', 'source'] as const) {
    if (!(field in entry.body)) return `body.${field} is missing`
  }
  if (entry.localId !== entry.body.event_id) return 'localId does not match body.event_id'
  if (typeof entry.missionId !== 'string' || !entry.missionId) return 'missionId failed validation'
  return 'record fields failed validation'
}

export async function enqueueEvent(actorId: string, entry: OfflineQueueEntry): Promise<void> {
  requireIndexedDb()
  if (!validateQueueEntry({ ...entry, actor_id: actorId }, actorId)) {
    throw new Error('Offline event failed validation.')
  }
  await database.transaction('rw', database.queues, async () => {
    if (await database.queues.get(actorId)) throw new Error('An offline status event is already awaiting review or synchronization.')
    await database.queues.put({ ...structuredClone(entry), actor_id: actorId })
  })
}

export async function updateQueue(actorId: string, entry: OfflineQueueEntry): Promise<void> {
  requireIndexedDb()
  if (!validateQueueEntry({ ...entry, actor_id: actorId }, actorId)) throw new Error('Offline event failed validation.')
  await database.transaction('rw', database.queues, async () => {
    const previous = await database.queues.get(actorId)
    if (!previous || previous.localId !== entry.localId || previous.missionId !== entry.missionId ||
      previous.enqueuedAt !== entry.enqueuedAt || JSON.stringify(previous.body) !== JSON.stringify(entry.body)) {
      throw new Error('The stored event cannot be replaced or rewritten.')
    }
    await database.queues.put({ ...structuredClone(entry), actor_id: actorId })
  })
}

export async function acknowledgeEvent(
  actorId: string,
  eventId: string,
  mission: MissionDetail,
  stationId?: string,
  teamId?: string,
): Promise<OfflineMissionRecord> {
  requireIndexedDb()
  if (!validMission(mission) || mission.team_id !== (teamId ?? actorId) || (stationId && mission.station_id !== stationId) || (mission.assigned_rescuer_id && mission.assigned_rescuer_id !== mission.team_id)) throw new Error('Accepted server mission failed authenticated station validation.')
  const record: OfflineMissionRecord = {
    schema_version: 2, actor_id: actorId, last_synced_at: new Date().toISOString(),
    mission: structuredClone(mission),
  }
  await database.transaction('rw', database.missions, database.queues, async () => {
    const queued = await database.queues.get(actorId)
    if (!queued || queued.localId !== eventId || queued.missionId !== mission.id ||
      mission.version <= queued.body.expected_mission_version || !mission.status_history.some((item) => item.event_id === eventId)) {
      throw new Error('The acknowledged event does not match accepted server history.')
    }
    await database.missions.put(record)
    await database.queues.delete(actorId)
  })
  return record
}

async function quarantine(actorId: string, kind: 'mission' | 'queue', reason: string, record: unknown): Promise<void> {
  const id = `${kind}:${actorId}:${crypto.randomUUID()}`
  await database.transaction('rw', database.missions, database.queues, database.quarantined, async () => {
    await database.quarantined.put({ id, actor_id: actorId, kind, reason, created_at: new Date().toISOString(), record: structuredClone(record) })
    if (kind === 'mission') await database.missions.delete(actorId)
    else await database.queues.delete(actorId)
  })
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

export async function clearMission(actorId: string): Promise<void> {
  requireIndexedDb()
  await database.missions.delete(actorId)
}

export async function readQuarantined(actorId: string): Promise<OfflineRecoveryRecord[]> {
  requireIndexedDb()
  return database.quarantined.where('actor_id').equals(actorId).sortBy('created_at')
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
