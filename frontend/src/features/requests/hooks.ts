/**
 * TanStack Query hooks for citizen rescue-request operations.
 *
 * All hooks require an authenticated user (from useAuth) to derive the
 * demo role simulation headers. Role simulation is prototype-only and is
 * not a production authentication mechanism.
 *
 * Endpoints consumed:
 *   POST  /rescue-requests
 *   GET   /rescue-requests/{id}
 *   GET   /rescue-requests?limit=20
 *   POST  /rescue-requests/{id}/cancel
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import {
  cancelRescueRequest,
  createRescueRequest,
  getRescueRequest,
  listMyRescueRequests,
} from '../../api/rescueRequests'
import type {
  CancelRequestPayload,
  CreateRescueRequestPayload,
  RescueRequestRecord,
} from './types'

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const rescueRequestKeys = {
  all: ['rescue-requests'] as const,
  list: () => [...rescueRequestKeys.all, 'list'] as const,
  detail: (id: string) => [...rescueRequestKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// useMyRescueRequests — GET /rescue-requests (citizen's own requests)
// ---------------------------------------------------------------------------

export function useMyRescueRequests() {
  const { user } = useAuth()
  return useQuery({
    queryKey: rescueRequestKeys.list(),
    queryFn: () => {
      if (!user) throw new Error('Not authenticated')
      return listMyRescueRequests(user.email, { limit: 20 })
    },
    enabled: !!user,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// useRescueRequest — GET /rescue-requests/{id}
// Polls while the request is in an active (non-terminal) state.
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])

export function useRescueRequest(requestId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: rescueRequestKeys.detail(requestId ?? ''),
    queryFn: () => {
      if (!user || !requestId) throw new Error('Not authenticated or missing ID')
      return getRescueRequest(user.email, requestId)
    },
    enabled: !!user && !!requestId,
    // Poll every 10 s while the request is still in-flight
    refetchInterval: (query) => {
      const data = query.state.data as RescueRequestRecord | undefined
      if (!data) return false
      return TERMINAL_STATUSES.has(data.status) ? false : 10_000
    },
    staleTime: 5_000,
  })
}

// ---------------------------------------------------------------------------
// useCreateRescueRequest — POST /rescue-requests
// ---------------------------------------------------------------------------

export function useCreateRescueRequest() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRescueRequestPayload) => {
      if (!user) throw new Error('Not authenticated')
      return createRescueRequest(user.email, payload)
    },
    onSuccess: (data) => {
      // Seed the detail cache immediately so the status view loads instantly
      queryClient.setQueryData(rescueRequestKeys.detail(data.id), data)
      // Invalidate the list so it picks up the new entry
      queryClient.invalidateQueries({ queryKey: rescueRequestKeys.list() })
    },
  })
}

// ---------------------------------------------------------------------------
// useCancelRescueRequest — POST /rescue-requests/{id}/cancel
// ---------------------------------------------------------------------------

export function useCancelRescueRequest() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: CancelRequestPayload }) => {
      if (!user) throw new Error('Not authenticated')
      return cancelRescueRequest(user.email, requestId, payload)
    },
    onSuccess: (data) => {
      // Update both the detail and list caches with the authoritative response
      queryClient.setQueryData(rescueRequestKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: rescueRequestKeys.list() })
    },
  })
}
