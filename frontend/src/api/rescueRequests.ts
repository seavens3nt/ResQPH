/**
 * API module for POST /rescue-requests and related citizen endpoints.
 *
 * Demo role simulation: every request carries X-Demo-Role and X-Demo-User-Id
 * headers. These are a prototype control only — not production authentication.
 *
 * Contract reference: docs/api/API_CONTRACT.md
 * Fixture notice: Synthetic academic demonstration data; not a real emergency.
 */

import { isAxiosError } from 'axios'
import { apiClient } from './client'
import type {
  CancelRequestPayload,
  CreateRescueRequestPayload,
  RescueRequestListResponse,
  RescueRequestRecord,
  ApiErrorEnvelope,
} from '../features/requests/types'

// ---------------------------------------------------------------------------
// Demo headers helper
// ---------------------------------------------------------------------------

function citizenHeaders(citizenId: string): Record<string, string> {
  return {
    'X-Demo-Role': 'citizen',
    'X-Demo-User-Id': citizenId,
  }
}

// ---------------------------------------------------------------------------
// Error normalisation
// ---------------------------------------------------------------------------

/**
 * Extracts the API error envelope from an Axios error response, or builds a
 * generic envelope for non-API errors so callers always see the same shape.
 */
export function extractApiError(error: unknown): { status: number; error: ApiErrorEnvelope } {
  if (isAxiosError(error) && error.response) {
    const body = error.response.data as { error?: ApiErrorEnvelope } | ApiErrorEnvelope | undefined
    const envelope: ApiErrorEnvelope =
      // Support both { error: {...} } and flat { code, message } shapes
      (body && 'error' in body && body.error)
        ? body.error
        : {
            code: 'api_error',
            message:
              (body as ApiErrorEnvelope | undefined)?.message ??
              error.response.statusText ??
              'An unexpected error occurred.',
            details: (body as ApiErrorEnvelope | undefined)?.details,
          }
    return { status: error.response.status, error: envelope }
  }
  return {
    status: 0,
    error: {
      code: 'network_error',
      message: error instanceof Error ? error.message : 'Network error. Check your connection.',
    },
  }
}

// ---------------------------------------------------------------------------
// Create rescue request — POST /rescue-requests
// ---------------------------------------------------------------------------

/**
 * Submits a new rescue request for the authenticated citizen.
 * Returns the stored record (status: "pending", version: 1) on success.
 * Throws on HTTP error so TanStack Query's error state is populated.
 */
export async function createRescueRequest(
  citizenId: string,
  payload: CreateRescueRequestPayload,
): Promise<RescueRequestRecord> {
  const response = await apiClient.post<RescueRequestRecord>(
    '/rescue-requests',
    payload,
    { headers: citizenHeaders(citizenId) },
  )
  return response.data
}

// ---------------------------------------------------------------------------
// Get single rescue request — GET /rescue-requests/{id}
// ---------------------------------------------------------------------------

export async function getRescueRequest(
  citizenId: string,
  requestId: string,
): Promise<RescueRequestRecord> {
  const response = await apiClient.get<RescueRequestRecord>(
    `/rescue-requests/${requestId}`,
    { headers: citizenHeaders(citizenId) },
  )
  return response.data
}

// ---------------------------------------------------------------------------
// List citizen's own requests — GET /rescue-requests
// ---------------------------------------------------------------------------

export async function listMyRescueRequests(
  citizenId: string,
  params: { limit?: number; cursor?: string; status?: string } = {},
): Promise<RescueRequestListResponse> {
  const response = await apiClient.get<RescueRequestListResponse>(
    '/rescue-requests',
    {
      headers: citizenHeaders(citizenId),
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    },
  )
  return response.data
}

// ---------------------------------------------------------------------------
// Cancel pending request — POST /rescue-requests/{id}/cancel
// ---------------------------------------------------------------------------

/**
 * Cancels a pending rescue request. Requires the current version for
 * optimistic-lock protection. Returns the updated record on success.
 */
export async function cancelRescueRequest(
  citizenId: string,
  requestId: string,
  payload: CancelRequestPayload,
): Promise<RescueRequestRecord> {
  const response = await apiClient.post<RescueRequestRecord>(
    `/rescue-requests/${requestId}/cancel`,
    payload,
    { headers: citizenHeaders(citizenId) },
  )
  return response.data
}
