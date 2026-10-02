import React from 'react'
import './MapLayerSummary.css'

export type FeatureSeverity = 'critical' | 'moderate' | 'low' | 'none'
export type FeatureType = 'hazard' | 'route' | 'road' | 'poi'

export interface MapLayerFeature {
  id: string
  name: string
  type: FeatureType
  coordinates?: string
  severity?: FeatureSeverity
  statusText: string
  landmarkOrDetails: string
  reason?: string
}

export interface RouteAvoidedStreet {
  streetName: string
  reason: string
  depthCm?: number
}

export interface MapRouteExplanation {
  recommendedCorridorName: string
  etaMinutes: number
  distanceMeters?: number
  avoidedStreets: RouteAvoidedStreet[]
  selectedReason: string
}

export interface MapLayerSummaryProps {
  scenarioId?: string
  scenarioTimestamp?: string
  sourceType?: 'controlled' | 'historical' | 'unverified'
  studyAreaId?: string
  status?: 'ready' | 'loading' | 'empty' | 'stale' | 'unavailable' | 'no-route'
  lastSyncedAt?: string
  errorMessage?: string
  onRetry?: () => void
  features?: MapLayerFeature[]
  routeExplanation?: MapRouteExplanation
  noRouteReason?: string
  title?: string
  className?: string
}

export const DEFAULT_SUMMARY_FEATURES: MapLayerFeature[] = [
  {
    id: 'feat-hazard-1',
    name: 'Loyola St. Segment (Impassable Barrier)',
    type: 'hazard',
    coordinates: '14.6030° N, 120.9910° E',
    severity: 'critical',
    statusText: 'Impassable (1.40m Depth)',
    landmarkOrDetails: 'Loyola St. corridor between Dalupan and Jhocson',
    reason: 'Water depth exceeds safe rescue craft threshold (0.30m). High probability of engine stall.',
  },
  {
    id: 'feat-hazard-2',
    name: 'Severe Flood Ponding Zone',
    type: 'hazard',
    coordinates: '14.6040° N, 120.9930° E',
    severity: 'critical',
    statusText: 'Severe Flood Zone (>1.50m)',
    landmarkOrDetails: 'U-Belt low-lying basin',
    reason: 'Simulated high-depth basin impassable in this demonstration scenario.',
  },
  {
    id: 'feat-hazard-3',
    name: 'Gerardo St. Moderate Ponding',
    type: 'hazard',
    coordinates: '14.6020° N, 120.9905° E',
    severity: 'moderate',
    statusText: 'Moderate Ponding (0.40m)',
    landmarkOrDetails: 'Alternative Detour route',
    reason: 'Passable with high-clearance assets or rescue watercraft.',
  },
  {
    id: 'feat-route-1',
    name: 'Jhocson St. Recommended Corridor',
    type: 'route',
    coordinates: '14.6005° N, 120.9875° E to 14.6042° N, 120.9946° E',
    severity: 'none',
    statusText: 'Recommended Corridor (Active)',
    landmarkOrDetails: 'Direct path avoiding impassable flood obstacles',
    reason: 'Lowest simulated graph traversal penalty with zero impassable edge violations.',
  },
  {
    id: 'feat-poi-1',
    name: 'Citizen Distress Beacon',
    type: 'poi',
    coordinates: '14.6042° N, 120.9946° E',
    severity: 'critical',
    statusText: 'Distress Beacon Active',
    landmarkOrDetails: 'Simulated resident distress target',
    reason: 'Headcount: 4 persons. Reported deep flood condition.',
  },
  {
    id: 'feat-poi-2',
    name: 'Rescue Team Alpha (Boat Unit)',
    type: 'poi',
    coordinates: '14.6028° N, 120.9910° E',
    severity: 'none',
    statusText: 'En Route',
    landmarkOrDetails: 'Simulated rescue watercraft unit',
    reason: 'Following recommended corridor toward distress target.',
  },
  {
    id: 'feat-poi-3',
    name: 'Evacuation Center (Concepcion / NU Gym)',
    type: 'poi',
    coordinates: '14.6510° N, 121.0990° E',
    severity: 'none',
    statusText: 'Operational (70% Occupied)',
    landmarkOrDetails: 'Designated safe assembly center',
    reason: 'Emergency shelter equipped with food, water, and first aid.',
  },
]

