import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDetail } from '../../api/missions'
import { evaluateRoute } from '../routing/routeApi'
import type { RouteFoundResult } from '../routing/types'
import { MissionRoute } from './MissionRoute'

vi.mock('../map/InteractiveFloodMap', () => ({InteractiveFloodMap: ({showRouteStatus}: {showRouteStatus?: boolean}) => <div data-testid="route-map" data-show-status={String(showRouteStatus)}/>}))
vi.mock('../routing/routeApi', async original => ({...await original<typeof import('../routing/routeApi')>(), evaluateRoute: vi.fn()}))

const mission = {id:'mission-one',status:'assigned',request_summary:{location:{address:'Synthetic U-Belt location',point:{type:'Point',coordinates:[120.9946,14.6042]}}}} as MissionDetail
const found: RouteFoundResult = {status:'route-found',route_id:'route-one',geometry:{type:'LineString',coordinates:[[120.993,14.604],[120.9946,14.6042]]},distance_m:98,estimated_time_s:14,total_cost:100,edge_ids:['AB'],cost_breakdown:{base:98,deterministic_risk:2,ml_risk:0},fallback_used:true,warnings:[],explanation:'Controlled flood penalties applied.',scenario_timestamp:'2026-10-07T00:00:00Z',model_version:null}

function wrapper({children}: {children: React.ReactNode}) {return <QueryClientProvider client={new QueryClient({defaultOptions:{mutations:{retry:false}}})}>{children}</QueryClientProvider>}

describe('Single mission route workflow', () => {
  beforeEach(() => {vi.clearAllMocks(); vi.mocked(evaluateRoute).mockResolvedValue(found)})
  it('evaluates once on entry with model risk off; optional model choice requires explicit recalculation', async () => {
    const view = render(<MissionRoute mission={mission}/>, {wrapper})
    await screen.findByText('Route found:')
    expect(evaluateRoute).toHaveBeenCalledTimes(1)
    expect(evaluateRoute).toHaveBeenCalledWith(expect.objectContaining({include_ml_penalty:false}), expect.anything())
    view.rerender(<MissionRoute mission={{...mission}}/>)
    expect(evaluateRoute).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('route-map')).toHaveAttribute('data-show-status', 'false')
    fireEvent.click(screen.getByText('Method and routing details'))
    fireEvent.click(screen.getByLabelText('Include optional model risk on the next calculation'))
    expect(evaluateRoute).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', {name: 'Recalculate mission route'}))
    await waitFor(() => expect(evaluateRoute).toHaveBeenCalledTimes(2))
    expect(vi.mocked(evaluateRoute).mock.calls[1][0].include_ml_penalty).toBe(true)
  })
  it('does not calculate offline and makes one calculation on first connection', async () => {
    const view = render(<MissionRoute mission={mission} offline/>, {wrapper})
    expect(evaluateRoute).not.toHaveBeenCalled()
    expect(screen.getByRole('button', {name: 'Calculate mission route'})).toBeDisabled()
    view.rerender(<MissionRoute mission={mission}/>)
    await screen.findByText('Route found:')
    expect(evaluateRoute).toHaveBeenCalledTimes(1)
  })
  it('clears the previous route when the selected mission changes', async () => {
    const view = render(<MissionRoute mission={mission}/>, {wrapper})
    await screen.findByText('Route found:')
    vi.mocked(evaluateRoute).mockReturnValueOnce(new Promise(() => {}))
    view.rerender(<MissionRoute mission={{...mission,id:'mission-two'}}/>)
    expect(screen.queryByText('Route found:')).not.toBeInTheDocument()
    await waitFor(() => expect(evaluateRoute).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', {name: 'Calculating…'})).toBeDisabled()
  })
})
