/**
 * RescuerMissionCard — Displays a single mission's summary with stale/cached state.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Cached / stale mission state (last_synced_at label)
 *   - Mission and route loading/failure states (handled by parent)
 *   - Valid status-transition action button
 */
import { useCallback, useEffect, useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import type { MissionDetail, MissionStatusHistoryItem } from '../../../../api/missions'
import { controlMissionTracking, getMissionTracking, nextValidStatus } from '../../../../api/missions'
import { StatusBadge } from '../shared'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/art/Icon'
import { WorkspaceProgress } from '../../../../features/workspace/WorkspaceUI'
import { MISSION_STAGES } from '../../../../features/workspace/missionStages'
import { RecordId } from '../../../../features/workspace/Records'
import './RescuerMissionCard.css'
import { useAuth } from '../../../../features/auth/AuthContext'
import { InteractiveFloodMap } from '../../../../features/map/InteractiveFloodMap'
import { retryAfterDelay } from '../../../../api/retryAfter'
import { isMissionTrackingActive } from '../../../../features/missions/useMissionJourney'

interface RescuerMissionCardProps {
  mission: MissionDetail
  lastSyncedAt: string | null
  isStale: boolean
  isAdvancing: boolean
  onAdvanceStatus: () => void
  isCached?: boolean
  isQueueLocked?: boolean
}

export function RescuerMissionCard({
  mission,
  lastSyncedAt,
  isStale,
  isAdvancing,
  onAdvanceStatus,
  isCached = false,
  isQueueLocked = false,
}: RescuerMissionCardProps) {
  const titleId = useId()
  const queueNoteId = useId()
  const next = nextValidStatus(mission.status)
  const req = mission.request_summary

  const NEXT_LABEL: Partial<Record<string, string>> = {
    'en-route': 'ACCEPT MISSION & START TRAVEL',
    arrived: 'TAP ARRIVED AT SCENE',
    completed: 'TAP RESCUE COMPLETED',
  }

  const syncState = isStale || isCached ? 'stale' : 'fresh'
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const trackingKey = ['mission-tracking', user?.id, mission.id] as const
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  const [followRescuer, setFollowRescuer] = useState(true)
  const suspendFollow = useCallback(() => setFollowRescuer(false), [])
  const tracking = useQuery({
    queryKey: trackingKey,
    queryFn: async () => {
      const received = await getMissionTracking(mission.id)
      const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getMissionTracking>>>(trackingKey)
      return cached && Date.parse(received.timestamp) < Date.parse(cached.timestamp) ? cached : received
    },
    enabled: Boolean(user && !isCached && !['completed', 'cancelled'].includes(mission.status)),
    refetchInterval: query => !pageVisible || !isMissionTrackingActive(mission.status) ? false : query.state.error
      ? retryAfterDelay(query.state.error, Math.min(30_000, 3_000 * (2 ** Math.min(query.state.fetchFailureCount, 3))))
      : 3_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const trackingControl = useMutation({
    mutationFn: (action: 'start' | 'pause' | 'resume' | 'reset') => controlMissionTracking(mission.id, action),
    onSuccess: () => void tracking.refetch(),
  })
  const refreshTracking = tracking.refetch

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (mission.status === 'arrived' && !isCached) void refreshTracking()
  }, [mission.status, isCached, refreshTracking])

  return (
    <article className="rescuer-mission-card" aria-labelledby={titleId}>
      {/* Header */}
      <div className="rescuer-mission-card__head">
        <div>
          <div className="rescuer-mission-card__id" id={titleId} aria-label={`Mission ${mission.id}`}>
            <strong>Mission</strong> <RecordId id={mission.id}/>
          </div>
          <StatusBadge status={mission.status} />
        </div>
        <SyncStatusBadge
          state={syncState}
          lastSyncedAt={lastSyncedAt ?? undefined}
        />
      </div>

      {isCached && (
        <p className="rescuer-mission-card__cache-note" role="note">
          Cached mission for offline reference. Conditions may have changed since the last sync.
        </p>
      )}

      {/* Request summary */}
      {req ? (
        <div className="rescuer-mission-card__meta">
          <span>
            <Icon name="pin" size={12} /> {req.location.address}
          </span>
          <span><Icon name="volunteers" size={16}/> {req.headcount} persons</span>
          {req.medical_needs && (
            <span style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>
              <Icon name="medical" size={16}/> Medical needed
            </span>
          )}
          <span>Flood level: {req.reported_flood_level}</span>
          <span>Reported severity: {req.reported_severity ?? 'moderate'}</span>
        </div>
      ) : (
        <p className="proto-notice" role="status">
          Request summary is unavailable. Refresh before beginning the mission.
        </p>
      )}

      {mission.status !== 'cancelled' && <WorkspaceProgress stages={MISSION_STAGES} current={mission.status} label="Mission progress"/>}

      {/* Non-production prototype notice */}
      <p className="proto-notice" role="note" style={{ marginTop: 8 }}>
        <strong>Prototype:</strong> Route and movement use controlled simulation data. This account
        workflow is not a production emergency-dispatch service.
      </p>

      {tracking.data && (
        <div className="mission-tracking-panel">
          <div className="mission-tracking-panel__header"><strong>Shared Simulated Tracking</strong></div>
          <MissionTrackingMap
            route={tracking.data.route_geometry?.coordinates ?? []}
            position={tracking.data.position?.coordinates ?? null}
            progress={tracking.data.progress_ratio}
            follow={followRescuer}
            onFollowChange={setFollowRescuer}
            onUserPan={suspendFollow}
            stationId={mission.station_id ?? undefined}
            incident={req?.location.point?.coordinates}
          />
          <div className="mission-tracking-panel__metrics">
            <span>Status: <strong>{tracking.data.simulation_status}</strong></span>
            <span>Remaining: <strong>{Math.round(tracking.data.remaining_distance_m)} m</strong></span>
            <span>ETA: <strong>{Math.ceil(tracking.data.estimated_remaining_time_s / 60)} min</strong></span>
            <span>Updated: <strong>{new Date(tracking.data.timestamp).toLocaleTimeString()}</strong></span>
          </div>
          <div className="mission-tracking-panel__actions">
            {mission.status === 'assigned' && <span className="workspace-caption">Assigned means this station is reserved. Accepting the mission starts the shared simulation together with the status update.</span>}
            {tracking.data.simulation_status === 'running' && <Button size="sm" variant="ghost" type="button" disabled={trackingControl.isPending} onClick={() => trackingControl.mutate('pause')}>Pause simulation</Button>}
            {tracking.data.simulation_status === 'paused' && <Button size="sm" variant="ghost" type="button" disabled={trackingControl.isPending} onClick={() => trackingControl.mutate('resume')}>Resume simulation</Button>}
          </div>
        </div>
      )}
      {tracking.error && (
        <p className="rescuer-mission-card__queue-note" role="status">
          Mission tracking is unavailable or rate-limited. The marker will not animate beyond the last server update.
        </p>
      )}

      {/* Next valid transition action */}
      {next && mission.status !== 'completed' ? (
        <>
          {isQueueLocked && (
            <p id={queueNoteId} className="rescuer-mission-card__queue-note" role="status">
              A status transition is awaiting sync or review. The displayed mission status has not
              been advanced by that queued event.
            </p>
          )}
          {isAdvancing && (
            <p className="rescuer-mission-card__queue-note" role="status">
              Saving or syncing a status transition. Server acceptance is not yet confirmed.
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            type="button"
            onClick={onAdvanceStatus}
            disabled={isAdvancing || isQueueLocked}
            aria-busy={isAdvancing}
            aria-describedby={isQueueLocked ? queueNoteId : undefined}
          >
            <Icon name="route" size={18} />
            <span>
              {isAdvancing
                ? 'Saving status…'
                : isQueueLocked
                  ? 'Status update awaiting review'
                  : (NEXT_LABEL[next] ?? `Mark ${next}`)}
            </span>
          </Button>
        </>
      ) : mission.status === 'completed' ? (
        <span className="mission-completed-tag" role="status">
          ✓ Mission Completed
        </span>
      ) : null}

      {/* Status history */}
      {mission.status_history.length > 0 && (
        <details className="rescuer-mission-card__history">
          <summary>Status history ({mission.status_history.length} events)</summary>
          <ol aria-label="Mission status history">
            {mission.status_history.map((evt: MissionStatusHistoryItem) => (
              <li key={evt.event_id} className="history-item">
                <span className="history-item__states">
                  {evt.prior_status} → {evt.new_status}
                </span>
                <span className="history-item__meta">
                  {evt.actor_role} · {evt.source} ·{' '}
                  {new Date(evt.server_recorded_at).toLocaleTimeString()}
                </span>
                {evt.note && <span className="history-item__note">{evt.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  )
}

function MissionTrackingMap({
  route,
  position,
  progress,
  follow,
  onFollowChange,
  onUserPan,
  stationId,
  incident,
}: {
  route: [number, number][]
  position: [number, number] | null
  progress: number
  follow: boolean
  onFollowChange: (following: boolean) => void
  onUserPan: () => void
  stationId?: string
  incident?: [number, number]
}) {
  const geoJsonRoute = route.filter(point => point.length === 2 && point.every(Number.isFinite))
  const incidentRecords = incident ? [{ id: 'mission-incident', label: 'Incident location', coordinates: incident }] : []
  return <div className="mission-tracking-map" aria-label="Simulated mission route and rescuer marker">
    <InteractiveFloodMap compact showRouteStatus={false} center={geoJsonRoute[0] ? [geoJsonRoute[0][1], geoJsonRoute[0][0]] : undefined}
      routeGeometry={geoJsonRoute} trackingPosition={position ? { type: 'Point', coordinates: position } : null} trackingProgress={progress} showRouteControl
      followPosition={follow} onFollowChange={onFollowChange} onManualPan={onUserPan} assignedStationId={stationId} records={incidentRecords}/>
  </div>
}
