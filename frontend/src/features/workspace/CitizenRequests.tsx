import { FigmaHomeAsset } from './FigmaHomeAsset'
import { WorkspaceCard } from './WorkspaceUI'
import { QueryState } from './Records'
import { useMyRescueRequests } from '../requests/hooks'
import { requestLabel } from './requestLabel'

/** Reference labels are local list aliases; actions always use the stored ID. */
export function CitizenRequests({filter,onFilter,onNew,onSelect,selected}: {
  filter:string; onFilter:(filter:string)=>void; onNew:()=>void;
  onSelect:(id:string)=>void; selected:string|null;
}) {
  const query = useMyRescueRequests()
  return <section className="screenshot-requests" aria-labelledby="requests-page-title">
    <h2 id="requests-page-title" className="requests-page-title"><FigmaHomeAsset name="requestsTitle"/>My Requests</h2>
    <div className="requests-reference-grid">
      <WorkspaceCard className="requests-list-card">
        <div className="requests-card-heading"><span>Your Submitted Requests</span><h3>Requests</h3></div>
        <div className="requests-controls" role="group" aria-label="Request filter">
          {['active','all','history'].map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>onFilter(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}
        </div>
        <div className="requests-inset-panel" aria-busy={query.isFetching}>
          <QueryState query={query} layout="table" label="Loading your requests…">{data=><>
            <div className="requests-table-scroll"><table className="requests-reference-table" aria-label="Your Submitted Requests">
              <thead><tr>{['Request','Location','People','Status'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{data.items.map((record,index)=>({record,label:requestLabel(record.id,index)})).filter(({record})=>filter==='all'||(filter==='history')===['completed','cancelled'].includes(record.status)).map(({record,label})=><tr key={record.id} className={`requests-selectable-row${selected===record.id ? ' is-selected' : ''}`} onClick={event=>{event.currentTarget.querySelector('button')?.focus();onSelect(record.id)}}>
                <td><button type="button" aria-label={`View ${label}`} aria-pressed={selected===record.id}>{label}</button></td>
                <td title={record.location.address}>{record.location.address}</td><td>{record.headcount}</td><td>{record.status.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase())}</td>
              </tr>)}</tbody>
            </table></div>
            {!data.items.length && <p className="requests-empty-list">No rescue requests found.</p>}
            {data.items.length > 0 && !data.items.some(record=>filter==='all'||(filter==='history')===['completed','cancelled'].includes(record.status)) && <p className="requests-empty-list" role="status">No requests match this filter.</p>}
            {(data.total??0)>data.items.length && <p className="requests-empty-list">Showing the most recent {data.items.length} of {data.total} requests.</p>}
          </>}</QueryState>
        </div>
        <div className="requests-actions">
          <button type="button" className="requests-refresh" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh Request</button>
          <button type="button" className="requests-new" onClick={onNew}>New Request</button>
        </div>
      </WorkspaceCard>
    </div>
  </section>
}
