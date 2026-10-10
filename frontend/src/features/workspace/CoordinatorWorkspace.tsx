import { WorkspaceCard, WorkspaceTable, WorkspaceBadge, WorkspaceSplit, WorkspaceFacts, WorkspaceEmpty, WorkspaceTimeline } from './WorkspaceUI'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requests, teams, missions, cancelMission, cancelRequest } from '../../api/workspace'
import { assignTeam } from '../../api/assignments'
import { updateMissionStatus } from '../../api/missions'
import { Modal } from '../../components/ui/Modal'
import { InteractiveFloodMap } from '../map/InteractiveFloodMap'
import { QueryState, RecordId } from './Records'
import { errorMessage } from './errors'
import { MissionRoute } from './MissionRoute'
import type { RescueRequestRecord } from '../requests/types'
import type { MissionDetail } from '../../api/missions'
import { MissionDetails } from './MissionDetails'
import { DispatcherOverview } from './DispatcherOverview'

export function CoordinatorWorkspace({section, navigate}: {section: string; navigate: (section: string) => void}) {
  const client = useQueryClient()
  const queue = useQuery({queryKey: ['workspace-requests'], queryFn: requests, refetchInterval: 10000})
  const teamList = useQuery({queryKey: ['workspace-teams'], queryFn: teams, refetchInterval: 10000})
  const missionList = useQuery({queryKey: ['workspace-missions'], queryFn: () => missions(), refetchInterval: 10000})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [missionId, setMissionId] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const selected = queue.data?.items.find(r => r.id === selectedId)
  const [assignment, setAssignment] = useState<RescueRequestRecord | null>(null)
  const [teamId, setTeamId] = useState('')
  const [action, setAction] = useState<{mission?: MissionDetail; request?: RescueRequestRecord; kind: 'cancel' | 'complete'} | null>(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const change = useMutation({mutationFn: async (operation: () => Promise<unknown>) => operation(), onSuccess: () => {
    setNotice('Server confirmed the operation. Records refreshed.'); setAssignment(null); setAction(null); setReason('')
    void client.invalidateQueries()
  }})
  if (section === 'map') return <WorkspaceCard><h2>Mission routing map</h2><p>Choose an actual mission to evaluate its location from the controlled staging point.</p><QueryState query={missionList}>{data => <><label className="workspace-picker">Select mission<select value={missionId} onChange={e => setMissionId(e.target.value)}><option value="">Choose a mission</option>{data.map(m => <option key={m.id} value={m.id}>{m.request_summary?.location.address} · {m.team_id} · {m.status}</option>)}</select></label>{data.find(m => m.id === missionId) ? <MissionRoute key={missionId} mission={data.find(m => m.id === missionId)!}/> : <><WorkspaceEmpty title={data.length ? 'Select a mission' : 'No missions yet'} icon="route">Choose a mission above to calculate its controlled route.</WorkspaceEmpty><InteractiveFloodMap activeStage="none"/></>}</>}</QueryState></WorkspaceCard>
  const available = teamList.data?.filter(t => t.availability === 'available') ?? []
  return <>
    {notice && <p role="status">{notice}</p>}
    {change.isError && <p role="alert">{errorMessage(change.error)}</p>}
    <div className={'workspace-stack '+(section === 'overview' ? 'coordinator-overview' : '')}>
    {section === 'overview' && <DispatcherOverview queue={queue} teamList={teamList} missionList={missionList} navigate={navigate}
      onRequestSelect={id => {setSelectedId(id);setStatus('all');setSearch('');navigate('inquiries')}}
      onViewAll={() => {setStatus('pending');setSearch('');navigate('inquiries')}}
      onMissionSelect={id => {setMissionId(id);navigate('missions')}}/>}
    {section === 'inquiries' && <WorkspaceCard className="coordinator-queue"><h3>Rescue requests</h3><div className="workspace-split"><div><QueryState query={queue} layout="table" label="Loading rescue requests…">{data => <>
      <div className="workspace-toolbar"><label>Search requests<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Address or request ID"/></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{['all','pending','assigned','en-route','arrived','completed','cancelled'].map(s => <option key={s}>{s}</option>)}</select></label></div>
      {!data.items.length && <p>No requests found.</p>}
      {data.items.length > 0 && !data.items.some(r => (status === 'all' || r.status === status) && `${r.location.address} ${r.id}`.toLowerCase().includes(search.toLowerCase())) && <p>No requests match this queue filter.</p>}
      <WorkspaceTable headings={["Request","Location","People","Status","Action"]}>{data.items.filter(r => (status === 'all' || r.status === status) && `${r.location.address} ${r.id}`.toLowerCase().includes(search.toLowerCase())).map(r => <tr key={r.id}>
        <td><RecordId id={r.id}/></td><td>{r.location.address}</td><td>{r.headcount}</td><td><WorkspaceBadge status={r.status}>{r.status}</WorkspaceBadge></td><td><button onClick={() => setSelectedId(r.id)}>View</button></td>
      </tr>)}</WorkspaceTable>
      <button onClick={() => void queue.refetch()}>Refresh requests</button>
    </>}</QueryState>
    </div><WorkspaceCard as="article" >{selected ? <><h3>Request details</h3><RecordId id={selected.id}/><p><WorkspaceBadge status={selected.status}>{selected.status}</WorkspaceBadge></p><WorkspaceFacts items={[{label:'Location',value:selected.location.address},{label:'People needing help',value:selected.headcount},{label:'Reported time',value:new Date(selected.created_at).toLocaleString()},{label:'Details',value:selected.situation_summary || 'No optional situation details.'}]}/><h3>Status history</h3><WorkspaceTimeline events={(selected.status_history ?? []).map((event,i) => ({id:String(i),status:event.status,timestamp:event.occurred_at,note:event.note}))}/>{selected.status === 'pending' && <><button className="workspace-primary" onClick={() => {setAssignment(selected);setTeamId('');change.reset()}}>Assign team</button><button onClick={() => {setAction({request:selected,kind:'cancel'});setReason('');change.reset()}}>Cancel pending request</button></>}</> : <p>Select a request to inspect its details and assign a team.</p>}</WorkspaceCard>
    </div></WorkspaceCard>}
    {section === 'teams' && <WorkspaceCard ><h2>Rescue teams</h2><QueryState query={teamList} layout="table" label="Loading rescue teams…">{data => <WorkspaceTable headings={["Team name","Status","Current mission"]}>{data.map(t => <tr key={t.id}><td>{t.team_name}</td><td><WorkspaceBadge status={(t.availability === 'available' ? 'completed' : 'assigned')}>{t.availability}</WorkspaceBadge></td><td>{t.assigned_mission_id ? <RecordId id={t.assigned_mission_id}/> : '—'}</td></tr>)}</WorkspaceTable>}</QueryState></WorkspaceCard>}
    {section === 'missions' && <WorkspaceCard><h2>Mission records</h2><QueryState query={missionList} layout="table" label="Loading missions…">{data => <WorkspaceSplit inspector={data.find(m => m.id === missionId) ? <MissionDetails mission={data.find(m => m.id === missionId)!}/> : <WorkspaceEmpty title="Mission details" icon="boat">Choose a mission to inspect its linked request, progress, and recorded status history.</WorkspaceEmpty>}>
      {!data.length && <p>No missions found.</p>}
      <WorkspaceTable headings={['Mission','Location','Team','Status','Action']}>{data.map(m => <tr key={m.id} className={missionId === m.id ? 'is-selected' : undefined}><td><RecordId id={m.id}/></td><td>{m.request_summary?.location.address}</td><td>{m.team_id}</td><td><WorkspaceBadge status={m.status}/></td><td><button aria-pressed={missionId === m.id} onClick={() => setMissionId(m.id)}>View</button></td></tr>)}</WorkspaceTable>
      {data.filter(m => m.id === missionId).map(m => <section className="workspace-mission-actions" key={m.id}><button className="workspace-primary" onClick={() => navigate('map')}>Open routing map</button>
        {m.status === 'assigned' && <button onClick={() => {setAction({mission:m, kind:'cancel'}); setReason(''); change.reset()}}>Cancel before travel</button>}
        {m.status === 'arrived' && <button onClick={() => {setAction({mission:m, kind:'complete'}); setReason(''); change.reset()}}>Complete rescue</button>}
      </section>)}
    </WorkspaceSplit>}</QueryState></WorkspaceCard>}
    <Modal isOpen={Boolean(assignment)} onClose={() => !change.isPending && setAssignment(null)} title="Assign rescue team">
      {assignment && <WorkspaceFacts items={[{label:'Location',value:assignment.location.address},{label:'People needing help',value:assignment.headcount},{label:'Request',value:<RecordId id={assignment.id}/>}]}/>}
      <QueryState query={teamList}>{() => <>{!available.length && <p>No teams currently available.</p>}<label>Available team<select value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">Select a team</option>{available.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}</select></label></>}</QueryState>
      {change.isError && <p role="alert">{errorMessage(change.error)} Refresh records before retrying a conflict.</p>}
      <button disabled={!teamId || !assignment || change.isPending} onClick={() => assignment && change.mutate(() => assignTeam(assignment.id, {team_id: teamId, expected_request_version: assignment.version}))}>{change.isPending ? 'Assigning…' : 'Confirm assignment'}</button>
    </Modal>
    <Modal isOpen={Boolean(action)} onClose={() => !change.isPending && setAction(null)} title={action?.kind === 'complete' ? 'Review rescue completion' : 'Confirm cancellation'}>
      <p>{action?.mission?.request_summary?.location.address ?? action?.request?.location.address}</p>
      <label>{action?.kind === 'complete' ? 'Completion details' : 'Cancellation reason'}<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      {change.isError && <p role="alert">{errorMessage(change.error)}</p>}
      <button disabled={reason.trim().length < 3 || change.isPending} onClick={() => action && change.mutate(() => action.mission ?
        action.kind === 'cancel' ? cancelMission(action.mission.id, action.mission.version, reason.trim()) :
        updateMissionStatus(action.mission.id, {event_id: crypto.randomUUID(), new_status:'completed', expected_mission_version:action.mission.version, client_recorded_at:new Date().toISOString(), source:'online', note:reason.trim()}) :
        cancelRequest(action.request!.id, action.request!.version, reason.trim()))}>Confirm {action?.kind === 'complete' ? 'completion' : 'cancellation'}</button>
    </Modal>
  </div></>
}
