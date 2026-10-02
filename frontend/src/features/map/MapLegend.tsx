import React, { useId, useState } from 'react'
import './MapLegend.css'

export type LegendCategory = 'flood' | 'passability' | 'route' | 'marker'

export interface LegendItem {
  /** Unique identifier for layer toggling and tracking */
  id: string
  /** Human-readable name of the layer or map feature */
  label: string
  /** Classification grouping */
  category: LegendCategory
  /** Explicit text status/severity badge (e.g. "CRITICAL", "MODERATE", "RECOMMENDED") */
  textBadge: string
  /** Distinct visual glyph or symbol (e.g. "✕", "▲", "✓", "🚨") */
  symbol: string
  /** Visual pattern/shape description for non-color accessibility */
  shapeDescription: string
  /** Specific CSS class applied to shape indicator */
  shapeClass: string
  /** Text description of criteria and physical meaning */
  description: string
  /** Specific badge style modifier */
  badgeVariant?: 'critical' | 'moderate' | 'recommended' | 'passable' | 'impassable' | 'default'
  /** Optional depth or parameter label */
  parameter?: string
  /** Whether the layer is active / visible */
  isActive?: boolean
}

export interface MapLegendProps {
  /** Legend items derived by the caller from the visible scenario layers. */
  items: LegendItem[]
  /** Array of currently active layer IDs */
  activeLayerIds?: string[]
  /** Callback fired when user toggles an interactive layer */
  onToggleLayer?: (layerId: string) => void
  /** Presentation state */
  status?: 'ready' | 'loading' | 'empty' | 'stale' | 'unavailable'
  /** Timestamp when the legend data was cached or synced */
  lastSyncedAt?: string
  /** Error detail if status is unavailable */
  errorMessage?: string
  /** Callback for retrying when unavailable or stale */
  onRetry?: () => void
  /** Allows collapsing the legend panel on small screens */
  collapsible?: boolean
  /** Initial expansion state when collapsible */
  defaultExpanded?: boolean
  /** Scenario timestamp for provenance display */
  scenarioTimestamp: string
  /** Origin/authority of scenario data */
  sourceType: 'controlled' | 'historical' | 'unverified'
  /** Header title */
  title?: string
  className?: string
}

