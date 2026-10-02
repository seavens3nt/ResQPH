import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InteractiveFloodMap } from './InteractiveFloodMap'
import { buildMapLayerDataset } from './mapData'
import { toLeafletRouteCoordinates } from '../routing/types'
import type { RouteFoundResult } from '../routing/types'

const routeFound: RouteFoundResult = {
  status: 'route-found',
  route_id: 'route-known-graph-baseline',
  algorithm: 'astar',
  geometry: {
    type: 'LineString',
    coordinates: [[120.99, 14.604], [120.991, 14.6045], [120.9915, 14.6055]],
  },
  distance_m: 120,
  estimated_time_s: 120,
  total_cost: 120,
  edge_ids: ['AB', 'BD'],
  cost_breakdown: { base: 120, deterministic_risk: 0, ml_risk: 0 },
  fallback_used: true,
  warnings: ['Synthetic controlled scenario; not live navigation data.'],
  explanation: 'The baseline known graph selected AB and BD.',
  scenario_timestamp: '2026-10-01T00:00:00Z',
  model_version: null,
}

describe('InteractiveFloodMap Component', () => {
  it('renders default fixture-driven map with source time and non-live disclaimer', () => {
    render(<InteractiveFloodMap />)

    // Map container exists
    expect(document.getElementById('openmap-hazard-map')).toBeInTheDocument()

    // Legend tags with stats
    expect(screen.getByText(/OpenStreetMap · U-Belt controlled scenario/i)).toBeInTheDocument()
    expect(screen.getByText(/● Passable/i)).toBeInTheDocument()
    expect(screen.getByText(/▲ Restricted/i)).toBeInTheDocument()
    expect(screen.getByText(/✕ Impassable/i)).toBeInTheDocument()

    // Scenario metadata
    expect(screen.getByText(/Scenario:/i)).toBeInTheDocument()
    const dataset = buildMapLayerDataset()
    expect(screen.getByText(dataset.scenarioId)).toBeInTheDocument()
    expect(screen.getByText(dataset.sourceType.toUpperCase())).toBeInTheDocument()

    // Non-live disclaimer
    expect(screen.getByText(/Controlled scenario data · Not live PAGASA forecasting or official emergency dispatch/i)).toBeInTheDocument()

    // Tile switcher and layer toggles
    expect(screen.getByRole('button', { name: 'OpenStreetMap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tactical Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satellite View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Roads: ON/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Flood Hazard: ON/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Boundary: ON/i })).toBeInTheDocument()
  })

  it('renders observable loading state banner when loading', () => {
    render(<InteractiveFloodMap simulatedState="loading" />)
    expect(screen.getByText(/Loading road network and flood scenario map layers…/i)).toBeInTheDocument()
  })

  it('renders empty state banner when no records are available', () => {
    render(<InteractiveFloodMap simulatedState="empty" />)
    expect(screen.getByText(/No road edges or flood scenario records found in this fixture/i)).toBeInTheDocument()
  })

  it('renders error banner and preserves base map when fixture is malformed', () => {
    render(<InteractiveFloodMap simulatedState="malformed" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Map Layer Warning:/i)).toBeInTheDocument()
    expect(screen.getByText(/Malformed GeoJSON/i)).toBeInTheDocument()
    expect(document.getElementById('openmap-hazard-map')).toBeInTheDocument()
  })

  it('renders unavailable state as a visible warning while preserving the base map', () => {
    render(<InteractiveFloodMap simulatedState="unavailable" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/currently unavailable/i)
    expect(document.getElementById('openmap-hazard-map')).toBeInTheDocument()
  })

  it('toggles layer buttons between ON and OFF', () => {
    render(<InteractiveFloodMap />)

    const roadsBtn = screen.getByRole('button', { name: /Roads: ON/i })
    fireEvent.click(roadsBtn)
    expect(screen.getByRole('button', { name: /Roads: OFF/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Roads: OFF/i }))
    expect(screen.getByRole('button', { name: /Roads: ON/i })).toBeInTheDocument()
  })

  it('toggles accessible text alternative table and renders edge rows', () => {
    render(<InteractiveFloodMap />)

    const textAltBtn = screen.getByRole('button', { name: /View Text Alternative/i })
    expect(textAltBtn).toBeInTheDocument()

    fireEvent.click(textAltBtn)
    expect(screen.getByRole('button', { name: /Hide Text Alternative/i })).toBeInTheDocument()

    // Check table headers and rows
    expect(screen.getByText(/Accessible Road Network & Flood Passability Summary/i)).toBeInTheDocument()
    expect(screen.getByText('Edge ID')).toBeInTheDocument()
    const dataset = buildMapLayerDataset()
    expect(screen.getByText(dataset.edges[0].edgeId)).toBeInTheDocument()
    expect(
      screen.getAllByText(dataset.edges[0].passability.toUpperCase()).length,
    ).toBeGreaterThan(0)
  })

  it('does not claim or draw a calculated route when no result is supplied', () => {
    render(<InteractiveFloodMap />)
    expect(screen.getByText(/No route has been calculated/i)).toBeInTheDocument()
    expect(screen.queryByText(/Safety Score/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/RECOMMENDED ROUTE/i)).not.toBeInTheDocument()
  })

  it('renders route-found and no-route states from authoritative results', () => {
    const { rerender } = render(
      <InteractiveFloodMap routeState={{ status: 'route-found', result: routeFound }} />,
    )
    expect(screen.getByText(/Controlled-scenario route displayed/i)).toBeInTheDocument()

    rerender(<InteractiveFloodMap routeState={{
      status: 'no-route',
      result: {
        status: 'no-route',
        reason: 'controlled_impassability_disconnected_destination',
        warnings: ['No eligible route exists under the selected controlled scenario.'],
        scenario_timestamp: '2026-10-01T00:00:00Z',
      },
    }} />)
    expect(screen.getByText(/No substitute or straight-line route/i)).toBeInTheDocument()
  })

  it('converts only server-provided longitude/latitude geometry for Leaflet', () => {
    expect(toLeafletRouteCoordinates(routeFound)).toEqual([
      [14.604, 120.99],
      [14.6045, 120.991],
      [14.6055, 120.9915],
    ])
  })
})
