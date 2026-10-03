import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import routeFoundFixtureText from '../../../../data/samples/route-found.example.json?raw'
import noRouteFixtureText from '../../../../data/samples/no-route.example.json?raw'
import type { NoRouteResult, RouteFoundResult } from './types'
import { RoutePlannerPanel } from './RoutePlannerPanel'
import { CONTROLLED_NO_ROUTE_REQUEST, CONTROLLED_ROUTE_REQUEST } from './routeScenarios'

const routeFound = JSON.parse(routeFoundFixtureText) as RouteFoundResult
const noRoute = JSON.parse(noRouteFixtureText) as NoRouteResult

describe('RoutePlannerPanel', () => {
  it('submits the locked eligible and no-route controlled cases', () => {
    const onRequest = vi.fn()
    render(<RoutePlannerPanel state={{ status: 'idle' }} onRequest={onRequest} onRetry={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Calculate eligible route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Test explicit no-route case' }))

    expect(onRequest).toHaveBeenNthCalledWith(1, CONTROLLED_ROUTE_REQUEST)
    expect(onRequest).toHaveBeenNthCalledWith(2, CONTROLLED_NO_ROUTE_REQUEST)
    expect(screen.getByText(/not live navigation/i)).toBeInTheDocument()
    expect(screen.getByText('Runtime ML disabled')).toBeInTheDocument()
  })

  it('disables both actions and announces loading', () => {
    render(<RoutePlannerPanel state={{ status: 'loading' }} onRequest={vi.fn()} onRetry={vi.fn()} />)

    expect(screen.getAllByRole('button')).toSatisfy((buttons: HTMLElement[]) =>
      buttons.every((button) => button.hasAttribute('disabled')),
    )
    expect(screen.getByRole('status')).toHaveTextContent(/Loading route result/i)
  })

  it('presents returned route-found and no-route results without inventing data', () => {
    const { rerender } = render(
      <RoutePlannerPanel
        state={{ status: 'route-found', result: routeFound }}
        onRequest={vi.fn()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Route result' })).toBeInTheDocument()
    expect(screen.getByText(/Deterministic rule-based fallback/i)).toBeInTheDocument()

    rerender(
      <RoutePlannerPanel
        state={{ status: 'no-route', result: noRoute }}
        onRequest={vi.fn()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert', { name: /No eligible route/i })).toBeInTheDocument()
    expect(screen.queryByText('120 m')).not.toBeInTheDocument()
  })

  it('offers retry only for a retryable service error', () => {
    const onRetry = vi.fn()
    render(
      <RoutePlannerPanel
        state={{ status: 'error', kind: 'network', message: 'Service unavailable.', retryable: true }}
        onRequest={vi.fn()}
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry route request' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
