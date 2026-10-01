import React from 'react'
import './MapNotice.css'

export type MapSourceType = 'controlled' | 'historical' | 'unverified' | 'simulated'
export type MapNoticeStatus = 'ready' | 'loading' | 'stale' | 'unavailable' | 'offline' | 'fallback'

export interface MapNoticeProps {
  /** Identifier of the controlled scenario (e.g. "scenario-controlled-001") */
  scenarioId?: string
  /** ISO timestamp of the scenario data */
  scenarioTimestamp?: string
  /** Origin/authority of the geospatial scenario data */
  sourceType?: MapSourceType
  /** Identifier of the study boundary (e.g. "ubelt-pilot-v1") */
  studyAreaId?: string
  /** Operational/network state of the map data */
  status?: MapNoticeStatus
  /** Timestamp when data was last retrieved or cached */
  lastSyncedAt?: string
  /** Error message details when unavailable */
  errorMessage?: string
  /** Retry callback for failed or stale data */
  onRetry?: () => void
  /** Render compact layout for headers or mobile viewports */
  compact?: boolean
  /** Optional custom notice or advisory text */
  customNotice?: string
  className?: string
}

const SOURCE_LABELS: Record<MapSourceType, { label: string; icon: string }> = {
  controlled: { label: 'Controlled Synthetic Scenario', icon: '🧪' },
  historical: { label: 'Historical Flood Dataset', icon: '📜' },
  unverified: { label: 'Unverified Field Report', icon: '⚠️' },
  simulated: { label: 'Simulated Scenario', icon: '⚙️' },
}

export const MapNotice: React.FC<MapNoticeProps> = ({
  scenarioId = 'scenario-controlled-001',
  scenarioTimestamp = '2026-09-22T00:00:00Z',
  sourceType = 'controlled',
  studyAreaId = 'ubelt-pilot-v1',
  status = 'ready',
  lastSyncedAt,
  errorMessage,
  onRetry,
  compact = false,
  customNotice,
  className = '',
}) => {
  const sourceInfo = SOURCE_LABELS[sourceType] || SOURCE_LABELS.controlled

  const isAlertState = status === 'unavailable' || status === 'stale' || status === 'offline'

  return (
    <aside
      className={`map-notice map-notice--${status} ${compact ? 'map-notice--compact' : ''} ${className}`}
      role={isAlertState ? 'alert' : 'region'}
      aria-label="Map scenario notice and operational disclaimer"
      aria-live={isAlertState ? 'assertive' : 'polite'}
    >
      <div className="map-notice__header">
        <div className="map-notice__title-group">
          <span className="map-notice__icon" aria-hidden="true">
            {status === 'unavailable'
              ? '❌'
              : status === 'stale'
                ? '⚠️'
                : status === 'loading'
                  ? '⏳'
                  : status === 'offline'
                    ? '📡'
                    : status === 'fallback'
                      ? '🔄'
                      : sourceInfo.icon}
          </span>
          <span className="map-notice__title">
            {status === 'unavailable'
              ? 'Map Scenario Data Unavailable'
              : status === 'stale'
                ? 'Cached / Stale Scenario Data'
                : status === 'loading'
                  ? 'Loading Scenario Data...'
                  : status === 'offline'
                    ? 'Offline Mode — Cached Scenario Active'
                    : status === 'fallback'
                      ? 'ML Fallback — Rule-Based Routing'
                      : 'ResQPH Controlled Scenario Map'}
          </span>
        </div>

        <div className="map-notice__badges">
          <span
            className={`map-notice__badge map-notice__badge--${sourceType}`}
            title={`Data Source: ${sourceInfo.label}`}
          >
            <span aria-hidden="true">{sourceInfo.icon}</span>
            <span>{sourceType.toUpperCase()}</span>
          </span>

          {studyAreaId && (
            <span
              className="map-notice__badge map-notice__badge--study-area"
              title={`Study Boundary: ${studyAreaId}`}
            >
              <span>BOUNDS: {studyAreaId}</span>
            </span>
          )}

          {scenarioTimestamp && (
            <span className="map-notice__timestamp" title="Scenario Data Timestamp">
              Scenario Time: {scenarioTimestamp}
            </span>
          )}
        </div>
      </div>

      <div className="map-notice__body">
        {/* Academic and non-emergency prototype limitation */}
        <p className="map-notice__disclaimer">
          <strong>Notice:</strong> Academic prototype — do not use for a real emergency.
        </p>

        {/* Status-specific advisory message */}
        {status === 'loading' && (
          <p className="map-notice__status-msg">
            Retrieving controlled map layers and edge passability for {studyAreaId}...
          </p>
        )}

        {status === 'stale' && (
          <p className="map-notice__status-msg">
            Displaying cached scenario data.{' '}
            {lastSyncedAt ? `Last synced at ${lastSyncedAt}.` : 'Data may be out of date.'}{' '}
            Real-time conditions are not guaranteed.
          </p>
        )}

        {status === 'unavailable' && (
          <p className="map-notice__status-msg">
            {errorMessage ||
              'Unable to load road network and flood layers for this controlled scenario.'}{' '}
            No simulated safe route can be determined.
          </p>
        )}

        {status === 'offline' && (
          <p className="map-notice__status-msg">
            Network is disconnected. Running on cached local scenario. Network-dependent actions
            are unavailable.
          </p>
        )}

        {status === 'fallback' && (
          <p className="map-notice__status-msg">
            Machine learning prediction service is unreachable. Rule-based routing graph remains
            active under the controlled scenario.
          </p>
        )}

        {/* Truthful non-live and non-guaranteed-safety disclosure */}
        <p className="map-notice__limitation">
          Synthetic academic scenario (ID: <code>{scenarioId}</code>); not live or historical
          flood evidence. Recommended corridors reflect simulated edge costs and do not guarantee
          transit safety or emergency response times.
        </p>

        {customNotice && <p className="map-notice__custom">{customNotice}</p>}
      </div>

      {/* Action buttons (e.g. Retry upon failure or stale cache) */}
      {(status === 'unavailable' || status === 'stale') && onRetry && (
        <div className="map-notice__actions">
          <button
            type="button"
            className="map-notice__btn"
            onClick={onRetry}
            aria-label="Retry loading map scenario data"
          >
            <span aria-hidden="true">🔄</span>
            <span>Retry Scenario Data</span>
          </button>
        </div>
      )}
    </aside>
  )
}
