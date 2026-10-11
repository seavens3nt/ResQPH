import { WorkspaceCard, WorkspaceFacts } from './WorkspaceUI'
import { InteractiveFloodMap } from '../map/InteractiveFloodMap'
import { formatDuration } from '../routing/presentation/formatDuration'
import type { MissionDetail } from '../../api/missions'
import { journeyRoute, useMissionJourney } from '../missions/useMissionJourney'
import { RESCUE_STATIONS } from '../map/stations'

export function MissionRoute({ mission, offline = false, lastSyncedAt }: { mission: MissionDetail; offline?: boolean; lastSyncedAt?: string | null }) {
  const [follow, setFollow] = useState(true)
  const journey = useMissionJourney(offline ? null : mission.id)
  const currentMission = journey.mission.data ?? mission
  const route = journeyRoute(currentMission)
  const routeResult = currentMission.latest_route_result as { status?: string; route_id?: string; distance_m?: number; estimated_time_s?: number; explanation?: string } | null | undefined
  const hasRoute = routeResult?.status === 'route-found' && route.length > 1
  const station = RESCUE_STATIONS.find(item => item.station_id === currentMission.station_id)
  const first = route[0]

  return <WorkspaceCard className="mission-route">
    <div className="mission-route-controls">
      <h3>Assigned station route</h3>
      <WorkspaceFacts items={[
        { label: 'From', value: station?.name ?? currentMission.team_id },
        { label: 'Destination', value: currentMission.request_summary?.location.address ?? 'Unavailable' },
        { label: 'Mission', value: currentMission.status.replace('-', ' ') },
        ...(hasRoute ? [{ label: 'Route distance', value: `${Math.round(routeResult.distance_m ?? 0)} m` }, { label: 'Estimated time', value: formatDuration(routeResult.estimated_time_s ?? 0) }] : []),
      ]}/>
      <p>The station assignment stores one shortest admissible route from its actual simulated response position. Road and flood inputs are controlled prototype data, not live safety guidance.</p>
      {!hasRoute && <p role="status">No accepted route geometry is attached to this mission{offline ? ' in the cached record' : ''}.</p>}
      {offline && <p role="status">Offline view · last mission sync {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'unknown'} · tracking is paused until reconnection. Reconnect to refresh tracking; map tiles are not cached.</p>}
      {currentMission.status === 'completed' && <p role="status">Mission completed. Tracking has stopped.</p>}
      {currentMission.status === 'cancelled' && <p role="status">Mission cancelled. Tracking has stopped.</p>}
      {journey.mission.isError && <p role="status">Mission refresh failed. Showing the last available mission record.</p>}
      {journey.tracking.isError && <p role="status">Live tracking refresh failed. The last server position remains shown.</p>}
      {!offline && journey.tracking.data && <p className="workspace-caption" aria-live="polite">{(journey.tracking.data.simulation_status ?? 'tracking unavailable').replaceAll('_', ' ')} · {Math.round(journey.tracking.data.remaining_distance_m)} m remaining · {formatDuration(journey.tracking.data.estimated_remaining_time_s)} simulated travel time · updated {new Date(journey.tracking.data.timestamp).toLocaleTimeString()}</p>}
      {hasRoute && <details className="workspace-technical"><summary>Route method and coordinates</summary><p>{routeResult.explanation ?? 'Shortest admissible route through the controlled road graph.'}</p><WorkspaceFacts items={[{ label: 'Actual route origin', value: first ? `${first[1].toFixed(6)}, ${first[0].toFixed(6)}` : 'Unavailable' }, { label: 'Route ID', value: routeResult.route_id ?? 'Unavailable' }]}/></details>}
    </div>
    {!offline && <InteractiveFloodMap showRouteStatus={false} center={first ? [first[1], first[0]] : undefined}
      routeGeometry={route} trackingPosition={journey.tracking.data?.position ?? null} trackingProgress={journey.tracking.data?.progress_ratio} followPosition={follow} onFollowChange={setFollow} onManualPan={() => setFollow(false)} showRouteControl
      assignedStationId={currentMission.station_id ?? undefined}
      records={currentMission.request_summary?.location.point ? [{ id: currentMission.request_id, label: currentMission.request_summary.location.address, coordinates: currentMission.request_summary.location.point.coordinates }] : []}/>}
  </WorkspaceCard>
}
import { useState } from 'react'
