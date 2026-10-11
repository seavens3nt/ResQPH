import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InteractiveFloodMap, STUDY_AREA_MIN_ZOOM } from './InteractiveFloodMap'
import { RESCUE_STATIONS, stationGooglePosition, stationMarkerData } from './stations'
import { toMapRouteCoordinates, type RouteFoundResult } from '../routing/types'

const routeFound: RouteFoundResult = {
  status: 'route-found',
  route_id: 'route-known-graph-baseline',
  algorithm: 'astar',
  geometry: { type: 'LineString', coordinates: [[120.99, 14.604], [120.991, 14.6045]] },
  distance_m: 120,
  estimated_time_s: 120,
  total_cost: 120,
  edge_ids: ['AB'],
  cost_breakdown: { base: 120, deterministic_risk: 0, ml_risk: 0 },
  fallback_used: true,
  warnings: ['Synthetic controlled scenario; not live navigation data.'],
  explanation: 'The baseline known graph selected AB.',
  scenario_timestamp: '2026-10-01T00:00:00Z',
  model_version: null,
}

describe('Google Maps rescue map', () => {
  it('uses a tested zoom floor that keeps the complete project-defined U-Belt rectangle in view', () => {
    expect(STUDY_AREA_MIN_ZOOM).toBe(13)
  })
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
    vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', '')
  })
  it('renders a Google map canvas and reports missing local key configuration', async () => {
    render(<InteractiveFloodMap showRouteStatus={false} />)
    expect(screen.getByRole('region', { name: 'Interactive Google Maps rescue map' })).toBeInTheDocument()
    expect(document.getElementById('google-rescue-map')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/VITE_GOOGLE_MAPS_API_KEY/)
  })

  it('keeps controlled layer status and route feedback visible while maps configuration is missing', async () => {
    render(<InteractiveFloodMap routeState={{ status: 'route-found', result: routeFound }} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Google Maps unavailable/)
    expect(screen.getByRole('button', { name: /Flood scenario: ON/i })).toBeInTheDocument()
    expect(screen.getByText(/Controlled-scenario route displayed/i)).toBeInTheDocument()
    expect(screen.getByText(/Not live PAGASA forecasting or official emergency dispatch/i)).toBeInTheDocument()
  })

  it('has five fixed headquarters markers with correctly converted coordinates and stable IDs', () => {
    const markers = stationMarkerData('iverson-fire-rescue')
    expect(markers).toHaveLength(5)
    expect(markers.map(({ station }) => station.station_id)).toEqual(RESCUE_STATIONS.map(({ station_id }) => station_id))
    expect(markers.map(({ position }, index) => [position, stationGooglePosition(RESCUE_STATIONS[index])])).toEqual(
      RESCUE_STATIONS.map((station) => [stationGooglePosition(station), stationGooglePosition(station)]),
    )
    expect(markers.filter(({ assigned }) => assigned).map(({ station }) => station.station_id)).toEqual(['iverson-fire-rescue'])
  })

  it('converts route GeoJSON longitude/latitude into map path latitude/longitude', () => {
    expect(toMapRouteCoordinates(routeFound)).toEqual([[14.604, 120.99], [14.6045, 120.991]])
  })
})
