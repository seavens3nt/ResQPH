/**
 * RescuerMissionCard — Displays a single mission's summary with stale/cached state.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Cached / stale mission state (last_synced_at label)
 *   - Mission and route loading/failure states (handled by parent)
 *   - Valid status-transition action button
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
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
    'en-route': 'TAP EN ROUTE',
    arrived: 'TAP ARRIVED AT SCENE',
    completed: 'TAP RESCUE COMPLETED',
  }

  const syncState = isStale || isCached ? 'stale' : 'fresh'
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  const [followRescuer, setFollowRescuer] = useState(true)
  const suspendFollow = useCallback(() => setFollowRescuer(false), [])
  const tracking = useQuery({
    queryKey: ['mission-tracking', mission.id],
    queryFn: () => getMissionTracking(mission.id),
    enabled: !isCached && mission.status !== 'completed',
    refetchInterval: pageVisible ? 3000 : false,
  })
  const trackingControl = useMutation({
    mutationFn: (action: 'start' | 'pause' | 'resume' | 'reset') => controlMissionTracking(mission.id, action),
    onSuccess: () => void tracking.refetch(),
  })

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

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
        </div>
      ) : (
        <p className="proto-notice" role="status">
          Request summary is unavailable. Refresh before beginning the mission.
        </p>
      )}

      {mission.status !== 'cancelled' && <WorkspaceProgress stages={MISSION_STAGES} current={mission.status} label="Mission progress"/>}

      {/* Non-production prototype notice */}
      <p className="proto-notice" role="note" style={{ marginTop: 8 }}>
        <strong>Prototype:</strong> Route data is fixture-based; status transitions use demo role
        simulation. Not a production dispatch system.
      </p>

      {tracking.data && (
        <div className="mission-tracking-panel">
          <div className="mission-tracking-panel__header">
            <strong>Shared Simulated Tracking</strong>
            <label>
              <input
                type="checkbox"
                checked={followRescuer}
                onChange={(event) => setFollowRescuer(event.target.checked)}
              />
              Follow rescuer
            </label>
          </div>
          <MissionTrackingMap
            route={tracking.data.route_geometry?.coordinates ?? []}
            position={tracking.data.position?.coordinates ?? null}
            follow={followRescuer}
            onUserPan={suspendFollow}
          />
          <div className="mission-tracking-panel__metrics">
            <span>Status: <strong>{tracking.data.simulation_status}</strong></span>
            <span>Remaining: <strong>{Math.round(tracking.data.remaining_distance_m)} m</strong></span>
            <span>ETA: <strong>{Math.ceil(tracking.data.estimated_remaining_time_s / 60)} min</strong></span>
            <span>Updated: <strong>{new Date(tracking.data.timestamp).toLocaleTimeString()}</strong></span>
          </div>
          <div className="mission-tracking-panel__actions">
            <Button size="sm" variant="outline" type="button" onClick={() => trackingControl.mutate('start')}>Start</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => trackingControl.mutate('pause')}>Pause</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => trackingControl.mutate('resume')}>Resume</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => trackingControl.mutate('reset')}>Reset</Button>
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
  follow,
  onUserPan,
}: {
  route: [number, number][]
  position: [number, number] | null
  follow: boolean
  onUserPan: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const lineRef = useRef<L.Polyline | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView([14.6042, 120.9946], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.on('dragstart zoomstart', onUserPan)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      lineRef.current = null
      markerRef.current = null
    }
  }, [onUserPan])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const latLngRoute = route.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)
    if (lineRef.current) lineRef.current.remove()
    if (latLngRoute.length >= 2) {
      lineRef.current = L.polyline(latLngRoute, { color: '#2563eb', weight: 5, opacity: 0.84 }).addTo(map)
      map.fitBounds(lineRef.current.getBounds(), { padding: [20, 20] })
    }
  }, [route])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const latLng: L.LatLngTuple = [position[1], position[0]]
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(latLng, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(latLng)
    }
    if (follow) map.panTo(latLng, { animate: true, duration: 0.4 })
  }, [follow, position])

  return <div ref={containerRef} className="mission-tracking-map" aria-label="Simulated mission route and rescuer marker" />
}
