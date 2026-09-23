/**
 * assignments.ts — Coordinator assignment API client.
 *
 * Covers:
 *   GET  /rescue-requests?status=pending          → listPendingRequests
 *   POST /rescue-requests/{id}/assignment         → assignTeam
 *
 * Error codes handled per API_CONTRACT.md common error envelope:
 *   403 — simulated role not permitted
 *   409 — conflict (stale version, duplicate assignment, active transition)
 *   503 — required dependency unavailable
 */

import { isAxiosError } from 'axios'
import { apiClient } from './client'

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export interface ApiErrorDetail {
  field?: string
  reason: string
}

/** Structured error from the server's common error envelope. */
export class ApiError extends Error {
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly requestId: string | undefined
  readonly httpStatus: number

  constructor(
    httpStatus: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.httpStatus = httpStatus
    this.code = code
    this.details = details
    this.requestId = requestId
  }

  get isConflict(): boolean {
    return this.httpStatus === 409
  }

  get isForbidden(): boolean {
    return this.httpStatus === 403
  }

  get isUnavailable(): boolean {
    return this.httpStatus === 503
  }
}

/** Parse an axios error into an `ApiError` or re-throw unknown errors. */
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
  // Network timeout / no response — treat as 503
  if (isAxiosError(err) && !err.response) {
    throw new ApiError(503, 'network_unavailable', 'The server could not be reached. Please try again.')
  }
  throw err
}

// ---------------------------------------------------------------------------
// Shared location type (GeoJSON-first, per API_CONTRACT.md)
// ---------------------------------------------------------------------------

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface ApiLocation {
  address: string
  point: GeoPoint
  landmark?: string
  description?: string
}

// ---------------------------------------------------------------------------
// Rescue request summary (snake_case matches backend response)
// ---------------------------------------------------------------------------

export interface ApiRescueRequestSummary {
  id: string
  status: 'pending' | 'assigned' | 'en-route' | 'arrived' | 'completed' | 'cancelled'
  version: number
  location: ApiLocation
  headcount: number
  vulnerabilities: string[]
  medical_needs: boolean
  medical_details?: string
  reported_flood_level: string
  situation_summary: string
  submitted_at: string
}

export interface PaginatedRequests {
  items: ApiRescueRequestSummary[]
  next_cursor: string | null
  total: number
}

// ---------------------------------------------------------------------------
// Assignment types
// ---------------------------------------------------------------------------

export interface AssignTeamBody {
  team_id: string
  expected_request_version: number
}

export interface ApiMissionSummary {
  id: string
  request_id: string
  team_id: string
  status: 'assigned' | 'en-route' | 'arrived' | 'completed'
  version: number
  created_at: string
}

export interface AssignmentResult {
  mission: ApiMissionSummary
  request: ApiRescueRequestSummary
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List pending rescue requests for the coordinator queue.
 * Throws `ApiError` on 403 / 503 or network failure.
 */
export async function listPendingRequests(
  cursor?: string,
  limit = 20,
): Promise<PaginatedRequests> {
  try {
    const params: Record<string, string | number> = { status: 'pending', limit }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<PaginatedRequests>('/rescue-requests', { params })
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}

/**
 * Assign an available team to a pending rescue request.
 *
 * Happy path:  201 Created → returns `AssignmentResult`.
 * Error paths:
 *   - 403 → `ApiError.isForbidden` — role not permitted.
 *   - 409 → `ApiError.isConflict` — duplicate assignment or stale version.
 *   - 503 → `ApiError.isUnavailable` — backend dependency unavailable.
 */
export async function assignTeam(
  requestId: string,
  body: AssignTeamBody,
): Promise<AssignmentResult> {
  try {
    const res = await apiClient.post<AssignmentResult>(
      `/rescue-requests/${requestId}/assignment`,
      body,
    )
    return res.data
  } catch (err) {
    return normalizeError(err)
  }
}
