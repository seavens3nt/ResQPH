import { useState } from 'react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { useRescueRequest, useCancelRescueRequest } from '../../../../features/requests/hooks'
import { PrototypeNotice } from './PrototypeNotice'
import { StatusBadge } from './StatusBadge'
import { RecordId } from '../../../../features/workspace/Records'
import { WorkspaceFacts, WorkspaceProgress, WorkspaceTimeline } from '../../../../features/workspace/WorkspaceUI'
import { RequestStatusPresentation } from '../../../../features/workspace/RequestStatusPresentation'

const STAGES = [
  {value:'pending',label:'Pending dispatch'}, {value:'assigned',label:'Team assigned'},
  {value:'en-route',label:'En route'}, {value:'arrived',label:'Arrived at location'},
  {value:'completed',label:'Completed'},
] as const

export function RequestStatusView({requestId, onCancelled, compact = false, popup = false}: {requestId: string; onCancelled?: () => void; compact?: boolean; popup?: boolean}) {
  const {data, isLoading, isError, error, dataUpdatedAt, isFetching, refetch} = useRescueRequest(requestId)
  const {mutate:cancel,isPending:isCancelling} = useCancelRescueRequest()
  const [cancelError,setCancelError] = useState<string|null>(null)
  if(isLoading) return <div data-testid="status-loading"><LoadingState layout="detail" label="Loading request status…"/></div>
  if(isError || !data) return <div role="alert" data-testid="status-error"><strong>Could not load request status</strong><p>{error instanceof Error ? error.message : 'Unable to load request status.'}</p><button onClick={() => void refetch()}>Retry</button></div>
  const {id,status,location,headcount,reported_flood_level,updated_at,status_history,version} = data
  function handleCancel() {
    if (status !== 'pending' || isCancelling) return
    setCancelError(null)
    cancel({requestId:id,payload:{reason:'Citizen cancelled via prototype UI',version}},{
      onSuccess:() => {onCancelled?.()},
      onError:err => {
        const response = (err as {response?:{status?:number}}).response
        if(response?.status === 409) {void refetch();setCancelError('Conflict: the request state changed before cancellation. The latest authoritative status is being refreshed.')}
        else setCancelError('Cancellation failed. Your input is preserved — try again.')
      },
    })
  }
  return <div className={`request-tracker ${compact ? 'is-compact' : 'is-full'}`} data-testid="status-view">
    {popup ? <RequestStatusPresentation data={data} isFetching={isFetching} isCancelling={isCancelling} onRefresh={()=>void refetch()} onCancel={handleCancel}/> : <>
    <div className="workspace-panel-heading"><h3 aria-label={`Request ${id}`}>Request status</h3><StatusBadge status={status} large/></div>
    <RecordId id={id}/>
    <p className="workspace-caption">Controlled/historical information only — not live or official dispatch data</p>
    {status !== 'cancelled' && <WorkspaceProgress stages={STAGES} current={status} label="Request progress"/>}
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
    {status === 'pending' && <div className="workspace-cancel-panel"><strong>Cancel request</strong><p>You can cancel while this request is awaiting assignment.</p><button disabled={isCancelling} aria-busy={isCancelling} onClick={handleCancel}>{isCancelling ? 'Cancelling…' : 'Cancel request'}</button></div>}
    </>}
    {cancelError && <p role="alert">{cancelError}</p>}
  </div>
}
