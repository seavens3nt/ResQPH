import { WorkspaceCard, WorkspaceFilters, WorkspaceTable, WorkspaceSplit, WorkspaceEmpty, WorkspaceFacts } from './WorkspaceUI'
import { useState } from 'react'
import { LoadingState } from '../../components/ui/LoadingState'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { actorId } from '../auth/session'
import { useOfflineMission } from '../offline/useOfflineMission'
import { missions } from '../../api/workspace'
import { RescuerMissionCard } from '../../pages/dashboard/views/rescuer/RescuerMissionCard'
import { RescuerOfflineQueue } from '../../pages/dashboard/views/rescuer/RescuerOfflineQueue'
import { Modal } from '../../components/ui/Modal'
import { MissionRoute } from './MissionRoute'
import { QueryState, RecordId } from './Records'
import { MissionDetails } from './MissionDetails'
import { InteractiveFloodMap } from '../map/InteractiveFloodMap'
import { stationIdForTeamId } from '../map/stations'
import { journeyRoute, useMissionJourney } from '../missions/useMissionJourney'
export function RescuerWorkspace({section}: {section: string}) {
  const {user} = useAuth()
  const offline = useOfflineMission(user ? actorId(user) : null, false, user?.stationId, user?.teamId)
  const journey = useMissionJourney(offline.isOffline ? null : offline.mission?.id)
  const history = useQuery({queryKey: ['mission-history', user?.teamId], queryFn: () => missions(true), enabled: section === 'history', retry: false})
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState('')
  const [routeOpen, setRouteOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  if (section === 'routes') return <div className="workspace-stack rescuer-routes-page">
    <p className="workspace-team-caption">{user?.stationName ?? 'Rescue station'} · simulated route guidance and shared mission tracking</p>
    {offline.loading && <p role="status">Loading the station’s active route…</p>}
    {offline.storageError && <p role="alert">{offline.storageError}</p>}
    {offline.recoveryAvailable && <p role="note">Quarantined offline data is retained on this device. <button type="button" onClick={() => void offline.downloadRecovery()}>Download recovery file</button> Store the file privately; it can contain request details.</p>}
    {offline.networkError && <p role="alert">{offline.networkError}</p>}
    {!offline.loading && !offline.mission && <WorkspaceCard><WorkspaceEmpty title={offline.isOffline ? 'No cached route' : 'No active mission route'} icon="route">{offline.isOffline ? 'Reconnect to retrieve an authorized active mission and its route.' : 'An assigned, en-route, or arrived mission route will appear here.'}</WorkspaceEmpty></WorkspaceCard>}
    {offline.mission && <MissionRoute mission={offline.mission} offline={offline.isOffline} lastSyncedAt={offline.lastSyncedAt}/>}
  </div>
  if (section === 'history') return <WorkspaceCard><h2>Mission History</h2><WorkspaceFilters options={['all','completed','cancelled']} value={filter} label="Mission history filter" onChange={value => {setFilter(value);setSelected(null)}}/><QueryState query={history} layout="table" label="Loading mission history…">{items => <WorkspaceSplit inspector={items.find(m => m.id === selected) ? <MissionDetails mission={items.find(m => m.id === selected)!}/> : <WorkspaceEmpty title="Mission details" icon="clock">Select a completed or cancelled mission to view its immutable timeline.</WorkspaceEmpty>}><WorkspaceTable headings={['Mission','Location','Date','Status','Action']} caption="Completed and cancelled missions">{items.filter(m => ['completed', 'cancelled'].includes(m.status) && (filter === 'all' || m.status === filter)).map(m => <tr key={m.id} className={selected === m.id ? 'is-selected' : undefined}><td><RecordId id={m.id}/></td><td>{m.request_summary?.location.address}</td><td>{new Date(m.updated_at).toLocaleDateString()}</td><td>{m.status}</td><td><button aria-pressed={selected === m.id} onClick={() => setSelected(m.id)}>View</button></td></tr>)}</WorkspaceTable>{!items.filter(m => ['completed', 'cancelled'].includes(m.status) && (filter === 'all' || m.status === filter)).length && <WorkspaceEmpty title="No completed or cancelled missions" icon="clock">Past missions will appear here after the server records their outcome.</WorkspaceEmpty>}</WorkspaceSplit>}</QueryState></WorkspaceCard>
  if (routeOpen && offline.mission) return <div className="workspace-stack"><button onClick={() => setRouteOpen(false)}>Back to mission</button><MissionRoute mission={offline.mission} offline={offline.isOffline}/></div>
  return <div className="workspace-stack rescuer-workspace"><div className="workspace-panel-heading"><p className="workspace-team-caption">{user?.stationName ?? 'Rescue station'} · {user?.stationAddress ?? 'Station address unavailable'}</p>
    {offline.loading && offline.mission && <p role="status">Refreshing assigned mission…</p>}
    {offline.storageError && <p role="alert">{offline.storageError}</p>}
    {offline.recoveryAvailable && <p role="note">Quarantined offline data is retained on this device. <button type="button" onClick={() => void offline.downloadRecovery()}>Download recovery file</button> Store the file privately; it can contain request details.</p>}
    {offline.networkError && <p role="alert">{offline.networkError}</p>}
    <button onClick={() => void offline.reload()} disabled={offline.busy || offline.loading}>Refresh mission</button>
    </div>
    <RescuerOfflineQueue entry={offline.entry} isOffline={offline.isOffline} onRetrySync={offline.retry} onDismissFailed={offline.discard} currentServerMission={offline.currentServerMission} storageError={offline.storageError} />
    {offline.loading && !offline.mission && <WorkspaceCard><LoadingState layout="detail" label="Loading assigned mission…"/></WorkspaceCard>}
    {!offline.loading && !offline.mission && <WorkspaceCard><WorkspaceEmpty title={offline.isOffline ? 'No cached mission' : 'No active assignment'} icon={offline.isOffline ? 'wifi-off' : 'report'}>{offline.isOffline ? 'No cached mission for this team. Reconnect to load an assignment.' : 'No active assignment. Standing by.'}</WorkspaceEmpty></WorkspaceCard>}
    {offline.mission && <>
      <RescuerMissionCard mission={offline.mission} lastSyncedAt={offline.lastSyncedAt} isStale={offline.isStale} isCached={offline.isOffline && offline.isCached} isQueueLocked={Boolean(offline.entry)} isAdvancing={offline.busy || offline.loading} onAdvanceStatus={() => offline.mission?.status === 'arrived' ? setConfirm(true) : void offline.advance()} />
      <WorkspaceCard><WorkspaceSplit inspector={<><h3>Assigned station route</h3><p>Stored station-to-incident geometry and server-synchronized simulated tracking use the controlled U-Belt road and flood inputs.</p><button className="workspace-primary" onClick={() => setRouteOpen(true)}>View mission route</button>{!offline.isOffline && <div className="mission-map-preview"><InteractiveFloodMap showRouteStatus={false} routeGeometry={journeyRoute(journey.mission.data ?? offline.mission)} trackingPosition={journey.tracking.data?.position ?? null} trackingProgress={journey.tracking.data?.progress_ratio} followPosition assignedStationId={user?.stationId ?? stationIdForTeamId(offline.mission.team_id)} records={offline.mission.request_summary?.location.point ? [{id:offline.mission.id,label:offline.mission.request_summary.location.address,coordinates:offline.mission.request_summary.location.point.coordinates}] : []}/></div>}{offline.isOffline && <p>Map tiles are not cached. Reconnect to view the route.</p>}</>}><h3>Request details</h3><RecordId id={offline.mission.request_id}/><WorkspaceFacts items={[{label:'Location',value:offline.mission.request_summary?.location.address ?? 'Unavailable'},{label:'People',value:offline.mission.request_summary?.headcount ?? 'Unavailable'},{label:'Station',value:user?.stationName ?? offline.mission.station_id ?? offline.mission.team_id},{label:'Situation',value:offline.mission.request_summary?.situation_summary || 'No optional situation details.'}]}/></WorkspaceSplit></WorkspaceCard>
    </>}
    <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Confirm rescue completion"><p>Review the assigned mission and record sanitized completion details. The server must confirm before this mission is completed.</p>{offline.mission && <WorkspaceFacts items={[{label:'Request',value:<RecordId id={offline.mission.request_id}/>},{label:'Location',value:offline.mission.request_summary?.location.address ?? 'Unavailable'},{label:'People',value:offline.mission.request_summary?.headcount ?? 'Unavailable'},{label:'Station',value:user?.stationName ?? offline.mission.station_id ?? offline.mission.team_id}]}/>}<label>Completion details<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label><div className="workspace-actions"><button onClick={() => setConfirm(false)}>Back to mission</button><button className="workspace-primary" disabled={note.trim().length < 3} onClick={() => {void offline.advance(note.trim()); setConfirm(false)}}>Confirm completion</button></div></Modal>
  </div>
}
