import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  MapLayerSummary,
  type MapLayerFeature,
  type MapRouteExplanation,
} from './MapLayerSummary'

const FEATURES: MapLayerFeature[] = [
  {
    id: 'edge-demo-001',
    name: 'Controlled fixture road edge',
    type: 'road',
    coordinates: '14.6035° N, 120.9940° E to 14.6042° N, 120.9946° E',
    severity: 'moderate',
    statusText: 'Restricted (30 cm controlled depth)',
    landmarkOrDetails: 'Sanitized U-Belt sample corridor',
    reason: 'Controlled flood fixture marks this edge as restricted.',
  },
]

const ROUTE: MapRouteExplanation = {
  recommendedCorridorName: 'Controlled fixture corridor',
  etaMinutes: 9,
  distanceMeters: 850,
  selectedReason: 'Lowest eligible deterministic cost in the supplied scenario.',
  avoidedStreets: [
    {
      streetName: 'Impassable fixture edge',
      reason: 'Excluded by the deterministic passability rule.',
      depthCm: 0,
    },
  ],
}

const SUMMARY_PROPS = {
  scenarioId: 'scenario-controlled-001',
  scenarioTimestamp: '2026-09-22T00:00:00Z',
  sourceType: 'controlled' as const,
  studyAreaId: 'ubelt-pilot-v1',
  features: FEATURES,
  routeExplanation: ROUTE,
}

describe('MapLayerSummary Component', () => {
  it('renders default text alternative features with landmarks, coordinates, and text badges', () => {
    render(<MapLayerSummary {...SUMMARY_PROPS} />)

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
    expect(screen.getByText('Controlled fixture road edge')).toBeInTheDocument()
    expect(screen.getByText('Restricted (30 cm controlled depth)')).toBeInTheDocument()
    expect(screen.getByText(/Coords: 14\.6035° N, 120\.9940° E/i)).toBeInTheDocument()
  })

  it('renders route explanation with recommended corridor, simulated ETA, and avoided streets', () => {
    render(<MapLayerSummary {...SUMMARY_PROPS} />)

    expect(screen.getByText(/Corridor: Controlled fixture corridor/i)).toBeInTheDocument()
    expect(screen.getByText(/Simulated Transit: ~9 mins/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Lowest eligible deterministic cost in the supplied scenario/i),
    ).toBeInTheDocument()

    // Avoided hazardous streets
    expect(screen.getByText(/Avoided Hazardous Road Edges/i)).toBeInTheDocument()
    expect(screen.getByText(/Impassable fixture edge:/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Excluded by the deterministic passability rule/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/\[Recorded depth: 0 cm\]/i)).toBeInTheDocument()
  })

  it('renders no-route state explaining that no eligible route exists without drawing an invented safe route', () => {
    render(
      <MapLayerSummary
        {...SUMMARY_PROPS}
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
    expect(screen.queryByText(/Corridor: Controlled fixture corridor/i)).not.toBeInTheDocument()
  })

  it('renders empty state when features array is empty', () => {
    render(<MapLayerSummary {...SUMMARY_PROPS} features={[]} />)

    expect(screen.getByText('No Active Map Features')).toBeInTheDocument()
    expect(
      screen.getByText(/There are currently no active hazards, road edges, or beacons in this scenario/i),
    ).toBeInTheDocument()
  })

  it('renders loading state without displaying stale values as current', () => {
    render(<MapLayerSummary {...SUMMARY_PROPS} status="loading" />)

    expect(
      screen.getByText(/Loading text summary for map features and routing corridors\.\.\./i),
    ).toBeInTheDocument()
  })

  it('renders stale state banner with timestamp and refresh callback', () => {
    const onRetryMock = vi.fn()
    render(
      <MapLayerSummary
        {...SUMMARY_PROPS}
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
        {...SUMMARY_PROPS}
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
        {...SUMMARY_PROPS}
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

  it('uses unique labelled-by IDs when multiple summaries render together', () => {
    render(
      <>
        <MapLayerSummary {...SUMMARY_PROPS} title="Primary map summary" />
        <MapLayerSummary {...SUMMARY_PROPS} title="Comparison map summary" />
      </>,
    )

    const routeSections = screen
      .getAllByText('Controlled Scenario Route Explanation')
      .map((heading) => heading.closest('.map-layer-summary__section'))
    const labelledByIds = routeSections.map((section) => section?.getAttribute('aria-labelledby'))

    expect(labelledByIds[0]).toBeTruthy()
    expect(labelledByIds[1]).toBeTruthy()
    expect(labelledByIds[0]).not.toBe(labelledByIds[1])
  })
})
