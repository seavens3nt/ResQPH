import type { CSSProperties } from 'react'
import type { useRescueRequest } from '../requests/hooks'

const stages = [
  ['pending','Station matching','5a5dd.svg',23.3333,29.0444],
  ['assigned','Station assigned','f4d8d.svg',31.3333,24.6667],
  ['en-route','En route','7d8da.svg',29.601,27.3336],
  ['arrived','Arrived at location','ad317.svg',31.3335,31.2125],
  ['completed','Completed','a8780.svg',26,26],
] as const
type RequestData = NonNullable<ReturnType<typeof useRescueRequest>['data']>

export function RequestStatusPresentation({data,isFetching,isCancelling=false,onRefresh,onCancel}: {
  data:RequestData; isFetching:boolean; isCancelling?:boolean; onRefresh:()=>void; onCancel:()=>void;
}) {
  const current=stages.findIndex(stage=>stage[0]===data.status)
  const facts=[
    ['People needing help',String(data.headcount)],
    ['Reported severity',(data.reported_severity ?? 'moderate').replace(/^./,s=>s.toUpperCase())],
    ['Observed flood level',data.reported_flood_level.replace(/^./,s=>s.toUpperCase())],
    ['Situation summary',data.situation_summary || 'None reported'],
    ['Accessibility needs',data.vulnerabilities.join(', ') || 'None reported'],
    ['Medical needs',data.medical_needs ? data.medical_details || 'Medical assistance requested' : 'None reported'],
  ]
  return <>
    {data.status==='cancelled' ? <p className="status-popup-cancelled-update" role="status">Request cancelled</p> : <div className="status-popup-timeline">
    <div className="status-popup-track" role="progressbar" aria-label="Request progress" aria-valuemin={0} aria-valuemax={5} aria-valuenow={current+1} aria-valuetext={stages[current]?.[1] ?? 'Unknown status'}><span style={{width:`${current===stages.length-1 ? 100 : Math.max(0,(current+.5)/stages.length*100)}%`}}/></div>
    <ol className="status-popup-progress" aria-label="Request stages">
      {stages.map(([value,label,file,width,height],index)=><li key={value} aria-current={value===data.status ? 'step' : undefined} className={index<=current ? 'is-reached' : undefined}>
        <span className="status-popup-icon" style={{'--icon-width':width,'--icon-height':height} as CSSProperties}><img src={`/figma-status/${file}`} alt=""/></span><span>{label}</span>
      </li>)}
    </ol></div>}
    {data.status==='pending' && <p className="status-popup-assignment-reason" role="status">{data.assignment_reason==='no_station_available' ? 'All simulated station units are assigned. The system will retry when a station becomes available.' : data.assignment_reason==='no_reachable_station' ? 'No available station currently has an admissible route. Automatic matching will retry as conditions change.' : 'Queued for automatic station matching; no dispatcher action is required.'}</p>}
    <section className="status-popup-summary" aria-labelledby="status-summary-title"><h4 id="status-summary-title">Review rescue request</h4><dl>{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <div className="status-popup-actions"><button aria-label="Refresh request status" onClick={onRefresh} disabled={isFetching}>{isFetching?'Refreshing…':'Refresh'}</button>{data.status==='pending' && <button className="status-popup-cancel" disabled={isCancelling} aria-busy={isCancelling} onClick={onCancel}>{isCancelling?'Cancelling…':'Cancel Request'}</button>}</div>
  </>
}
