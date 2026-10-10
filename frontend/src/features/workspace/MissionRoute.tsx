import { WorkspaceCard, WorkspaceFacts } from './WorkspaceUI'
import { useRoute } from '../routing/useRoute'
import { useEffect, useRef, useState } from 'react'
import { CONTROLLED_ROUTE_REQUEST } from '../routing/routeScenarios'
import { InteractiveFloodMap } from '../map/InteractiveFloodMap'
import { RouteSummary } from '../routing/presentation/RouteSummary'
import { formatDuration } from '../routing/presentation/formatDuration'
import type { MissionDetail } from '../../api/missions'

export function MissionRoute({mission, offline = false}: {mission: MissionDetail; offline?: boolean}) {
  // A changed mission or destination owns a fresh route; never display the previous result.
  return <MissionRouteContent key={`${mission.id}:${mission.request_summary?.location.point?.coordinates.join(',') ?? 'missing'}`} mission={mission} offline={offline}/>
}

function MissionRouteContent({mission, offline}: {mission: MissionDetail; offline: boolean}) {
  const route = useRoute()
  const [includeMl, setIncludeMl] = useState(false)
  const requestedOnEntry = useRef(false)
  const point = mission.request_summary?.location.point
  const requestRoute = route.requestRoute
  useEffect(() => {
    if (offline || !point || requestedOnEntry.current) return
    requestedOnEntry.current = true
    requestRoute({...CONTROLLED_ROUTE_REQUEST, destination: point, include_ml_penalty: false})
  }, [offline, point, requestRoute])

  return <WorkspaceCard className="mission-route">
    <div className="mission-route-controls">
    <h3>Route to this mission</h3>
    <WorkspaceFacts items={[{label:'From',value:'Controlled staging point'},{label:'Destination',value:mission.request_summary?.location.address ?? 'Unavailable'}]}/>
    <p>One flood-aware route through the controlled U-Belt road graph. This is not door-to-door navigation or a guarantee of safety.</p>
    <button className="workspace-primary" disabled={!point || offline || route.isPending} onClick={() => point && route.requestRoute({...CONTROLLED_ROUTE_REQUEST, destination: point, include_ml_penalty: includeMl})}>{route.isPending ? 'Calculating…' : route.routeState.status === 'error' ? 'Retry mission route' : route.routeState.status === 'idle' ? 'Calculate mission route' : 'Recalculate mission route'}</button>
    {!point && <p role="alert">This mission has no destination coordinates. Ask the dispatcher to review its request location.</p>}
    <details className="workspace-technical"><summary>Method and routing details</summary><p>Rule-based A* uses the curated road graph and flood penalties. No live tracking. Routes and map tiles are not cached offline.</p><WorkspaceFacts items={[{label:'Staging coordinates',value:CONTROLLED_ROUTE_REQUEST.origin.coordinates.join(', ')},{label:'Destination coordinates',value:point?.coordinates.join(', ') ?? 'Unavailable'}]}/><label><input type="checkbox" checked={includeMl} onChange={e => setIncludeMl(e.target.checked)} disabled={offline || route.isPending}/> Include optional model risk on the next calculation</label><p>The server applies this only when an approved model is ready; otherwise rule-based routing remains active.</p></details>
    {offline ? <p role="status">Reconnect to calculate and view the mission route. Map tiles are not cached.</p> : <>
      {route.routeState.status === 'route-found' && <div className="workspace-route-result" role="status"><p><strong>Route found:</strong> {route.routeState.result.distance_m.toFixed(0)} m · Estimated {formatDuration(route.routeState.result.estimated_time_s)}</p><p>{route.routeState.result.fallback_used ? 'Rule-based fallback is active; model risk was not applied.' : 'Uses eligible roads and flood penalties in the controlled scenario.'}</p><details><summary>Route explanation and technical details</summary><RouteSummary status="route-found" result={route.routeState.result} /></details></div>}
      {route.routeState.status === 'no-route' && <RouteSummary status="no-route" result={route.routeState.result} />}
      {route.routeState.status === 'error' && <p role="alert">{route.routeState.message}</p>}
    </>}
    </div>
    {!offline && <InteractiveFloodMap showRouteStatus={false} activeStage={mission.status === 'cancelled' ? 'none' : mission.status} routeState={route.routeState} records={point ? [{id:mission.id,label:mission.request_summary?.location.address ?? 'Mission destination',coordinates:point.coordinates}] : []}/>}
  </WorkspaceCard>
}
