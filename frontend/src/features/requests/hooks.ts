/**
 * TanStack Query hooks for citizen rescue-request operations.
 *
 * All hooks require an authenticated user; the server cookie supplies identity.
 *
 * Endpoints consumed:
 *   POST  /rescue-requests
 *   GET   /rescue-requests/{id}
 *   GET   /rescue-requests?limit=20
 *   POST  /rescue-requests/{id}/cancel
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
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
import { retryAfterDelay } from '../../api/retryAfter'

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const rescueRequestKeys = {
  all: ['rescue-requests'] as const,
  list: (citizenId: string) => [...rescueRequestKeys.all, 'list', citizenId] as const,
  detail: (citizenId: string, id: string) =>
    [...rescueRequestKeys.all, 'detail', citizenId, id] as const,
}

// ---------------------------------------------------------------------------
// useMyRescueRequests — GET /rescue-requests (citizen's own requests)
// ---------------------------------------------------------------------------

export function useMyRescueRequests(enabled = true) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const citizenId = user?.id ?? ''
  const queryKey = rescueRequestKeys.list(citizenId)
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const received = await listMyRescueRequests(user.id ?? user.email, { limit: 20 })
      const cached = queryClient.getQueryData<Awaited<ReturnType<typeof listMyRescueRequests>>>(queryKey)
      if (!cached) return received
      const oldById = new Map(cached.items.map(item => [item.id, item]))
      return {
        ...received,
        items: received.items.map(item => {
          const old = oldById.get(item.id)
          return old && old.version > item.version ? old : item
        }),
      }
    },
    enabled: !!user && enabled,
    staleTime: 30_000,
    refetchInterval: 10_000,
  })
}

// ---------------------------------------------------------------------------
// useRescueRequest — GET /rescue-requests/{id}
// Polls while the request is in an active (non-terminal) state.
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])

export function useRescueRequest(requestId: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const citizenId = user?.id ?? ''
  const queryKey = rescueRequestKeys.detail(citizenId, requestId ?? '')
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !requestId) throw new Error('Not authenticated or missing ID')
      const received = await getRescueRequest(user.id ?? user.email, requestId)
      const cached = queryClient.getQueryData<RescueRequestRecord>(queryKey)
      return cached && cached.version > received.version ? cached : received
    },
    enabled: !!user && !!requestId,
    // Poll every 10 s while the request is still in-flight
    refetchInterval: (query) => {
      const data = query.state.data as RescueRequestRecord | undefined
      if (data && TERMINAL_STATUSES.has(data.status)) return false
      if (query.state.error) return retryAfterDelay(query.state.error, Math.min(30_000, 5_000 * (2 ** Math.min(query.state.fetchFailureCount, 3))))
      return 5_000
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
  const pendingSubmission = useRef<{ fingerprint: string; key: string } | null>(null)

  return useMutation({
    mutationFn: async (payload: CreateRescueRequestPayload) => {
      if (!user) throw new Error('Not authenticated')
      const fingerprint = JSON.stringify(payload)
      const storageKey = `resqph.request.idempotency.${user.id ?? user.email}`
      if (!pendingSubmission.current) {
        try {
          const stored = sessionStorage.getItem(storageKey)
          if (stored) pendingSubmission.current = JSON.parse(stored) as { fingerprint: string; key: string }
        } catch { /* The server key remains in the component memory when storage is unavailable. */ }
      }
      if (!pendingSubmission.current || pendingSubmission.current.fingerprint !== fingerprint) {
        pendingSubmission.current = { fingerprint, key: crypto.randomUUID() }
        try { sessionStorage.setItem(storageKey, JSON.stringify(pendingSubmission.current)) } catch { /* The live retry still reuses the in-memory key. */ }
      }
      try {
        return await createRescueRequest(user.id ?? user.email, payload, pendingSubmission.current.key)
      } catch (error) {
        const status = typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined
        if (status && status >= 400 && status < 500 && status !== 429) {
          pendingSubmission.current = null
          try { sessionStorage.removeItem(storageKey) } catch { /* Ignore unavailable storage. */ }
        }
        throw error
      }
    },
    onSuccess: (data) => {
      // Seed the detail cache immediately so the status view loads instantly
      if (user) {
        queryClient.setQueryData(rescueRequestKeys.detail(user.id ?? user.email, data.id), data)
      }
      // Invalidate the list so it picks up the new entry
      if (user) {
        queryClient.invalidateQueries({ queryKey: rescueRequestKeys.list(user.id ?? user.email) })
        try { sessionStorage.removeItem(`resqph.request.idempotency.${user.id ?? user.email}`) } catch { /* Ignore unavailable storage. */ }
        pendingSubmission.current = null
      }
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
        return cancelRescueRequest(user.id ?? user.email, requestId, payload)
    },
    onSuccess: (data) => {
      // Update both the detail and list caches with the authoritative response
      if (user) {
        queryClient.setQueryData(rescueRequestKeys.detail(user.id ?? user.email, data.id), data)
      }
      if (user) {
        queryClient.invalidateQueries({ queryKey: rescueRequestKeys.list(user.id ?? user.email) })
      }
    },
  })
}