// oxlint-disable-next-line react/only-export-components -- shared immutable legend fixture for consumers and tests.
export const DEFAULT_LEGEND_ITEMS: LegendItem[] = [
  // 1. Flood Hazard Severity
  {
    id: 'flood-critical',
    label: 'Critical Flood Zone (>1.5m)',
    category: 'flood',
    textBadge: 'CRITICAL (>1.5M)',
    symbol: '✕',
    shapeDescription: 'Red diagonal hatching with solid red border',
    shapeClass: 'map-legend__shape--flood-critical',
    description: 'Torrential water depth exceeding 1.50m. Impassable for all standard craft.',
    badgeVariant: 'critical',
    parameter: 'Depth > 150 cm',
  },
  {
    id: 'flood-moderate',
    label: 'Moderate Flood Ponding (0.5m - 0.8m)',
    category: 'flood',
    textBadge: 'MODERATE (0.5-0.8M)',
    symbol: '▲',
    shapeDescription: 'Solid amber fill with amber border',
    shapeClass: 'map-legend__shape--flood-moderate',
    description: 'Knee-to-waist backflow. High-clearance vehicles or rescue craft required.',
    badgeVariant: 'moderate',
    parameter: 'Depth 50-80 cm',
  },
  {
    id: 'flood-low',
    label: 'Low Ponding / Passable (<0.3m)',
    category: 'flood',
    textBadge: 'LOW (<0.3M)',
    symbol: '○',
    shapeDescription: 'Dotted yellow outline with light tint',
    shapeClass: 'map-legend__shape--flood-low',
    description: 'Shallow ankle-level water. Passable with operational caution.',
    badgeVariant: 'passable',
    parameter: 'Depth < 30 cm',
  },

  // 2. Road Network Passability
  {
    id: 'road-impassable',
    label: 'Impassable Road Edge',
    category: 'passability',
    textBadge: 'IMPASSABLE',
    symbol: '✕',
    shapeDescription: 'Thick solid crimson line with dark border',
    shapeClass: 'map-legend__shape--road-impassable',
    description: 'Road segment fully blocked by flood barrier or debris. Excluded from routing.',
    badgeVariant: 'impassable',
  },
  {
    id: 'road-restricted',
    label: 'Restricted Road Edge',
    category: 'passability',
    textBadge: 'RESTRICTED',
    symbol: '⚠',
    shapeDescription: 'Amber dashed line with stripe pattern',
    shapeClass: 'map-legend__shape--road-restricted',
    description: 'Transit permissible only with specialized high-clearance assets.',
    badgeVariant: 'moderate',
  },
  {
    id: 'road-passable',
    label: 'Passable Road Segment',
    category: 'passability',
    textBadge: 'PASSABLE',
    symbol: '✓',
    shapeDescription: 'Thin solid green stroke with tint',
    shapeClass: 'map-legend__shape--road-passable',
    description: 'Clear road conditions under controlled U-Belt scenario.',
    badgeVariant: 'passable',
  },

  // 3. Routing Corridors
  {
    id: 'route-recommended',
    label: 'Recommended Corridor',
    category: 'route',
    textBadge: 'RECOMMENDED CORRIDOR',
    symbol: '━━━',
    shapeDescription: 'Green dashed path with prominent weight',
    shapeClass: 'map-legend__shape--route-recommended',
    description:
      'Recommended route under selected controlled scenario. Avoids impassable edges.',
    badgeVariant: 'recommended',
  },
  {
    id: 'route-alternative',
    label: 'Alternative Detour',
    category: 'route',
    textBadge: 'ALTERNATIVE DETOUR',
    symbol: '---',
    shapeDescription: 'Amber dotted line',
    shapeClass: 'map-legend__shape--route-alternative',
    description: 'Secondary route option under moderate ponding conditions.',
    badgeVariant: 'moderate',
  },
  {
    id: 'route-avoided',
    label: 'Avoided Shortcut (Flood Barrier)',
    category: 'route',
    textBadge: 'AVOIDED SHORTCUT',
    symbol: '▰▰',
    shapeDescription: 'Solid red bar with black outline',
    shapeClass: 'map-legend__shape--route-avoided',
    description: 'Direct road segment rejected by router due to depth threshold violation.',
    badgeVariant: 'critical',
  },

  // 4. Map Points / Markers
  {
    id: 'marker-distress',
    label: 'Citizen Distress Beacon',
    category: 'marker',
    textBadge: 'DISTRESS TARGET',
    symbol: '🚨',
    shapeDescription: 'Circular red pulsing marker',
    shapeClass: 'map-legend__shape--marker-distress',
    description: 'Reported distress location within controlled pilot boundary.',
    badgeVariant: 'critical',
  },
  {
    id: 'marker-rescuer',
    label: 'Rescue Boat Unit',
    category: 'marker',
    textBadge: 'RESCUE ASSET',
    symbol: '🚤',
    shapeDescription: 'Circular cyan marker with boat glyph',
    shapeClass: 'map-legend__shape--marker-rescuer',
    description: 'Simulated deployed rescue team position en route.',
    badgeVariant: 'default',
  },
  {
    id: 'marker-evacuation',
    label: 'Evacuation Center',
    category: 'marker',
    textBadge: 'SHELTER',
    symbol: '🏫',
    shapeDescription: 'Square green marker with building glyph',
    shapeClass: 'map-legend__shape--marker-evacuation',
    description: 'Sanitized scenario evacuation or assembly marker.',
    badgeVariant: 'recommended',
  },
]

const CATEGORY_NAMES: Record<LegendCategory, string> = {
  flood: 'Flood Hazard Depth',
  passability: 'Road Passability',
  route: 'Scenario Routing Corridors',
  marker: 'Map Points & Beacons',
}

