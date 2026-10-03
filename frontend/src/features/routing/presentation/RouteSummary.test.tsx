import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoRouteState } from './NoRouteState'
import { RouteCostBreakdown } from './RouteCostBreakdown'
import { RouteExplanation } from './RouteExplanation'
import { RouteSummary } from './RouteSummary'
import { RouteWarnings } from './RouteWarnings'
import type { NoRouteResult, RouteFoundResult } from '../types'
import routeFoundFixtureText from '../../../../../data/samples/route-found.example.json?raw'
import noRouteFixtureText from '../../../../../data/samples/no-route.example.json?raw'

const FOUND_RESULT = JSON.parse(routeFoundFixtureText) as RouteFoundResult
const NO_ROUTE_RESULT = JSON.parse(noRouteFixtureText) as NoRouteResult

describe('RouteSummary', () => {
  it('presents route facts, scenario time, explanation, deterministic fallback, and warnings', () => {
    render(<RouteSummary status="route-found" result={FOUND_RESULT} />)

    expect(screen.getByRole('heading', { name: 'Route result' })).toBeInTheDocument()
    expect(screen.getByText('120 m')).toBeInTheDocument()
    expect(screen.getByText('2 min')).toBeInTheDocument()
    expect(screen.getAllByText('120 cost units')).toHaveLength(2)
    expect(screen.getByText('2026-10-01T00:00:00Z')).toHaveAttribute(
      'dateTime',
      '2026-10-01T00:00:00Z',
    )
    expect(
      screen.getByText('The baseline known graph selected AB and BD as the lowest-cost eligible path.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Deterministic rule-based fallback was used/i)).toBeInTheDocument()
    expect(screen.getByText(/ML contribution: 0 cost units/i)).toBeInTheDocument()
    expect(screen.getByText(/not live navigation data/i)).toBeInTheDocument()
  })

  it('keeps idle, empty, and loading states distinct and free of stale route facts', () => {
    const { rerender } = render(<RouteSummary status="idle" />)
    expect(screen.getByRole('status')).toHaveTextContent(/No route requested/i)
    expect(screen.getByRole('status')).toHaveTextContent(/Submit a route request/i)

    rerender(<RouteSummary status="empty" />)
    expect(screen.getByRole('status')).toHaveTextContent(/No route result available/i)
    expect(screen.getByRole('status')).toHaveTextContent(/Review the request inputs/i)
    expect(screen.queryByText(/Submit a route request/i)).not.toBeInTheDocument()

    rerender(<RouteSummary status="loading" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/Loading route result/i)
    expect(screen.queryByText('120 m')).not.toBeInTheDocument()
  })

  it('makes no-route prominent and action-oriented without presenting a substitute', () => {
    render(<RouteSummary status="no-route" result={NO_ROUTE_RESULT} />)

    expect(
      screen.getByRole('alert', { name: /No eligible route under this controlled scenario/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No substitute path has been evaluated or shown/i)).toBeInTheDocument()
    expect(screen.getByText(/Review the request inputs or controlled scenario/i)).toBeInTheDocument()
    expect(screen.getByText(/controlled impassability disconnected destination/i)).toBeInTheDocument()
    expect(screen.queryByText(/120 m/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('labels cached route data as stale and displays its last-sync timestamp', () => {
    render(
      <RouteSummary
        status="stale"
        lastSyncedAt="2026-10-01T01:00:00Z"
        result={FOUND_RESULT}
      />,
    )

    expect(screen.getByText(/Cached \/ stale route result/i)).toBeInTheDocument()
    expect(screen.getByText('2026-10-01T01:00:00Z')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Previously recorded route result' })).toBeInTheDocument()
    expect(screen.getByText('120 m')).toBeInTheDocument()
  })

  it('renders stale state without stale facts when no cached result is supplied', () => {
    render(<RouteSummary status="stale" lastSyncedAt="2026-10-01T01:00:00Z" />)

    expect(screen.getByRole('status')).toHaveTextContent(/No current route result is available/i)
    expect(screen.queryByRole('heading', { name: 'Previously recorded route result' })).not.toBeInTheDocument()
  })

  it('keeps a cached no-route result clearly labeled as stale', () => {
    render(
      <RouteSummary
        status="stale"
        lastSyncedAt="2026-10-01T01:00:00Z"
        result={NO_ROUTE_RESULT}
      />,
    )

    expect(
      screen.getByRole('status', {
        name: /Previously recorded: no eligible route under this controlled scenario/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces unavailable errors and exposes retry only when retry is available', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <RouteSummary
        status="unavailable"
        message="The routing service is unavailable."
        retryable
        onRetry={onRetry}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Routing service unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/The routing service is unavailable/i)
    fireEvent.click(screen.getByRole('button', { name: 'Retry route request' }))
    expect(onRetry).toHaveBeenCalledOnce()

    rerender(<RouteSummary status="error" message="The response could not be read." />)
    expect(screen.getByRole('heading', { name: 'Route result error' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be read/i)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('route presentation parts', () => {
  it('only displays supplied cost fields and explanation', () => {
    const { rerender } = render(
      <>
        <RouteCostBreakdown breakdown={{ base: 12, ml_risk: 0 }} />
        <RouteExplanation explanation="Supplied explanation." />
      </>,
    )
    expect(screen.getByText('Base cost')).toBeInTheDocument()
    expect(screen.getByText('ML contribution')).toBeInTheDocument()
    expect(screen.queryByText('Deterministic risk contribution')).not.toBeInTheDocument()
    expect(screen.getByText('Supplied explanation.')).toBeInTheDocument()

    rerender(
      <>
        <RouteCostBreakdown />
        <RouteExplanation />
      </>,
    )
    expect(screen.queryByRole('heading', { name: 'Cost breakdown' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Route explanation' })).not.toBeInTheDocument()
  })

  it('identifies a deterministic fallback and renders provided warnings as readable text', () => {
    render(
      <RouteWarnings
        fallbackUsed
        mlContribution={0}
        warnings={['Synthetic controlled scenario; not live navigation data.']}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/Deterministic rule-based fallback/i)
    expect(screen.getByText(/ML contribution: 0 cost units/i)).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent(/not live navigation data/i)
  })

  it('renders no-route details when used independently', () => {
    render(<NoRouteState result={NO_ROUTE_RESULT} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/No eligible route under this controlled scenario/i)
    expect(screen.getByText(/Do not draw a straight-line or ordinary shortest-path substitute/i)).toBeInTheDocument()
  })
})
