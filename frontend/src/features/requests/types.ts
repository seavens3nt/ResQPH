/**
 * API-contract-aligned types for rescue requests.
 *
 * These types reflect the backend snake_case contract shapes used in
 * POST /rescue-requests and GET /rescue-requests/{id}. They differ
 * intentionally from the mock-only types in features/missions/types.ts,
 * which exist for the coordinator/rescuer mock workflow only.
 *
 * Data source: docs/api/API_CONTRACT.md and data/samples/rescue-request.example.json
 * Fixture notice: Synthetic academic demonstration data; not a real emergency record.
 */

// ---------------------------------------------------------------------------
// Enumerations (aligned to API contract)
// ---------------------------------------------------------------------------

/** Valid reported_flood_level values per API contract. */
export const FLOOD_LEVEL_OPTIONS = [
  'none',
  'low',
  'moderate',
  'high',
  'unknown',
] as const

export type FloodLevel = (typeof FLOOD_LEVEL_OPTIONS)[number]

/** Valid vulnerability tags per API contract (string array in API, not object). */
export const VULNERABILITY_OPTIONS = [
  'infant',
  'senior',
  'mobility',
  'pregnant',
  'other',
] as const

export type VulnerabilityTag = (typeof VULNERABILITY_OPTIONS)[number]

/** Authoritative status values per API contract. */
export const REQUEST_STATUS_VALUES = [
  'pending',
  'assigned',
  'en-route',
  'arrived',
  'completed',
  'cancelled',
] as const

export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number]

// ---------------------------------------------------------------------------
// Location (GeoJSON point, longitude-first per contract)
// ---------------------------------------------------------------------------

export interface GeoPoint {
  type: 'Point'
  /** [longitude, latitude] — GeoJSON order per API contract */
  coordinates: [number, number]
}

export interface RequestLocation {
  address: string
  point: GeoPoint
  landmark?: string
  description?: string
}

// ---------------------------------------------------------------------------
// Status history entry
// ---------------------------------------------------------------------------

export interface StatusHistoryEntry {
  status: RequestStatus
  /** ISO 8601 UTC timestamp ending in Z */
  occurred_at: string
  note?: string
}

// ---------------------------------------------------------------------------
// API request and response shapes
// ---------------------------------------------------------------------------

/** Payload for POST /rescue-requests */
export interface CreateRescueRequestPayload {
  location: RequestLocation
  headcount: number
  vulnerabilities: VulnerabilityTag[]
  medical_needs: boolean
  medical_details?: string
  reported_flood_level: FloodLevel
  situation_summary?: string
}

/** Full rescue-request record returned by the API (201 / GET) */
export interface RescueRequestRecord {
  id: string
  citizen_id: string
  location: RequestLocation
  headcount: number
  vulnerabilities: VulnerabilityTag[]
  medical_needs: boolean
  medical_details?: string
  reported_flood_level: FloodLevel
  situation_summary?: string
  status: RequestStatus
  /** Optimistic-lock version; required for cancel */
  version: number
  /** ISO 8601 UTC */
  created_at: string
  /** ISO 8601 UTC */
  updated_at: string
  /** Present after coordinator assignment */
  assigned_team_id?: string
  status_history?: StatusHistoryEntry[]
}

/** Payload for POST /rescue-requests/{id}/cancel */
export interface CancelRequestPayload {
  reason: string
  version: number
}

/** Paginated list response for GET /rescue-requests */
export interface RescueRequestListResponse {
  items: RescueRequestRecord[]
  cursor?: string
  total?: number
}

// ---------------------------------------------------------------------------
// Common API error envelope (per API contract)
// ---------------------------------------------------------------------------

export interface ApiErrorDetail {
  field?: string
  reason: string
}

export interface ApiErrorEnvelope {
  code: string
  message: string
  details?: ApiErrorDetail[]
  request_id?: string
}

/** Discriminated union for operation results to keep hooks simple. */
export type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: ApiErrorEnvelope }
