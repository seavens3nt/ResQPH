import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapLayerSummary } from './MapLayerSummary'

describe('MapLayerSummary Component', () => {
  it('renders default text alternative features with landmarks, coordinates, and text badges', () => {
    render(<MapLayerSummary />)

    // Heading
    expect(screen.getByText('Accessible Map Layer & Route Text Summary')).toBeInTheDocument()

    // Provenance badges
    expect(screen.getByText(/Source: CONTROLLED/i)).toBeInTheDocument()
    expect(screen.getByText(/Boundary: ubelt-pilot-v1/i)).toBeInTheDocument()
    expect(screen.getByText(/Scenario: scenario-controlled-001/i)).toBeInTheDocument()

    // Truthful prototype disclaimer
    expect(
      screen.getByText(/Essential map information is provided below in accessible text format/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Recommended routes reflect controlled algorithms and do not guarantee physical safety/i),
    ).toBeInTheDocument()

    // Default features text
    expect(screen.getByText('Loyola St. Segment (Impassable Barrier)')).toBeInTheDocument()
    expect(screen.getByText('Impassable (1.40m Depth)')).toBeInTheDocument()
    expect(screen.getByText(/Coords: 14\.6030° N, 120\.9910° E/i)).toBeInTheDocument()

    expect(screen.getByText('Severe Flood Ponding Zone')).toBeInTheDocument()
    expect(screen.getByText('Citizen Distress Beacon')).toBeInTheDocument()
    expect(screen.getByText('Rescue Team Alpha (Boat Unit)')).toBeInTheDocument()
    expect(screen.getByText('Evacuation Center (Concepcion / NU Gym)')).toBeInTheDocument()
  })

  it('renders route explanation with recommended corridor, simulated ETA, and avoided streets', () => {
    render(<MapLayerSummary />)

    expect(screen.getByText(/Corridor: Jhocson St\. Corridor/i)).toBeInTheDocument()
    expect(screen.getByText(/Simulated Transit: ~9 mins/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Lower controlled-scenario penalty score and zero impassable edge crossings/i),
    ).toBeInTheDocument()

    // Avoided hazardous streets
    expect(screen.getByText(/Avoided Hazardous Road Edges/i)).toBeInTheDocument()
    expect(screen.getByText(/Loyola St\. Shortcut:/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Water depth reaches 1\.40 m, exceeding the safe rescue craft threshold/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/\[Recorded depth: 140 cm\]/i)).toBeInTheDocument()
  })

  it('renders no-route state explaining that no eligible route exists without drawing an invented safe route', () => {
    render(
      <MapLayerSummary
        status="no-route"
        noRouteReason="All candidate paths in U-Belt exceed 1.50m flood depth."
      />,
    )

    expect(
      screen.getByText('NO ELIGIBLE ROUTE FOUND UNDER CONTROLLED SCENARIO'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/All candidate paths in U-Belt exceed 1\.50m flood depth\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/ResQPH never draws an invented straight-line or unverified safe path/i),
    ).toBeInTheDocument()

    // Ensure route card is not shown in no-route state
    expect(screen.queryByText(/Corridor: Jhocson St\. Corridor/i)).not.toBeInTheDocument()
  })

  it('renders empty state when features array is empty', () => {
    render(<MapLayerSummary features={[]} />)

    expect(screen.getByText('No Active Map Features')).toBeInTheDocument()
    expect(
      screen.getByText(/There are currently no active hazards, road edges, or beacons in this scenario/i),
    ).toBeInTheDocument()
  })

  it('renders loading state without displaying stale values as current', () => {
    render(<MapLayerSummary status="loading" />)

    expect(
      screen.getByText(/Loading text summary for map features and routing corridors\.\.\./i),
    ).toBeInTheDocument()
  })

  it('renders stale state banner with timestamp and refresh callback', () => {
    const onRetryMock = vi.fn()
    render(
      <MapLayerSummary
        status="stale"
        lastSyncedAt="2026-09-22T07:45:00Z"
        onRetry={onRetryMock}
      />,
    )

    expect(
      screen.getByText(/Last synced at 2026-09-22T07:45:00Z\. Showing recorded scenario state\./i),
    ).toBeInTheDocument()

    const refreshBtn = screen.getByRole('button', { name: /Refresh layer summary/i })
    fireEvent.click(refreshBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders unavailable state with error details and retry callback', () => {
    const onRetryMock = vi.fn()
    render(
      <MapLayerSummary
        status="unavailable"
        errorMessage="Database connection failed for study area."
        onRetry={onRetryMock}
      />,
    )

    expect(
      screen.getByText(/Database connection failed for study area\./i),
    ).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Retry loading layer summary/i })
    fireEvent.click(retryBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders custom features and custom route explanation cleanly', () => {
    const customFeature = {
      id: 'custom-f1',
      name: 'Legarda St. Overpass',
      type: 'road' as const,
      coordinates: '14.6010° N, 120.9900° E',
      severity: 'low' as const,
      statusText: 'Passable (Dry)',
      landmarkOrDetails: 'Elevated roadway',
      reason: 'Elevation prevents water accumulation.',
    }

    const customRoute = {
      recommendedCorridorName: 'Legarda Elevated Expressway',
      etaMinutes: 5,
      selectedReason: 'Dry elevated roadway.',
      avoidedStreets: [],
    }

    render(
      <MapLayerSummary
        features={[customFeature]}
        routeExplanation={customRoute}
      />,
    )

    expect(screen.getByText('Legarda St. Overpass')).toBeInTheDocument()
    expect(screen.getByText('Passable (Dry)')).toBeInTheDocument()
    expect(screen.getByText(/Location\/Landmark:/i).parentElement).toHaveTextContent('Elevated roadway')
    expect(screen.getByText(/Selection Rationale:/i).parentElement).toHaveTextContent('Dry elevated roadway.')
    expect(screen.getByText(/Corridor: Legarda Elevated Expressway/i)).toBeInTheDocument()
    expect(screen.getByText(/Simulated Transit: ~5 mins/i)).toBeInTheDocument()
  })
})
