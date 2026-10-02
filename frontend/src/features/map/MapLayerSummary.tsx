import React, { useId } from 'react'
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
  scenarioId: string
  scenarioTimestamp: string
  sourceType: 'controlled' | 'historical' | 'unverified'
  studyAreaId: string
  status?: 'ready' | 'loading' | 'empty' | 'stale' | 'unavailable' | 'no-route'
  lastSyncedAt?: string
  errorMessage?: string
  onRetry?: () => void
  features: MapLayerFeature[]
  routeExplanation?: MapRouteExplanation
  noRouteReason?: string
  title?: string
  className?: string
}

export const MapLayerSummary: React.FC<MapLayerSummaryProps> = ({
  scenarioId,
  scenarioTimestamp,
  sourceType,
  studyAreaId,
  status = 'ready',
  lastSyncedAt,
  errorMessage,
  onRetry,
  features,
  routeExplanation,
  noRouteReason,
  title = 'Accessible Map Layer & Route Text Summary',
  className = '',
}) => {
  const routeHeadingId = useId()
  const featuresHeadingId = useId()
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
        <div className="map-layer-summary__section" aria-labelledby={routeHeadingId}>
          <h4 className="map-layer-summary__section-title" id={routeHeadingId}>
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
                      {street.depthCm !== undefined ? ` [Recorded depth: ${street.depthCm} cm]` : ''}
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
        <div className="map-layer-summary__section" aria-labelledby={featuresHeadingId}>
          <h4 className="map-layer-summary__section-title" id={featuresHeadingId}>
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
