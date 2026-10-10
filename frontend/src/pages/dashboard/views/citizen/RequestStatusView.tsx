import { useCallback, useState } from 'react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { useRescueRequest, useCancelRescueRequest } from '../../../../features/requests/hooks'
import { PrototypeNotice } from './PrototypeNotice'
import { StatusBadge } from './StatusBadge'
import { RecordId } from '../../../../features/workspace/Records'
import { WorkspaceFacts, WorkspaceProgress, WorkspaceTimeline } from '../../../../features/workspace/WorkspaceUI'
import { RequestStatusPresentation } from '../../../../features/workspace/RequestStatusPresentation'
import { useMissionJourney, journeyRoute } from '../../../../features/missions/useMissionJourney'
import { InteractiveFloodMap } from '../../../../features/map/InteractiveFloodMap'
import { RESCUE_STATIONS } from '../../../../features/map/stations'
import { ApiError } from '../../../../api/assignments'

const STAGES = [
  {value:'pending',label:'Station matching'}, {value:'assigned',label:'Station assigned'},
  {value:'en-route',label:'En route'}, {value:'arrived',label:'Arrived at location'},
  {value:'completed',label:'Completed'},
] as const

export function RequestStatusView({requestId, onCancelled, compact = false, popup = false}: {requestId: string; onCancelled?: () => void; compact?: boolean; popup?: boolean}) {
  const {data, isLoading, isError, error, dataUpdatedAt, isFetching, refetch} = useRescueRequest(requestId)
  const {mutate:cancel,isPending:isCancelling} = useCancelRescueRequest()
  const [cancelError,setCancelError] = useState<string|null>(null)
  const [followRescuer, setFollowRescuer] = useState(true)
  const suspendFollow = useCallback(() => setFollowRescuer(false), [])
  const journey = useMissionJourney(data?.mission_id)
  if(isLoading) return <div data-testid="status-loading"><LoadingState layout="detail" label="Loading request status…"/></div>
  if(isError || !data) return <div role="alert" data-testid="status-error"><strong>Could not load request status</strong><p>{error instanceof Error ? error.message : 'Unable to load request status.'}</p><button onClick={() => void refetch()}>Retry</button></div>
  const {id,status,location,headcount,reported_flood_level,updated_at,status_history,version} = data
  function handleCancel() {
    if (status !== 'pending' || isCancelling) return
    setCancelError(null)
    cancel({requestId:id,payload:{reason:'Citizen cancelled via prototype UI',version}},{
      onSuccess:() => {onCancelled?.()},
      onError:err => {
        const responseStatus = err instanceof ApiError ? err.httpStatus : typeof err === 'object' && err !== null && 'response' in err
          ? (err as {response?:{status?:number}}).response?.status : undefined
        const responseMessage = err instanceof ApiError ? err.message : typeof err === 'object' && err !== null && 'response' in err
          ? (err as {response?:{data?:{error?:{message?:string}}}}).response?.data?.error?.message : undefined
        if(responseStatus === 409) {void refetch();setCancelError(`Conflict: the request state changed before cancellation. ${responseMessage ?? ''} The latest authoritative status is being refreshed.`)}
        else if(responseStatus === 401) setCancelError('Your citizen session expired. Sign in again before retrying cancellation.')
        else setCancelError('Cancellation failed. Your input is preserved — try again.')
      },
    })
  }
  const journeyPanel = data.mission_id && <section className="citizen-mission-journey" aria-label="Assigned rescue station journey">
    <h4>Station response</h4>
    <p>{RESCUE_STATIONS.find(station => station.station_id === data.assigned_station_id)?.name ?? 'Assigned station'} · Assigned means this station is reserved for the request.</p>
    {journey.tracking.data && <>
      <div className="workspace-caption" aria-live="polite">{journey.tracking.data.simulation_status === 'running' ? 'Simulated travel in progress' : `Response ${journey.tracking.data.simulation_status.replaceAll('_', ' ')}`} · {Math.round(journey.tracking.data.remaining_distance_m)} m remaining · ETA {Math.ceil(journey.tracking.data.estimated_remaining_time_s / 60)} min · Updated {new Date(journey.tracking.data.timestamp).toLocaleTimeString()}</div>
      {journey.tracking.isError && <p role="status">Tracking update unavailable. Showing the last server-confirmed position; movement is paused until updates resume.</p>}
      <InteractiveFloodMap center={[location.point.coordinates[1], location.point.coordinates[0]]} compact showRouteStatus={false} showRouteControl routeGeometry={journeyRoute(journey.mission.data)} trackingPosition={journey.tracking.data.position} trackingProgress={journey.tracking.data.progress_ratio} assignedStationId={data.assigned_station_id ?? undefined} records={[{id:'citizen-incident',label:'Your rescue location',coordinates:location.point.coordinates}]} followPosition={followRescuer} onFollowChange={setFollowRescuer} onManualPan={suspendFollow}/>
    </>}
    {journey.tracking.isLoading && <p role="status">Loading shared route and response progress…</p>}
    {journey.tracking.isError && !journey.tracking.data && <p role="alert">The shared tracking update could not be loaded. Refresh to try again.</p>}
    {journey.mission.isError && <p role="status">Mission details are temporarily unavailable; the request status remains authoritative.</p>}
    {journey.mission.data && journeyRoute(journey.mission.data).length < 2 && <p role="status">No supported route is available for this pinned location. No route is being shown.</p>}
  </section>
  return <div className={`request-tracker ${compact ? 'is-compact' : 'is-full'}`} data-testid="status-view">
    {popup ? <><RequestStatusPresentation data={data} isFetching={isFetching} isCancelling={isCancelling} onRefresh={()=>void refetch()} onCancel={handleCancel}/>{journeyPanel}</> : <>
    <div className="workspace-panel-heading"><h3 aria-label={`Request ${id}`}>Request status</h3><StatusBadge status={status} large/></div>
    <RecordId id={id}/>
    <p className="workspace-caption">Controlled/historical information only — not live or official dispatch data</p>
    {status !== 'cancelled' && <WorkspaceProgress stages={STAGES} current={status} label="Request progress"/>}
    {journeyPanel}
    <section><h4>Request details</h4><WorkspaceFacts items={[
      {label:'Location',value:location.address},
      {label:'People',value:headcount},
      {label:'Reported flood level',value:reported_flood_level},
      {label:'Situation summary',value:data.situation_summary || 'No optional situation details.'},
      {label:'Accessibility needs',value:data.vulnerabilities.join(', ') || 'None reported'},
      {label:'Medical needs',value:data.medical_needs ? data.medical_details || 'Medical assistance requested' : 'None reported'},
    ]}/></section>
    {status_history && status_history.length > 0 && <details className="request-history" open={!compact}><summary>Status history</summary><WorkspaceTimeline events={status_history.map((entry,index) => ({id:String(index),status:entry.status,timestamp:entry.occurred_at,note:entry.note}))}/></details>}
    <details className="workspace-technical"><summary>Data freshness and limitations</summary><p>Last updated (server): {updated_at ? new Date(updated_at).toLocaleString() : '—'}</p><p>Last fetched: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'unknown'}</p><PrototypeNotice variant="status"/></details>
    <button aria-label="Refresh request status" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? 'Refreshing…' : 'Refresh'}</button>
    {status === 'pending' && <div className="workspace-cancel-panel"><strong>Automatic station assignment</strong><p>{data.assignment_reason === 'no_station_available' ? 'All simulated station units are currently assigned. The system will retry when capacity is released.' : data.assignment_reason === 'no_reachable_station' ? 'No available station currently has an admissible route. The system will retry as conditions change.' : 'Your request is queued for automatic station matching. No dispatcher action is required.'}</p><button disabled={isCancelling} aria-busy={isCancelling} onClick={handleCancel}>{isCancelling ? 'Cancelling…' : 'Cancel request'}</button></div>}
    </>}
    {cancelError && <p role="alert">{cancelError}</p>}
  </div>
}
