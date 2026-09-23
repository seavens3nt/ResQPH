import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import type { RescueRequest } from '../../../features/missions/types'
import { ApiErrorBanner } from '../../../components/ui/ApiErrorBanner'
import { RoleNotice } from '../../../components/ui/RoleNotice'
import { RescuerOfflineQueue } from './rescuer/RescuerOfflineQueue'
import { RescuerMissionCard } from './rescuer/RescuerMissionCard'
import {
  listMyMissions,
  updateMissionStatus as apiUpdateMissionStatus,
  nextValidStatus,
  ApiError,
} from '../../../api/missions'
import type { OfflineQueueEntry } from '../../../api/missions'
import {
  Section,
  StatCard,
  StatusBadge,
  VulnerabilitiesBadges,
  WeatherAlertBanner,
} from './shared'
import type { NavSection } from './navTypes'

export function RescuerView(_props: { navSection?: NavSection }) {
  const queryClient = useQueryClient()
  const {
    activeRescuerMission,
    requests,
    updateMissionStatus: contextUpdateMissionStatus,
    overrideRoute,
    isOffline,
  } = useMissions()

  // ── Phase 2: Real API mission fetch ─────────────────────────────────────
  const {
    data: apiMissionsData,
    isLoading: isMissionsLoading,
    isError: isMissionsError,
    error: missionsError,
    dataUpdatedAt,
    refetch: refetchMissions,
  } = useQuery({
    queryKey: ['my-missions'],
    queryFn: () => listMyMissions(),
    staleTime: 30_000,
    enabled: !isOffline,
    retry: false,
  })

  // Use the first API mission if available, else fall back to mock context
  const apiMission = apiMissionsData?.items[0] ?? null
  const mission = activeRescuerMission  // keep mock-context mission for existing JSX
  const targetRequest = mission
    ? requests.find((r: RescueRequest) => r.id === mission.requestId)
    : null

  // ── Offline queue (single-entry spec from RESCUE_LIFECYCLE.md) ───────────
  const [offlineEntry, setOfflineEntry] = useState<OfflineQueueEntry | null>(null)
  const syncAttemptedRef = useRef(false)

  // ── Phase 2: Real API status advance mutation ────────────────────────────
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const { mutate: advanceStatus, isPending: isAdvancing } = useMutation({
    mutationFn: () => {
      if (!apiMission) throw new Error('No mission loaded')
      const next = nextValidStatus(apiMission.status)
      if (!next) throw new Error('No valid next status')
      const eventId = crypto.randomUUID()
      if (isOffline) {
        // Queue for later — spec: at most one queued transition
        const entry: OfflineQueueEntry = {
          localId: eventId,
          missionId: apiMission.id,
          body: {
            event_id: eventId,
            new_status: next,
            expected_mission_version: apiMission.version,
            client_recorded_at: new Date().toISOString(),
            source: 'offline-sync',
          },
          syncState: 'pending',
          enqueuedAt: new Date().toISOString(),
        }
        setOfflineEntry(entry)
        return Promise.resolve(null)
      }
      return apiUpdateMissionStatus(apiMission.id, {
        event_id: eventId,
        new_status: next,
        expected_mission_version: apiMission.version,
        client_recorded_at: new Date().toISOString(),
        source: 'online',
      })
    },
    onSuccess: (result) => {
      setApiError(null)
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['my-missions'] })
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setApiError(err)
        // On conflict: refresh to show authoritative server state
        if (err.isConflict) void queryClient.invalidateQueries({ queryKey: ['my-missions'] })
      }
    },
  })

  function handleRetrySync() {
    if (!offlineEntry || isOffline) return
    const entry = offlineEntry
    setOfflineEntry({ ...entry, syncState: 'syncing' })
    syncAttemptedRef.current = true
    apiUpdateMissionStatus(entry.missionId, entry.body)
      .then(() => {
        setOfflineEntry(null)
        void queryClient.invalidateQueries({ queryKey: ['my-missions'] })
      })
      .catch((err: unknown) => {
        const reason = err instanceof ApiError ? err.message : 'Sync failed'
        setOfflineEntry({ ...entry, syncState: 'failed', failureReason: reason })
        void queryClient.invalidateQueries({ queryKey: ['my-missions'] })
      })
  }

  // UI States
  const [showIncomingModal, setShowIncomingModal] = useState(
    Boolean(mission && mission.status === 'assigned' && !mission.startedAt),
  )
  const [selectedRouteKey, setSelectedRouteKey] = useState<'primary' | 'alternative'>('primary')
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [evacuatedCount, setEvacuatedCount] = useState(
    targetRequest ? String(targetRequest.headcount) : '4',
  )
  const [rescuerFieldNotes, setRescuerFieldNotes] = useState('')

  // If no active mission in mock context and API is loading
  if (!mission && isMissionsLoading) {
    return (
      <div className="rescuer-view" aria-busy="true" aria-label="Loading mission">
        <WeatherAlertBanner />
        <div className="empty-state">
          <span className="coord-queue__spinner" aria-hidden="true" />
          <p>Loading your assigned mission…</p>
        </div>
      </div>
    )
  }

  // Role / system error from API when no context mission exists
  if (!mission && isMissionsError && missionsError instanceof ApiError) {
    if (missionsError.isForbidden) {
      return (
        <div className="rescuer-view">
          <WeatherAlertBanner />
          <RoleNotice
            attemptedAction="retrieve assigned missions"
            currentRole="current role"
            requiredRole="rescuer"
          />
        </div>
      )
    }
    // System error — show with retry
    return (
      <div className="rescuer-view">
        <WeatherAlertBanner />
        <ApiErrorBanner
          error={missionsError}
          onRetry={() => void refetchMissions()}
        />
      </div>
    )
  }

  // If no active mission
  if (!mission || !targetRequest) {
    return (
      <div className="rescuer-view">
        <WeatherAlertBanner />
        <div className="stat-row">
          <StatCard label="Unit Status" value="STANDBY" icon="shield" subtext="Available for dispatch" />
          <StatCard label="Missions Completed" value={3} icon="check" subtext="Today's operations" />
          <StatCard label="Eligible Scenario Roads" value="78%" icon="route" subtext="Controlled U-Belt fixture" />
          <StatCard label="Scenario Flood Level" value="CRITICAL" icon="alert" accent subtext="Synthetic demonstration" />
        </div>

        <Section title="Field Rescuer Console — Standby">
          {/* Offline queue shown even in standby */}
          <RescuerOfflineQueue
            entry={offlineEntry}
            isOffline={isOffline}
            onRetrySync={handleRetrySync}
            onDismissFailed={() => setOfflineEntry(null)}
          />
          <div className="empty-state">
            <Icon name="boat" size={38} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>
              Standing By at Rescue Staging HQ (España Blvd)
            </p>
            <p style={{ maxWidth: '440px', margin: '0 auto' }}>
              Your craft and equipment are calibrated. Incoming mission alerts from Central Dispatch will
              pop up automatically.
            </p>
          </div>
        </Section>
      </div>
    )
  }

  // 1. Mission Execution actions (mock context — preserved for existing view JSX)
  function handleAcceptMission() {
    if (!mission) return
    contextUpdateMissionStatus(mission.id, 'assigned')
    setShowIncomingModal(false)
  }

  function handleStartEnRoute() {
    if (!mission) return
    // Try real API first; fall back to context for demo mode
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(mission.id, 'en-route')
    }
  }

  function handleMarkArrived() {
    if (!mission) return
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(mission.id, 'arrived')
    }
  }

  function handleConfirmCompleted() {
    if (!mission) return
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(
        mission.id,
        'completed',
        rescuerFieldNotes || `Successfully evacuated ${evacuatedCount} residents to evacuation center.`,
      )
    }
    setShowCompleteConfirm(false)
  }

  const primaryRoute = mission.suggestedRoute.primary
  const alternativeRoute = mission.suggestedRoute.alternative
  const impassableRoad = mission.suggestedRoute.impassable

  return (
    <div className="rescuer-view">
      <WeatherAlertBanner />

      {/* Phase 2: API error banner for status-advance failures */}
      {apiError && !apiError.isForbidden && (
        <ApiErrorBanner
          error={apiError}
          onRetry={advanceStatus}
          onRefresh={() => void refetchMissions()}
        />
      )}
      {apiError?.isForbidden && (
        <RoleNotice
          attemptedAction="advance mission status"
          currentRole="rescuer"
          requiredRole="assigned rescuer"
        />
      )}

      {/* Phase 2: Offline sync queue */}
      <RescuerOfflineQueue
        entry={offlineEntry}
        isOffline={isOffline}
        onRetrySync={handleRetrySync}
        onDismissFailed={() => setOfflineEntry(null)}
      />

      {/* Phase 2: Live API Mission card with sync badge & status history */}
      {apiMission && (
        <RescuerMissionCard
          mission={apiMission}
          lastSyncedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null}
          isStale={isOffline}
          isAdvancing={isAdvancing}
          onAdvanceStatus={advanceStatus}
        />
      )}

      {/* 1. INCOMING MISSION NOTIFICATION BANNER (IF PENDING ACCEPTANCE) */}
      {showIncomingModal && (
        <div className="incoming-mission-banner" role="alert">
          <div className="incoming-banner-left">
            <span className="incoming-pulse-icon">
              <Icon name="alert" size={24} />
            </span>
            <div>
              <div className="incoming-banner-badge">🚨 NEW RESCUE DISPATCH ASSIGNMENT</div>
              <h3>{mission.id} → {targetRequest.location.address}</h3>
              <p>
                <strong>{targetRequest.headcount} Persons</strong> · Severity:{' '}
                <strong>{targetRequest.severity.toUpperCase()}</strong> ({targetRequest.floodDepth})
                {targetRequest.medicalNeeds ? ' · 🩺 ACTIVE MEDICAL NEED' : ''}
              </p>
            </div>
          </div>
          <div className="incoming-banner-actions">
            <Button
              variant="primary"
              size="lg"
              className="btn-danger-emergency"
              onClick={handleAcceptMission}
            >
              <Icon name="check" size={18} />
              <span>ACCEPT MISSION</span>
            </Button>
          </div>
        </div>
      )}

      {/* Rescuer Operational Stats */}
      <div className="stat-row">
        <StatCard
          label="Mission Status"
          value={mission.status.toUpperCase()}
          icon="route"
          accent
          subtext={`${mission.id} · ${targetRequest.id}`}
        />
        <StatCard
          label="Estimated Transit"
          value={`${mission.etaMinutes} mins`}
          icon="clock"
          subtext={`via ${mission.activeRouteName}`}
        />
        <StatCard
          label="Target Flood Depth"
          value={targetRequest.floodDepth}
          icon="alert"
          subtext={targetRequest.severity.toUpperCase()}
        />
        <StatCard
          label="Evacuees Count"
          value={`${targetRequest.headcount} persons`}
          icon="volunteers"
          subtext="Infant + Senior present"
        />
      </div>

      {/* 2. ACTIVE MISSION SCREEN (TARGET DETAILS PANEL) */}
      <Section
        title={`Active Mission: ${mission.id}`}
        subtitle={`Dispatched to support citizen request ${targetRequest.id}`}
        action={
          <div className="mission-actions-bar">
            {mission.status === 'assigned' && (
              <Button
                variant="primary"
                size="lg"
                className="btn-enroute"
                onClick={handleStartEnRoute}
              >
                <Icon name="boat" size={18} />
                <span>TAP EN ROUTE (ACTIVATE ROUTE ENGINE)</span>
              </Button>
            )}

            {mission.status === 'en-route' && (
              <Button
                variant="primary"
                size="lg"
                style={{ background: '#10b981', borderColor: '#059669' }}
                onClick={handleMarkArrived}
              >
                <Icon name="pin" size={18} />
                <span>TAP ARRIVED AT AREA</span>
              </Button>
            )}

            {mission.status === 'arrived' && (
              <Button
                variant="primary"
                size="lg"
                className="btn-danger-emergency"
                onClick={() => setShowCompleteConfirm(true)}
              >
                <Icon name="check" size={18} />
                <span>TAP RESCUE COMPLETED</span>
              </Button>
            )}

            {mission.status === 'completed' && (
              <span className="mission-completed-tag">✓ Mission Completed</span>
            )}
          </div>
        }
      >
        {/* En Route Advisory — live when navigating, contextual for other states */}
        {mission.status === 'en-route' ? (
          <div className="enroute-reroute-explanation-card">
            <div className="reroute-header">
              <span className="live-indicator-dot" />
              <span className="reroute-title">ACTIVE EN ROUTE STATUS ADVISORY</span>
              <span className="reroute-source">Prototype status shared across role views</span>
            </div>
            <p className="reroute-message">
              "{mission.routeDelayExplanation}"
            </p>
            <div className="reroute-eta-row">
              <span>⏱️ Transit Target: <strong>{mission.etaMinutes} minutes</strong></span>
              <span>🛣️ Active Corridor: <strong>{mission.activeRouteName}</strong></span>
            </div>
          </div>
        ) : mission.status === 'assigned' ? (
          <div className="enroute-reroute-explanation-card enroute-advisory--standby">
            <div className="reroute-header">
              <span className="advisory-status-icon">🟡</span>
              <span className="reroute-title">AWAITING DEPARTURE</span>
              <span className="reroute-source">Tap "EN ROUTE" above when craft is moving</span>
            </div>
            <p className="reroute-message" style={{ opacity: 0.7 }}>
              Route advisory will activate once you begin navigation. Planned corridor: <strong>{mission.activeRouteName}</strong>.
              Estimated transit once deployed: <strong>{mission.etaMinutes} minutes</strong>.
            </p>
          </div>
        ) : mission.status === 'arrived' ? (
          <div className="enroute-reroute-explanation-card enroute-advisory--arrived">
            <div className="reroute-header">
              <span className="advisory-status-icon">🟢</span>
              <span className="reroute-title">ARRIVED AT SCENE</span>
              <span className="reroute-source">Central Dispatch notified</span>
            </div>
            <p className="reroute-message">
              Unit successfully reached target via <strong>{mission.activeRouteName}</strong>. Begin evacuation protocol — confirm headcount and assist vulnerable individuals first.
            </p>
          </div>
        ) : null}

        <div className="target-details-panel">
          {/* Medical Alerts Banner (High-visibility flag) */}
          {targetRequest.medicalNeeds && (
            <div className="medical-emergency-alert">
              <Icon name="medical" size={22} />
              <div>
                <strong>🚨 HIGH PRIORITY MEDICAL ALERT AT TARGET</strong>
                <p>
                  {targetRequest.medicalDetails ||
                    'Urgent medical support required. Patient has respiratory distress requiring nebulizer & warming.'}
                </p>
              </div>
            </div>
          )}

          <div className="target-details-grid">
            {/* House & Location Description */}
            <div className="target-card">
              <span className="target-card-label">House & Location Description</span>
              <h4 className="target-address">{targetRequest.location.address}</h4>
              <p className="target-landmark">
                <strong>Landmark:</strong>{' '}
                {targetRequest.location.landmark || 'Near National University Gate 2'}
              </p>
              <p className="target-house-desc">
                <strong>Structure:</strong>{' '}
                {targetRequest.location.houseDescription ||
                  '2-storey concrete residence with blue iron gate. Victims waiting on 2nd floor balcony.'}
              </p>
              <span className="target-gps">
                Coordinates: 14.6042° N, 120.9946° E (Sampaloc Study Area)
              </span>
            </div>

            {/* Vulnerability Breakdown */}
            <div className="target-card">
              <span className="target-card-label">Vulnerability Breakdown</span>
              <div className="headcount-hero">
                <span className="headcount-num">{targetRequest.headcount}</span>
                <span className="headcount-label">Total Stranded Individuals</span>
              </div>
              <div className="vuln-breakdown-list">
                <VulnerabilitiesBadges vulns={targetRequest.vulnerabilities} />
              </div>
              <div className="citizen-contact-box">
                <span>Citizen: {targetRequest.citizenName}</span>
                <a href={`tel:${targetRequest.citizenPhone}`} className="citizen-phone-btn">
                  <Icon name="phone" size={13} /> {targetRequest.citizenPhone}
                </a>
              </div>
            </div>

            {/* Destination Flood Severity */}
            <div className="target-card">
              <span className="target-card-label">Destination Flood Severity</span>
              <div className="flood-severity-gauge">
                <StatusBadge status={targetRequest.status} />
                <span className="depth-badge depth-chest">{targetRequest.floodDepth}</span>
              </div>
              <p className="depth-explanation">
                Water depth at target exceeds safe pedestrian wading depth. Recommended craft:{' '}
                <strong>Inflatable Rubber Boat (Zodiac) with 15HP Outboard Motor</strong>.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. AUTOMATED REROUTING & NAVIGATION VIEW */}
      <Section
        title="Flood-Aware Navigation & Rerouting Engine"
        subtitle="Deterministic route costs using controlled flood and passability rules."
      >
        {/* Impassable Alert Box */}
        <div className="impassable-alert-box">
          <div className="impassable-icon">
            <Icon name="warning" size={24} />
          </div>
          <div className="impassable-body">
            <div className="impassable-tag">HAZARD DETECTED · ROAD EXCLUDED</div>
            <h4>{impassableRoad.name} — IMPASSABLE TO RESCUE VEHICLES</h4>
            <p>
              Controlled-scenario depth is <strong>{impassableRoad.waterDepth}</strong>, exceeding the configured
              prototype threshold of <strong>{impassableRoad.threshold}</strong>. The deterministic engine excludes
              this edge and selects another eligible corridor.
            </p>
          </div>
        </div>

        {/* Route Comparison Options */}
        <div className="route-comparison-grid">
          {/* Primary Recommended Route */}
          <div
            className={`route-card ${selectedRouteKey === 'primary' ? 'is-selected' : ''}`}
            onClick={() => {
              setSelectedRouteKey('primary')
              overrideRoute(mission.id, primaryRoute.name, 'Selected primary recommended corridor')
            }}
          >
            <div className="route-card-head">
              <span className="route-badge-recommended">RECOMMENDED ROUTE</span>
              <span className="route-score">Scenario score: {primaryRoute.safetyScore}/100</span>
            </div>
            <h4>{primaryRoute.name}</h4>
            <div className="route-metrics">
              <span>⏱️ {primaryRoute.estimatedMinutes} mins transit</span>
              <span>🌊 {primaryRoute.waterDepth}</span>
              <span>⛰️ Elevation: {primaryRoute.elevation}</span>
            </div>
            <p className="route-explanation">{primaryRoute.explanation}</p>
          </div>

          {/* Alternative Detour Route */}
          <div
            className={`route-card ${selectedRouteKey === 'alternative' ? 'is-selected' : ''}`}
            onClick={() => {
              setSelectedRouteKey('alternative')
              overrideRoute(mission.id, alternativeRoute.name, 'Rescuer opted for alternative detour')
            }}
          >
            <div className="route-card-head">
              <span className="route-badge-alternative">ALTERNATIVE DETOUR</span>
              <span className="route-score">Safety: {alternativeRoute.safetyScore}/100</span>
            </div>
            <h4>{alternativeRoute.name}</h4>
            <div className="route-metrics">
              <span>⏱️ {alternativeRoute.estimatedMinutes} mins transit</span>
              <span>🌊 {alternativeRoute.waterDepth}</span>
              <span>⛰️ Elevation: {alternativeRoute.elevation}</span>
            </div>
            <p className="route-explanation">{alternativeRoute.explanation}</p>
          </div>
        </div>

        {/* Interactive Map */}
        <InteractiveFloodMap
          activeStage={mission.status === 'cancelled' ? undefined : mission.status}
          selectedRoute={selectedRouteKey}
          onSelectRoute={(r: 'primary' | 'alternative') => setSelectedRouteKey(r)}
          routeExplanation={mission.routeDelayExplanation}
          etaMinutes={mission.etaMinutes}
        />
      </Section>

      {/* 4. Complete Rescue Confirmation Modal */}
      <Modal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        title="Confirm Rescue Completion"
        subtitle="Verify all affected citizens are safely secured and transferred."
      >
        <div className="complete-modal-content">
          <div className="field">
            <label className="field__label">Confirmed Number of Evacuees Rescued</label>
            <input
              type="number"
              value={evacuatedCount}
              onChange={(e) => setEvacuatedCount(e.target.value)}
              min="1"
            />
          </div>

          <div className="field">
            <label className="field__label">Field Notes / Evacuation Observations</label>
            <textarea
              rows={3}
              placeholder="E.g., All 4 family members secured. Minor asthma symptoms treated with onboard inhaler. Transferred to NU Gymnasium evacuation center."
              value={rescuerFieldNotes}
              onChange={(e) => setRescuerFieldNotes(e.target.value)}
            />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Closing this prototype mission will update the shared demonstration state and reset your craft
            status to <strong>AVAILABLE</strong>.
          </p>

          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <Button variant="ghost" onClick={() => setShowCompleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-danger-emergency"
              onClick={handleConfirmCompleted}
            >
              ✓ Confirm Rescue Completed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
