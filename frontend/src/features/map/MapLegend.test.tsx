import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DEFAULT_LEGEND_ITEMS, MapLegend } from './MapLegend'

const LEGEND_PROPS = {
  items: DEFAULT_LEGEND_ITEMS,
  scenarioTimestamp: '2026-09-22T00:00:00Z',
  sourceType: 'controlled' as const,
}

describe('MapLegend Component', () => {
  it('renders default legend entries with text-supported badges and symbols (not color-only)', () => {
    render(<MapLegend {...LEGEND_PROPS} />)

    // Title
    expect(screen.getByText('Map Legend & Hazard Severity')).toBeInTheDocument()

    // Flood entries with text badges, symbols, and shape descriptions
    expect(screen.getByText('CRITICAL (>1.5M)')).toBeInTheDocument()
    expect(screen.getByText('MODERATE (0.5-0.8M)')).toBeInTheDocument()
    expect(screen.getByText('LOW (<0.3M)')).toBeInTheDocument()

    // Road entries
    expect(screen.getByText('IMPASSABLE')).toBeInTheDocument()
    expect(screen.getByText('RESTRICTED')).toBeInTheDocument()
    expect(screen.getByText('PASSABLE')).toBeInTheDocument()

    // Route entries: verify approved wording "recommended corridor", never "safe route"
    expect(screen.getByText('RECOMMENDED CORRIDOR')).toBeInTheDocument()
    expect(screen.getByText('ALTERNATIVE DETOUR')).toBeInTheDocument()
    expect(screen.getByText('AVOIDED SHORTCUT')).toBeInTheDocument()

    // Marker entries
    expect(screen.getByText('DISTRESS TARGET')).toBeInTheDocument()
    expect(screen.getByText('RESCUE ASSET')).toBeInTheDocument()
    expect(screen.getByText('SHELTER')).toBeInTheDocument()

    // Text shape/pattern descriptions ensuring WCAG 1.4.1 compliance
    expect(
      screen.getByText(/Pattern: Red diagonal hatching with solid red border/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Pattern: Solid amber fill with amber border/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Pattern: Green dashed path with prominent weight/i),
    ).toBeInTheDocument()

    // Truthful footer scope
    expect(
      screen.getByText(/Recommended corridors reflect controlled routing algorithms and do not guarantee safe passage/i),
    ).toBeInTheDocument()
  })

  it('supports interactive layer toggling via keyboard and clicks with aria-pressed', () => {
    const onToggleMock = vi.fn()
    render(
      <MapLegend
        {...LEGEND_PROPS}
        activeLayerIds={['flood-critical', 'route-recommended']}
        onToggleLayer={onToggleMock}
      />,
    )

    // Find the toggle button for Critical Flood Zone
    const criticalToggle = screen.getByRole('button', {
      name: /Toggle layer: Critical Flood Zone \(>1\.5m\)\. Status: Visible/i,
    })
    expect(criticalToggle).toHaveAttribute('aria-pressed', 'true')

    // Click to toggle
    fireEvent.click(criticalToggle)
    expect(onToggleMock).toHaveBeenCalledWith('flood-critical')

    // Find an inactive layer toggle
    const moderateToggle = screen.getByRole('button', {
      name: /Toggle layer: Moderate Flood Ponding \(0\.5m - 0\.8m\)\. Status: Hidden/i,
    })
    expect(moderateToggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(moderateToggle)
    expect(onToggleMock).toHaveBeenCalledWith('flood-moderate')
  })

  it('supports collapsible behavior with aria-expanded and aria-controls', () => {
    render(<MapLegend {...LEGEND_PROPS} collapsible defaultExpanded={true} />)

    const collapseBtn = screen.getByRole('button', { name: /Collapse map legend/i })
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true')
    const controlledBodyId = collapseBtn.getAttribute('aria-controls')
    expect(controlledBodyId).toBeTruthy()
    expect(document.getElementById(controlledBodyId!)).toBeInTheDocument()
    expect(screen.getByText('CRITICAL (>1.5M)')).toBeInTheDocument()

    // Collapse
    fireEvent.click(collapseBtn)
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('CRITICAL (>1.5M)')).not.toBeInTheDocument()

    // Expand again
    fireEvent.click(collapseBtn)
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('CRITICAL (>1.5M)')).toBeInTheDocument()
  })

  it('renders empty-layer state when items list is empty', () => {
    render(<MapLegend {...LEGEND_PROPS} items={[]} />)

    expect(screen.getByText('No Active Map Layers')).toBeInTheDocument()
    expect(
      screen.getByText(/There are currently no active flood or route layers in this controlled scenario/i),
    ).toBeInTheDocument()
  })

  it('renders loading state without displaying stale values as current', () => {
    render(<MapLegend {...LEGEND_PROPS} status="loading" />)

    expect(
      screen.getByText(/Loading map legend and layer metadata\.\.\./i),
    ).toBeInTheDocument()
  })

  it('renders stale state banner with timestamp and refresh callback', () => {
    const onRetryMock = vi.fn()
    render(
      <MapLegend
        {...LEGEND_PROPS}
        status="stale"
        lastSyncedAt="2026-09-22T08:00:00Z"
        onRetry={onRetryMock}
      />,
    )

    expect(screen.getByText(/Cached Legend \(Synced: 2026-09-22T08:00:00Z\)/i)).toBeInTheDocument()

    const refreshBtn = screen.getByRole('button', { name: /Refresh stale map legend/i })
    fireEvent.click(refreshBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders unavailable state banner with error details and retry callback', () => {
    const onRetryMock = vi.fn()
    render(
      <MapLegend
        {...LEGEND_PROPS}
        status="unavailable"
        errorMessage="Failed to fetch legend metadata."
        onRetry={onRetryMock}
      />,
    )

    expect(screen.getByText(/Failed to fetch legend metadata\./i)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Retry loading legend/i })
    fireEvent.click(retryBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('CRITICAL (>1.5M)')).not.toBeInTheDocument()
  })

  it('renders custom items without mutating default items', () => {
    const customItem = {
      id: 'custom-hazard-1',
      label: 'Submerged Bridge Edge',
      category: 'flood' as const,
      textBadge: 'HAZARD',
      symbol: '⚠',
      shapeDescription: 'Orange zigzag stripe',
      shapeClass: 'map-legend__shape--custom',
      description: 'Bridge approach submerged under controlled runoff.',
    }

    render(<MapLegend {...LEGEND_PROPS} items={[customItem]} />)
    expect(screen.getByText('Submerged Bridge Edge')).toBeInTheDocument()
    expect(screen.getByText('HAZARD')).toBeInTheDocument()
    expect(screen.getByText(/Orange zigzag stripe/i)).toBeInTheDocument()
    // Verify default items are not in document
    expect(screen.queryByText('CRITICAL (>1.5M)')).not.toBeInTheDocument()
  })

  it('uses unique collapse target IDs when multiple legends render on one page', () => {
    render(
      <>
        <MapLegend {...LEGEND_PROPS} title="Primary map legend" />
        <MapLegend {...LEGEND_PROPS} title="Comparison map legend" />
      </>,
    )

    const targetIds = screen
      .getAllByRole('button', { name: /Collapse map legend/i })
      .map((button) => button.getAttribute('aria-controls'))

    expect(targetIds[0]).toBeTruthy()
    expect(targetIds[1]).toBeTruthy()
    expect(targetIds[0]).not.toBe(targetIds[1])
  })
})
