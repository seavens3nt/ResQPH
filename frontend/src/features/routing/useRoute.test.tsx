import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateRoute, RouteApiError } from './routeApi'
import { useRoute } from './useRoute'
import type { RouteFoundResult, RouteRequest } from './types'

vi.mock('./routeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./routeApi')>()
  return { ...actual, evaluateRoute: vi.fn() }
})
const request: RouteRequest = {
  origin: { type: 'Point', coordinates: [120.99, 14.604] },
  destination: { type: 'Point', coordinates: [120.9915, 14.6055] },
  scenario_id: 'known-graph-baseline',
  algorithm: 'astar',
  include_ml_penalty: false,
}

const routeFound: RouteFoundResult = {
  status: 'route-found',
  route_id: 'route-test',
  algorithm: 'astar',
  geometry: { type: 'LineString', coordinates: [[120.99, 14.604], [120.9915, 14.6055]] },
  distance_m: 120,
  estimated_time_s: 120,
  total_cost: 120,
  edge_ids: ['AB', 'BD'],
  cost_breakdown: { base: 120, deterministic_risk: 0, ml_risk: 0 },
  fallback_used: true,
  warnings: ['Runtime ML is disabled; deterministic rules were used.'],
  explanation: 'Lowest-cost eligible route.',
  scenario_timestamp: '2026-10-01T00:00:00Z',
  model_version: null,
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
}

describe('useRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('moves from idle through loading to route-found', async () => {
    let resolveRequest: (result: RouteFoundResult) => void = () => undefined
    vi.mocked(evaluateRoute).mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const { result } = renderHook(() => useRoute(), { wrapper })

    expect(result.current.routeState.status).toBe('idle')
    act(() => result.current.requestRoute(request))
    await waitFor(() => expect(result.current.routeState.status).toBe('loading'))
    act(() => resolveRequest(routeFound))
    await waitFor(() => expect(result.current.routeState.status).toBe('route-found'))
  })

  it('preserves the explicit no-route result', async () => {
    vi.mocked(evaluateRoute).mockResolvedValueOnce({
      status: 'no-route',
      reason: 'controlled_impassability_disconnected_destination',
      warnings: ['No eligible route exists.'],
      scenario_timestamp: '2026-10-01T00:00:00Z',
    })
    const { result } = renderHook(() => useRoute(), { wrapper })

    act(() => result.current.requestRoute(request))
    await waitFor(() => expect(result.current.routeState.status).toBe('no-route'))
  })

  it('exposes retryable API errors without stale success data', async () => {
    vi.mocked(evaluateRoute).mockRejectedValueOnce(
      new RouteApiError('network', 'Routing service unavailable.'),
    )
    const { result } = renderHook(() => useRoute(), { wrapper })

    act(() => result.current.requestRoute(request))
    await waitFor(() => expect(result.current.routeState).toEqual({
      status: 'error',
      kind: 'network',
      message: 'Routing service unavailable.',
      retryable: true,
    }))
  })
})