export const DEFAULT_ROUTE_EXPLANATION: MapRouteExplanation = {
  recommendedCorridorName: 'Jhocson St. Corridor',
  etaMinutes: 9,
  distanceMeters: 850,
  selectedReason:
    'Lower controlled-scenario penalty score and zero impassable edge crossings.',
  avoidedStreets: [
    {
      streetName: 'Loyola St. Shortcut',
      reason:
        'Water depth reaches 1.40 m, exceeding the safe rescue craft threshold (0.30 m). High stall hazard.',
      depthCm: 140,
    },
  ],
}

export const MapLayerSummary: React.FC<MapLayerSummaryProps> = ({
  scenarioId = 'scenario-controlled-001',
  scenarioTimestamp = '2026-09-22T00:00:00Z',
  sourceType = 'controlled',
  studyAreaId = 'ubelt-pilot-v1',
  status = 'ready',
  lastSyncedAt,
  errorMessage,
  onRetry,
  features = DEFAULT_SUMMARY_FEATURES,
  routeExplanation = DEFAULT_ROUTE_EXPLANATION,
  noRouteReason,
  title = 'Accessible Map Layer & Route Text Summary',
  className = '',
}) => {
  const isNoRoute = status === 'no-route' || Boolean(noRouteReason)
  const isStale = status === 'stale'
  const isUnavailable = status === 'unavailable'
  const isLoading = status === 'loading'
  const isEmpty = (status === 'empty' || features.length === 0) && !isLoading && !isUnavailable

  return (
    <section
      className={`map-layer-summary ${className}`}
      role="region"
      aria-label={title}
    >
      {/* Header */}
      <div className="map-layer-summary__header">
        <div className="map-layer-summary__title-row">
          <h3 className="map-layer-summary__title">
            <span aria-hidden="true">📋</span>
            <span>{title}</span>
          </h3>

          <div className="map-layer-summary__meta">
            <span className="map-layer-summary__meta-badge">
              Source: {sourceType.toUpperCase()}
            </span>
            <span className="map-layer-summary__meta-badge">
              Boundary: {studyAreaId}
            </span>
            <span className="map-layer-summary__meta-badge">
              Scenario: {scenarioId}
            </span>
            {scenarioTimestamp && (
              <span className="map-layer-summary__meta-badge">
                Time: {scenarioTimestamp}
              </span>
            )}
          </div>
        </div>

        {/* Academic prototype disclaimer */}
        <div className="map-layer-summary__disclaimer">
          <strong>Academic Prototype Notice:</strong> Essential map information is provided below
          in accessible text format. This simulation is not for real emergency dispatch. Recommended
          routes reflect controlled algorithms and do not guarantee physical safety.
        </div>
      </div>

      {/* Stale State Banner */}
      {isStale && (
        <div
          className="map-layer-summary__status-banner map-layer-summary__status-banner--stale"
          role="status"
          aria-live="polite"
        >
          <span>
            ⚠️ <strong>Cached / Stale Summary:</strong> Last synced at{' '}
            {lastSyncedAt || 'an earlier session'}. Showing recorded scenario state.
          </span>
          {onRetry && (
            <button
              type="button"
              className="map-layer-summary__retry-btn"
              onClick={onRetry}
              aria-label="Refresh layer summary"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {/* Unavailable State Banner */}
      {isUnavailable && (
        <div
          className="map-layer-summary__status-banner map-layer-summary__status-banner--unavailable"
          role="alert"
          aria-live="assertive"
        >
          <span>
            ❌ <strong>Data Unavailable:</strong>{' '}
            {errorMessage || 'Unable to retrieve layer features for this controlled scenario.'}
          </span>
          {onRetry && (
            <button
              type="button"
              className="map-layer-summary__retry-btn"
              onClick={onRetry}
              aria-label="Retry loading layer summary"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="map-layer-summary__loading" role="status" aria-live="polite">
          <span className="map-layer-summary__loading-icon" aria-hidden="true">
            ⏳
          </span>
          <p>Loading text summary for map features and routing corridors...</p>
        </div>
      )}

      {/* No Route Warning State */}
      {isNoRoute && !isLoading && !isUnavailable && (
        <div
          className="map-layer-summary__no-route"
          role="alert"
          aria-live="polite"
        >
          <div className="map-layer-summary__no-route-title">
            <span aria-hidden="true">🚫</span>
            <span>NO ELIGIBLE ROUTE FOUND UNDER CONTROLLED SCENARIO</span>
          </div>
          <p className="map-layer-summary__no-route-text">
            {noRouteReason ||
              'All candidate road corridors exceed safe flood depth thresholds or are blocked by physical barriers in this controlled scenario.'}
          </p>
          <p className="map-layer-summary__no-route-text">
            <strong>Safety Constraint:</strong> ResQPH never draws an invented straight-line or
            unverified safe path when road edges are impassable.
          </p>
        </div>
      )}

      {/* Route Rationale Section (when route is eligible) */}
      {!isNoRoute && !isEmpty && !isLoading && !isUnavailable && routeExplanation && (
        <div className="map-layer-summary__section" aria-labelledby="route-summary-heading">
          <h4 className="map-layer-summary__section-title" id="route-summary-heading">
            <span aria-hidden="true">🧭</span>
            <span>Controlled Scenario Route Explanation</span>
          </h4>

          <div className="map-layer-summary__route-card">
            <div className="map-layer-summary__route-header">
              <span className="map-layer-summary__route-name">
                Corridor: {routeExplanation.recommendedCorridorName}
              </span>
              <span className="map-layer-summary__route-eta">
                Simulated Transit: ~{routeExplanation.etaMinutes} mins
                {routeExplanation.distanceMeters
                  ? ` (${(routeExplanation.distanceMeters / 1000).toFixed(1)} km)`
                  : ''}
              </span>
            </div>

            <p className="map-layer-summary__route-reason">
              <strong>Selection Rationale:</strong> {routeExplanation.selectedReason}
            </p>

            {routeExplanation.avoidedStreets && routeExplanation.avoidedStreets.length > 0 && (
              <div className="map-layer-summary__avoided-box">
                <span className="map-layer-summary__avoided-title">
                  Avoided Hazardous Road Edges
                </span>
                <ul className="map-layer-summary__avoided-list" role="list">
                  {routeExplanation.avoidedStreets.map((street, idx) => (
                    <li key={idx} className="map-layer-summary__avoided-item">
                      <strong>{street.streetName}:</strong> {street.reason}
                      {street.depthCm ? ` [Recorded depth: ${street.depthCm} cm]` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="map-layer-summary__empty" role="status">
          <span className="map-layer-summary__empty-icon" aria-hidden="true">
            📭
          </span>
          <p className="map-layer-summary__empty-title">No Active Map Features</p>
          <p className="map-layer-summary__empty-hint">
            There are currently no active hazards, road edges, or beacons in this scenario.
          </p>
        </div>
      )}

      {/* Feature & Hazard List */}
      {!isEmpty && !isLoading && !isUnavailable && (
        <div className="map-layer-summary__section" aria-labelledby="features-summary-heading">
          <h4 className="map-layer-summary__section-title" id="features-summary-heading">
            <span aria-hidden="true">📍</span>
            <span>Active Scenario Features & Hazard Locations ({features.length})</span>
          </h4>

          <ul className="map-layer-summary__feature-list" role="list">
            {features.map((feature) => (
              <li key={feature.id} className="map-layer-summary__feature-item">
                <div className="map-layer-summary__feature-header">
                  <span className="map-layer-summary__feature-name">{feature.name}</span>
                  {feature.coordinates && (
                    <span className="map-layer-summary__feature-coords">
                      Coords: {feature.coordinates}
                    </span>
                  )}
                  <span
                    className={`map-layer-summary__badge map-layer-summary__badge--${feature.severity || 'none'}`}
                  >
                    {feature.statusText}
                  </span>
                </div>

                <div className="map-layer-summary__feature-details">
                  <span>
                    <strong>Location/Landmark:</strong> {feature.landmarkOrDetails}
                  </span>
                  {feature.reason && (
                    <span className="map-layer-summary__feature-reason">
                      <strong>Rationale:</strong> {feature.reason}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