export const MapLegend: React.FC<MapLegendProps> = ({
  items,
  activeLayerIds,
  onToggleLayer,
  status = 'ready',
  lastSyncedAt,
  errorMessage,
  onRetry,
  collapsible = true,
  defaultExpanded = true,
  scenarioTimestamp,
  sourceType,
  title = 'Map Legend & Hazard Severity',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const legendBodyId = useId()

  const effectiveStatus = items.length === 0 && status === 'ready' ? 'empty' : status

  // Group items by category
  const categories: LegendCategory[] = ['flood', 'passability', 'route', 'marker']

  const isLayerActive = (item: LegendItem) => {
    if (activeLayerIds) {
      return activeLayerIds.includes(item.id)
    }
    return item.isActive !== false
  }

  const handleToggle = (id: string) => {
    if (onToggleLayer) {
      onToggleLayer(id)
    }
  }

  return (
    <section
      className={`map-legend ${className}`}
      aria-label={title}
      role="region"
    >
      {/* Legend Header */}
      <div className="map-legend__header">
        <h3 className="map-legend__header-title">
          <span aria-hidden="true">🗺️</span>
          <span>{title}</span>
        </h3>

        {collapsible && (
          <button
            type="button"
            className="map-legend__collapse-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={legendBodyId}
            aria-label={isExpanded ? 'Collapse map legend' : 'Expand map legend'}
          >
            <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
            <span>{isExpanded ? 'Hide' : 'Show'}</span>
          </button>
        )}
      </div>

      {/* Stale Cache Notice */}
      {effectiveStatus === 'stale' && (
        <div
          className="map-legend__status-banner map-legend__status-banner--stale"
          role="status"
          aria-live="polite"
        >
          <span>
            ⚠️ Cached Legend {lastSyncedAt ? `(Synced: ${lastSyncedAt})` : ''}
          </span>
          {onRetry && (
            <button
              type="button"
              className="map-legend__retry-btn"
              onClick={onRetry}
              aria-label="Refresh stale map legend"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {/* Unavailable State Notice */}
      {effectiveStatus === 'unavailable' && (
        <div
          className="map-legend__status-banner map-legend__status-banner--unavailable"
          role="alert"
          aria-live="assertive"
        >
          <span>❌ {errorMessage || 'Legend data unavailable for this scenario.'}</span>
          {onRetry && (
            <button
              type="button"
              className="map-legend__retry-btn"
              onClick={onRetry}
              aria-label="Retry loading legend"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Expandable Body */}
      {isExpanded && (
        <div className="map-legend__body" id={legendBodyId}>
          {effectiveStatus === 'loading' && (
            <div className="map-legend__loading-state" role="status" aria-live="polite">
              <span className="map-legend__loading-icon" aria-hidden="true">
                ⏳
              </span>
              <p>Loading map legend and layer metadata...</p>
            </div>
          )}

          {effectiveStatus === 'empty' && (
            <div className="map-legend__empty-state" role="status">
              <span className="map-legend__empty-icon" aria-hidden="true">
                📭
              </span>
              <p className="map-legend__empty-title">No Active Map Layers</p>
              <p className="map-legend__empty-hint">
                There are currently no active flood or route layers in this controlled scenario.
                Toggle scenario layers on the map controls to display legend entries.
              </p>
            </div>
          )}

          {effectiveStatus !== 'loading' &&
            effectiveStatus !== 'empty' &&
            effectiveStatus !== 'unavailable' && (
            <>
              {categories.map((cat) => {
                const categoryItems = items.filter((item) => item.category === cat)
                if (categoryItems.length === 0) return null

                return (
                  <div key={cat} className="map-legend__category" role="group" aria-label={CATEGORY_NAMES[cat]}>
                    <h4 className="map-legend__category-title">{CATEGORY_NAMES[cat]}</h4>
                    <ul className="map-legend__list" role="list">
                      {categoryItems.map((item) => {
                        const active = isLayerActive(item)
                        const isInteractive = Boolean(onToggleLayer)

                        return (
                          <li
                            key={item.id}
                            className={`map-legend__item ${!active ? 'map-legend__item--inactive' : ''}`}
                          >
                            {isInteractive ? (
                              <button
                                type="button"
                                className="map-legend__toggle-btn"
                                onClick={() => handleToggle(item.id)}
                                aria-pressed={active}
                                aria-label={`Toggle layer: ${item.label}. Status: ${active ? 'Visible' : 'Hidden'}`}
                              >
                                <div className="map-legend__item-header">
                                  <span
                                    className={`map-legend__shape-indicator ${item.shapeClass}`}
                                    aria-hidden="true"
                                  >
                                    {item.symbol}
                                  </span>

                                  <span
                                    className={`map-legend__text-badge map-legend__text-badge--${item.badgeVariant || 'default'}`}
                                  >
                                    {item.textBadge}
                                  </span>

                                  <span className="map-legend__item-label">{item.label}</span>
                                </div>

                                <span
                                  className={`map-legend__active-pill ${active ? 'map-legend__active-pill--on' : ''}`}
                                  aria-hidden="true"
                                >
                                  {active ? 'ON' : 'OFF'}
                                </span>
                              </button>
                            ) : (
                              <div className="map-legend__item-header">
                                <span
                                  className={`map-legend__shape-indicator ${item.shapeClass}`}
                                  aria-hidden="true"
                                >
                                  {item.symbol}
                                </span>

                                <span
                                  className={`map-legend__text-badge map-legend__text-badge--${item.badgeVariant || 'default'}`}
                                >
                                  {item.textBadge}
                                </span>

                                <span className="map-legend__item-label">{item.label}</span>
                              </div>
                            )}

                            <div className="map-legend__item-details">
                              <span className="map-legend__item-desc">{item.description}</span>
                              <span className="map-legend__shape-desc">
                                Pattern: {item.shapeDescription}
                              </span>
                              {item.parameter && (
                                <span className="map-legend__param">
                                  Threshold: <strong>{item.parameter}</strong>
                                </span>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </>
          )}

          {/* Footer note conforming to non-guaranteed safety disclosure */}
          <div className="map-legend__footer">
            <span>
              <strong>Scope:</strong> {sourceType.toUpperCase()} U-Belt study area
              {scenarioTimestamp ? ` · Time: ${scenarioTimestamp}` : ''}.
              Recommended corridors reflect controlled routing algorithms and do not guarantee
              safe passage.
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
