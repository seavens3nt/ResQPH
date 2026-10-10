/**
 * missions.ts — Rescuer mission API client.
 *
 * Covers:
 *   GET  /missions?assigned_to=me&status=...      → listMyMissions
 *   GET  /missions/{id}                           → getMission
 *   POST /missions/{id}/status-events             → updateMissionStatus
 *
 * Error codes handled per API_CONTRACT.md common error envelope:
 *   403 — simulated role not permitted
 *   409 — invalid transition, repeated event, or stale version
 *   503 — required dependency unavailable
 */

import { isAxiosError } from 'axios'
import { apiClient } from './client'
import type { ApiLocation, GeoPoint } from './assignments'

// Re-export shared types for consumers that only import from missions.ts
export type { ApiLocation, GeoPoint }

// ---------------------------------------------------------------------------
// Re-use ApiError from assignments (single error class for the whole app)
// ---------------------------------------------------------------------------

export { ApiError } from './assignments'
import { ApiError } from './assignments'

function normalizeError(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response
    const envelope = data?.error
    throw new ApiError(
      status,
      envelope?.code ?? 'unknown_error',
      envelope?.message ?? err.message,
      envelope?.details ?? [],
      envelope?.request_id,
    )
  }
  if (isAxiosError(err) && !err.response) {
    throw new ApiError(503, 'network_unavailable', 'The server could not be reached. Please try again.')
  }
  throw err
}

// ---------------------------------------------------------------------------
// Mission types (snake_case, per API_CONTRACT.md)
// ---------------------------------------------------------------------------

export type MissionApiStatus = 'assigned' | 'en-route' | 'arrived' | 'completed' | 'cancelled'

export interface MissionStatusHistoryItem {
  event_id: string
  mission_id?: string
  prior_status: MissionApiStatus
  new_status: MissionApiStatus
  actor_id: string
  actor_role: string
  source: 'online' | 'offline-sync'
  client_recorded_at?: string | null
  server_recorded_at: string
  note?: string | null
}

export interface MissionDetail {
  id: string
  request_id: string
  team_id: string
  assigned_rescuer_id?: string | null
  status: MissionApiStatus
  version: number
  assigned_at: string
  request_summary?: {
    location: ApiLocation
    headcount: number
    vulnerabilities: string[]
    medical_needs: boolean
    medical_details?: string | null
    reported_flood_level: string
    situation_summary: string | null
    fixture_notice?: string
  } | null
  status_history: MissionStatusHistoryItem[]
  latest_route_result?: Record<string, unknown> | null
  tracking_state?: Record<string, unknown> | null
  data_source: string
  sync_status: string
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface MissionTracking {
  mission_id: string
  request_id: string
  team_id: string
  simulation_status: string
  position: GeoPoint | null
  timestamp: string
  route_id?: string | null
  route_geometry?: { type: 'LineString'; coordinates: [number, number][] } | null
  progress_ratio: number
  remaining_distance_m: number
  estimated_remaining_time_s: number
  total_distance_m: number
  total_travel_time_s: number
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Status event body
// ---------------------------------------------------------------------------

/**
 * Body for `POST /missions/{id}/status-events`.
 * `event_id` is a client-generated idempotency key; generate with `crypto.randomUUID()`.
 */
export interface StatusEventBody {
  event_id: string
  new_status: MissionApiStatus
  expected_mission_version: number
  client_recorded_at: string // ISO 8601 UTC
  source: 'online' | 'offline-sync'
  note?: string
}

// ---------------------------------------------------------------------------
// Offline queue entry (stored in Dexie / localStorage fallback)
// ---------------------------------------------------------------------------

export type SyncState = 'pending' | 'syncing' | 'failed' | 'success'

export interface OfflineQueueEntry {
  /** Matches `event_id` sent to the server — used for dedup. */
  localId: string
  missionId: string
  body: StatusEventBody
  syncState: SyncState
  failureReason?: string
  enqueuedAt: string
}

// ---------------------------------------------------------------------------
// Valid next-state transitions (mirrors RESCUE_LIFECYCLE.md)
// ---------------------------------------------------------------------------

const NEXT_VALID_STATUS: Partial<Record<MissionApiStatus, MissionApiStatus>> = {
  assigned: 'en-route',
  'en-route': 'arrived',
  arrived: 'completed',
}

/**
 * Returns the single valid next mission status for a rescuer, or `null` if
 * the mission is in a terminal / unadvanceable state.
 */
export function nextValidStatus(current: MissionApiStatus): MissionApiStatus | null {
  return NEXT_VALID_STATUS[current] ?? null
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List the calling rescuer's active missions.
 * Default statuses: `assigned`, `en-route`, `arrived` (excludes terminal states).
 */
export async function listMyMissions(
  statuses: MissionApiStatus[] = ['assigned', 'en-route', 'arrived'],
): Promise<MissionDetail[]> {
  try {
    const res = await apiClient.get<MissionDetail[]>('/missions', {
      params: {
        assigned_to: 'me',
        status: statuses.join(','),
      },
    })
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}

/**
 * Retrieve full mission detail including request summary and status history.
 * Throws `ApiError` on 403 / 404 / 503.
 */
export async function getMission(missionId: string): Promise<MissionDetail> {
  try {
    const res = await apiClient.get<MissionDetail>(`/missions/${missionId}`)
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}

/**
 * Advance the mission to the next valid status.
 *
 * Happy path:  200 OK → returns the authoritative updated mission.
 * Error paths:
 *   - 403 → `ApiError.isForbidden` — not the assigned rescuer.
 *   - 409 → `ApiError.isConflict` — invalid transition, repeated event_id, or stale version.
 *   - 503 → `ApiError.isUnavailable` — backend unavailable.
 */
export async function updateMissionStatus(
  missionId: string,
  body: StatusEventBody,
): Promise<MissionDetail> {
  try {
    const res = await apiClient.post<MissionDetail>(
      `/missions/${missionId}/status-events`,
      body,
    )
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}

export async function getMissionTracking(missionId: string): Promise<MissionTracking> {
  try {
    const res = await apiClient.get<MissionTracking>(`/missions/${missionId}/tracking`)
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}

export async function controlMissionTracking(
  missionId: string,
  action: 'start' | 'pause' | 'resume' | 'reset',
): Promise<MissionTracking> {
  try {
    const res = await apiClient.post<MissionTracking>(
      `/missions/${missionId}/tracking/control`,
      { action },
    )
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}
