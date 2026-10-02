import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/client'
import { evaluateRoute, parseRouteResult, RouteApiError } from './routeApi'
import type { RouteRequest } from './types'
import routeFoundFixtureText from '../../../../data/samples/route-found.example.json?raw'
import noRouteFixtureText from '../../../../data/samples/no-route.example.json?raw'

vi.mock('../../api/client', () => ({
  apiClient: { post: vi.fn() },
}))

function readFixture(name: string): unknown {
  return JSON.parse(name === 'route-found.example.json' ? routeFoundFixtureText : noRouteFixtureText)
}

const request: RouteRequest = {
  origin: { type: 'Point', coordinates: [120.994, 14.6035] },
  destination: { type: 'Point', coordinates: [120.9946, 14.6042] },
  scenario_id: 'scenario-controlled-001',
  algorithm: 'astar',
  include_ml_penalty: true,
}

describe('route API client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('parses the locked route-found fixture and posts the exact request', async () => {
    const fixture = readFixture('route-found.example.json')
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: fixture })

    const result = await evaluateRoute(request)

    expect(result.status).toBe('route-found')
    expect(apiClient.post).toHaveBeenCalledWith('/routes/evaluate', request)
    if (result.status === 'route-found') {
      expect(result.geometry.coordinates).toEqual([
        [120.99, 14.604],
        [120.991, 14.6045],
        [120.9915, 14.6055],
      ])
    }
  })

  it('parses the locked no-route fixture without producing substitute geometry', () => {
    const result = parseRouteResult(readFixture('no-route.example.json'))
    expect(result.status).toBe('no-route')
    expect(result).not.toHaveProperty('geometry')
  })

  it('rejects malformed success geometry as a malformed response', () => {
    const fixture = readFixture('route-found.example.json') as Record<string, unknown>
    try {
      parseRouteResult({ ...fixture, geometry: { type: 'Point', coordinates: [] } })
      throw new Error('Expected malformed response to be rejected')
    } catch (error) {
      expect(error).toBeInstanceOf(RouteApiError)
      expect(error).toMatchObject({ kind: 'malformed-response' })
    }
  })

  it('normalizes a backend error envelope', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: { error: { code: 'routing_unavailable', message: 'Routing engine unavailable.' } },
      },
    })

    await expect(evaluateRoute(request)).rejects.toMatchObject({
      kind: 'api',
      httpStatus: 503,
      code: 'routing_unavailable',
      message: 'Routing engine unavailable.',
      retryable: true,
    })
  })

  it('normalizes a network failure and promises no substitute route', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ isAxiosError: true })

    await expect(evaluateRoute(request)).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
      message: expect.stringMatching(/will not draw a substitute route/i),
    })
  })
})
