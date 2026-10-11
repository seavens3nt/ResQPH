import { sessionReadBlocked } from '../../api/queryRecovery'
import { ApiError, endSimulatedMission } from '../../api/missions'
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
  const history = useQuery({queryKey: ['mission-history', user?.id ?? user?.email, user?.stationId], queryFn: () => missions(true), enabled: query => section === 'history' && !sessionReadBlocked(query.state.error), retry: false, refetchOnWindowFocus:false, refetchOnReconnect:false})
  const [endOpen, setEndOpen] = useState(false)
  const [endReason, setEndReason] = useState('')
  const [endError, setEndError] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [endAttempt, setEndAttempt] = useState<{event_id:string;expected_mission_version:number;reason:string;missionId:string} | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState('')
  const [routeOpen, setRouteOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const completionDialog = <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Confirm rescue completion"><p>Review the assigned mission and record sanitized completion details. The server must confirm before this mission is completed.</p>{offline.mission && <WorkspaceFacts items={[{label:'Request',value:<RecordId id={offline.mission.request_id}/>},{label:'Location',value:offline.mission.request_summary?.location.address ?? 'Unavailable'},{label:'People',value:offline.mission.request_summary?.headcount ?? 'Unavailable'},{label:'Station',value:user?.stationName ?? offline.mission.station_id ?? offline.mission.team_id}]}/>}<label>Completion details<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label><div className="workspace-actions"><button onClick={() => setConfirm(false)}>Back to mission</button><button className="workspace-primary" disabled={note.trim().length < 3} onClick={() => {void offline.advance(note.trim()); setConfirm(false)}}>Confirm completion</button></div></Modal>
  const endDialog = <Modal isOpen={endOpen && (!endAttempt || endAttempt.missionId === offline.mission?.id)} onClose={() => {if (!ending) setEndOpen(false)}} title="End simulated mission">
    <p>This cancels this simulated mission and its request, stops tracking, and releases the station for new work. History is retained. No replacement mission is created.</p>
    <label>Reason<textarea maxLength={500} value={endReason} disabled={ending || Boolean(endAttempt)} onChange={event => setEndReason(event.target.value)}/></label>
    {endError && <p role="alert">{endError}</p>}
    <div className="workspace-actions"><button disabled={ending} onClick={() => setEndOpen(false)}>Back to mission</button>
    <button disabled={ending || endReason.trim().length < 3 || Boolean(offline.entry) || offline.isOffline} onClick={async () => {
      if (!offline.mission || offline.entry) return
      const attempt = endAttempt ?? {event_id:crypto.randomUUID(),expected_mission_version:offline.mission.version,reason:endReason.trim(),missionId:offline.mission.id}
      setEndAttempt(attempt);setEnding(true);setEndError(null)
      try {await endSimulatedMission(attempt.missionId, attempt);setEndOpen(false);setEndAttempt(null);setEndReason('');await offline.reload();await history.refetch()}
      catch (error) {setEndError(error instanceof Error ? error.message : 'Recovery could not be verified. Retry the same attempt.');if (error instanceof ApiError && error.httpStatus >= 400 && error.httpStatus < 500) setEndAttempt(null);await offline.reload()}
      finally {setEnding(false)}
    }}>Confirm end simulated mission</button></div>
  </Modal>
  const endAction = offline.mission && ['assigned','en-route','arrived'].includes(offline.mission.status) && offline.mission.data_source === 'synthetic' && <>
    <button type="button" disabled={offline.isOffline || Boolean(offline.entry) || offline.busy || offline.loading || ending} onClick={() => {if (endAttempt && endAttempt.missionId !== offline.mission?.id) {setEndAttempt(null);setEndReason('');setEndError(null)};setEndOpen(true)}}>End simulated mission</button>
    {offline.entry && <p>Reconcile or explicitly discard the queued attempt before ending this simulation.</p>}
    {endDialog}
  </>
  const missionActions = offline.mission && <RescuerMissionCard showTracking={section !== 'routes' && !routeOpen} mission={offline.mission} lastSyncedAt={offline.lastSyncedAt} isStale={offline.isStale} isCached={offline.isOffline && offline.isCached} isQueueLocked={Boolean(offline.entry)} isAdvancing={offline.busy || offline.loading} onAdvanceStatus={() => offline.mission?.status === 'arrived' ? setConfirm(true) : void offline.advance()} />
  if (section === 'routes') return <div className="workspace-stack rescuer-routes-page">
    <p className="workspace-team-caption">{user?.stationName ?? 'Rescue station'} · simulated route guidance and shared mission tracking</p>
    {offline.loading && <p role="status">Loading the station’s active route…</p>}
    {offline.storageError && <p role="alert">{offline.storageError}</p>}
    {offline.recoveryAvailable && <p role="note">Quarantined offline data is retained on this device. <button type="button" onClick={() => void offline.downloadRecovery()}>Download recovery file</button> Store the file privately; it can contain request details.</p>}
    {offline.networkError && <p role="alert">{offline.networkError} {offline.authenticationRequired && <a href="/login">Sign in again</a>}</p>}
    {!offline.loading && !offline.mission && <WorkspaceCard><WorkspaceEmpty title={offline.isOffline ? 'No cached route' : 'No active mission route'} icon="route">{offline.isOffline ? 'Reconnect to retrieve an authorized active mission and its route.' : 'An assigned, en-route, or arrived mission route will appear here.'}</WorkspaceEmpty></WorkspaceCard>}
    {missionActions}
    {completionDialog}{endAction}
    <RescuerOfflineQueue entry={offline.entry} isOffline={offline.isOffline} onRetrySync={offline.retry} onDismissFailed={offline.discard} currentServerMission={offline.currentServerMission} storageError={offline.storageError} onRefresh={() => void offline.reload()} />
    {offline.mission && <MissionRoute mission={offline.mission} offline={offline.isOffline} lastSyncedAt={offline.lastSyncedAt}/>}
  </div>
  if (section === 'history') return <WorkspaceCard><h2>Mission History</h2><WorkspaceFilters options={['all','completed','cancelled']} value={filter} label="Mission history filter" onChange={value => {setFilter(value);setSelected(null)}}/><QueryState query={history} layout="table" label="Loading mission history…">{items => <WorkspaceSplit inspector={items.find(m => m.id === selected) ? <MissionDetails mission={items.find(m => m.id === selected)!}/> : <WorkspaceEmpty title="Mission details" icon="clock">Select a completed or cancelled mission to view its immutable timeline.</WorkspaceEmpty>}><WorkspaceTable headings={['Mission','Location','Date','Status','Action']} caption="Completed and cancelled missions">{items.filter(m => ['completed', 'cancelled'].includes(m.status) && (filter === 'all' || m.status === filter)).map(m => <tr key={m.id} className={selected === m.id ? 'is-selected' : undefined}><td><RecordId id={m.id}/></td><td>{m.request_summary?.location.address}</td><td>{new Date(m.updated_at).toLocaleDateString()}</td><td>{m.status}</td><td><button aria-pressed={selected === m.id} onClick={() => setSelected(m.id)}>View</button></td></tr>)}</WorkspaceTable>{!items.filter(m => ['completed', 'cancelled'].includes(m.status) && (filter === 'all' || m.status === filter)).length && <WorkspaceEmpty title="No completed or cancelled missions" icon="clock">Past missions will appear here after the server records their outcome.</WorkspaceEmpty>}</WorkspaceSplit>}</QueryState></WorkspaceCard>
  if (routeOpen && offline.mission) return <div className="workspace-stack"><button onClick={() => setRouteOpen(false)}>Back to mission</button>{missionActions}{completionDialog}{endAction}<MissionRoute mission={offline.mission} offline={offline.isOffline}/></div>
  return <div className="workspace-stack rescuer-workspace"><div className="workspace-panel-heading"><p className="workspace-team-caption">{user?.stationName ?? 'Rescue station'} · {user?.stationAddress ?? 'Station address unavailable'}</p>
    {offline.loading && offline.mission && <p role="status">Refreshing assigned mission…</p>}
    {offline.storageError && <p role="alert">{offline.storageError}</p>}
    {offline.recoveryAvailable && <p role="note">Quarantined offline data is retained on this device. <button type="button" onClick={() => void offline.downloadRecovery()}>Download recovery file</button> Store the file privately; it can contain request details.</p>}
    {offline.networkError && <p role="alert">{offline.networkError} {offline.authenticationRequired && <a href="/login">Sign in again</a>}</p>}
    <button onClick={() => void offline.reload()} disabled={offline.busy || offline.loading}>Refresh mission</button>
    </div>
    <RescuerOfflineQueue entry={offline.entry} isOffline={offline.isOffline} onRetrySync={offline.retry} onDismissFailed={offline.discard} currentServerMission={offline.currentServerMission} storageError={offline.storageError} onRefresh={() => void offline.reload()} />
    {offline.loading && !offline.mission && <WorkspaceCard><LoadingState layout="detail" label="Loading assigned mission…"/></WorkspaceCard>}
    {!offline.loading && !offline.mission && <WorkspaceCard><WorkspaceEmpty title={offline.isOffline ? 'No cached mission' : 'No active assignment'} icon={offline.isOffline ? 'wifi-off' : 'report'}>{offline.isOffline ? 'No cached mission for this team. Reconnect to load an assignment.' : 'No active assignment. Standing by.'}</WorkspaceEmpty></WorkspaceCard>}
    {offline.mission && <>
      {missionActions}
      <WorkspaceCard><WorkspaceSplit inspector={<><h3>Assigned station route</h3><p>Stored station-to-incident geometry and server-synchronized simulated tracking use the controlled U-Belt road and flood inputs.</p><button className="workspace-primary" onClick={() => setRouteOpen(true)}>View mission route</button>{!offline.isOffline && <div className="mission-map-preview"><InteractiveFloodMap trackingFrozen={journey.tracking.isError || journey.mission.isError} trackingTimestamp={journey.tracking.data?.timestamp} trackingStopped={offline.mission.status === 'arrived'} showRouteStatus={false} routeGeometry={journeyRoute(journey.mission.data ?? offline.mission)} trackingPosition={journey.tracking.data?.position ?? null} trackingProgress={journey.tracking.data?.progress_ratio} followPosition assignedStationId={user?.stationId ?? stationIdForTeamId(offline.mission.team_id)} records={offline.mission.request_summary?.location.point ? [{id:offline.mission.id,label:offline.mission.request_summary.location.address,coordinates:offline.mission.request_summary.location.point.coordinates}] : []}/></div>}{offline.isOffline && <p>Map tiles are not cached. Reconnect to view the route.</p>}</>}><h3>Request details</h3><RecordId id={offline.mission.request_id}/><WorkspaceFacts items={[{label:'Location',value:offline.mission.request_summary?.location.address ?? 'Unavailable'},{label:'People',value:offline.mission.request_summary?.headcount ?? 'Unavailable'},{label:'Station',value:user?.stationName ?? offline.mission.station_id ?? offline.mission.team_id},{label:'Situation',value:offline.mission.request_summary?.situation_summary || 'No optional situation details.'}]}/></WorkspaceSplit></WorkspaceCard>
    </>}
    {completionDialog}{endAction}
  </div>
}
