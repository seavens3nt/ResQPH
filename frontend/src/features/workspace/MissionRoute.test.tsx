import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDetail } from '../../api/missions'
import { MissionRoute } from './MissionRoute'

const journey = vi.hoisted(() => ({
  mission: { data: undefined as MissionDetail | undefined, isError: false },
  tracking: { data: undefined as { position: { type: 'Point'; coordinates: [number, number] } | null } | undefined, isError: false },
}))
vi.mock('../missions/useMissionJourney', async (original) => ({
  ...await original<typeof import('../missions/useMissionJourney')>(),
  useMissionJourney: () => journey,
}))
vi.mock('../map/InteractiveFloodMap', () => ({
  InteractiveFloodMap: (props: Record<string, unknown>) => <div data-testid="route-map" data-route-points={JSON.stringify(props.routeGeometry)} data-position={JSON.stringify(props.trackingPosition)} />,
}))

const mission = {
  id: 'mission-one',
  request_id: 'request-one',
  team_id: 'team-iverson-fire-rescue',
  station_id: 'iverson-fire-rescue',
  status: 'assigned',
  latest_route_result: {
    status: 'route-found', route_id: 'stored-route-7', distance_m: 845, estimated_time_s: 220,
    explanation: 'Shortest path through the controlled graph.',
    geometry: { type: 'LineString', coordinates: [[120.9972, 14.6071], [120.995, 14.603], [120.9946, 14.6042]] },
  },
  request_summary: { location: { address: 'Synthetic incident', point: { type: 'Point', coordinates: [120.9946, 14.6042] } } },
} as unknown as MissionDetail

describe('persisted shared mission route', () => {
  beforeEach(() => {
    journey.mission.data = undefined
    journey.mission.isError = false
    journey.tracking.data = { position: { type: 'Point', coordinates: [120.996, 14.606] } }
    journey.tracking.isError = false
  })

  it('renders the stored station-to-incident route with the authoritative tracking position', () => {
    render(<MissionRoute mission={mission} />)
    expect(screen.getByText('Assigned station route')).toBeInTheDocument()
    expect(screen.getByText('Iverson Fire and Rescue Volunteer')).toBeInTheDocument()
    expect(screen.getByText('845 m')).toBeInTheDocument()
    expect(screen.getByText('stored-route-7')).toBeInTheDocument()
    const map = screen.getByTestId('route-map')
    expect(map).toHaveAttribute('data-route-points', JSON.stringify([[120.9972,14.6071],[120.995,14.603],[120.9946,14.6042]]))
    expect(map).toHaveAttribute('data-position', JSON.stringify({type:'Point',coordinates:[120.996,14.606]}))
  })

  it('shows an explicit route-unavailable state without inventing geometry', () => {
    render(<MissionRoute mission={{ ...mission, latest_route_result: null }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/No accepted route geometry/)
    expect(screen.getByTestId('route-map')).toHaveAttribute('data-route-points', '[]')
  })

  it('does not show an uncached map or tracking state while offline', () => {
    render(<MissionRoute mission={mission} offline />)
    expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Reconnect to refresh tracking/)
  })
})
