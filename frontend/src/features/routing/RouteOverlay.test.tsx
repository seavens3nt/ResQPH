import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteOverlay } from './RouteOverlay'
import type { RouteFoundResult } from './types'

const routeFound: RouteFoundResult = {
  status: 'route-found',
  route_id: 'route-known-graph-baseline',
  algorithm: 'astar',
  geometry: { type: 'LineString', coordinates: [[120.99, 14.604], [120.9915, 14.6055]] },
  distance_m: 120,
  estimated_time_s: 120,
  total_cost: 120,
  edge_ids: ['AB', 'BD'],
  cost_breakdown: { base: 120, deterministic_risk: 0, ml_risk: 0 },
  fallback_used: true,
  warnings: [
    'Synthetic controlled scenario; not live navigation data.',
    'Runtime ML is disabled; deterministic rules were used.',
  ],
  explanation: 'The selected path has the lowest eligible cost.',
  scenario_timestamp: '2026-10-01T00:00:00Z',
  model_version: null,
}

describe('RouteOverlay', () => {
  it('renders idle and loading states without claiming a route exists', () => {
    const { rerender } = render(<RouteOverlay state={{ status: 'idle' }} />)
    expect(screen.getByText(/No route has been calculated/i)).toBeInTheDocument()

    rerender(<RouteOverlay state={{ status: 'loading' }} />)
    expect(screen.getByText(/Calculating an eligible route/i)).toBeInTheDocument()
  })

  it('renders a route-found fallback with controlled and non-live warnings', () => {
    render(<RouteOverlay state={{ status: 'route-found', result: routeFound }} />)
    expect(screen.getByText(/Controlled-scenario route displayed/i)).toBeInTheDocument()
    expect(screen.getByText(/Rule-based fallback is active/i)).toBeInTheDocument()
    expect(screen.getByText(/not live navigation data/i)).toBeInTheDocument()
    expect(screen.getByText(/Scenario time: 2026-10-01/i)).toBeInTheDocument()
  })

  it('renders no-route without a substitute-route claim', () => {
    render(<RouteOverlay state={{
      status: 'no-route',
      result: {
        status: 'no-route',
        reason: 'controlled_impassability_disconnected_destination',
        warnings: ['No eligible route exists under the selected controlled scenario.'],
        scenario_timestamp: '2026-10-01T00:00:00Z',
      },
    }} />)
    expect(screen.getAllByText(/No eligible route/i)).toHaveLength(2)
    expect(screen.getByText(/No substitute or straight-line route/i)).toBeInTheDocument()
  })

  it('renders API errors as an alert', () => {
    render(<RouteOverlay state={{
      status: 'error',
      kind: 'api',
      message: 'Routing engine unavailable.',
      retryable: true,
    }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Routing engine unavailable/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/retry/i)
  })
})
