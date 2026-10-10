import type { UseQueryResult } from '@tanstack/react-query'
import type { requests, teams, missions } from '../../api/workspace'
import { QueryState } from './Records'
import { RequestQueuePreview } from './RequestQueuePreview'
import { FigmaDispatcherAsset } from './FigmaDispatcherAsset'
import { WorkspaceBadge, WorkspaceCard, WorkspaceEmpty, WorkspaceStatCard } from './WorkspaceUI'
import { Icon } from '../../components/art/Icon'

type OverviewProps = {
  queue: UseQueryResult<Awaited<ReturnType<typeof requests>>>
  teamList: UseQueryResult<Awaited<ReturnType<typeof teams>>>
  missionList: UseQueryResult<Awaited<ReturnType<typeof missions>>>
  navigate: (section: string) => void
  onRequestSelect: (id: string) => void
  onViewAll: () => void
  onMissionSelect: (id: string) => void
}

const availabilityLabel = (status: string) => status === 'on-scene' ? 'On-Scene' : status.replaceAll('-', ' ')

/** Figma 77:15 presentation only. Queries, selection and mutations remain in the workspace. */
export function DispatcherOverview({queue, teamList, missionList, navigate, onRequestSelect, onViewAll, onMissionSelect}: OverviewProps) {
  return <>
    <section className="workspace-stats" aria-label="Coordination summary">
      <QueryState query={queue} layout="compact">{data => <WorkspaceStatCard tone="pending" icon="report" artwork={<FigmaDispatcherAsset name="info"/>} count={data.items.filter(r => r.status === 'pending').length} label="Pending requests" onClick={() => navigate('inquiries')}/>}</QueryState>
      <QueryState query={teamList} layout="compact">{data => <WorkspaceStatCard tone="teams" icon="volunteers" artwork={<FigmaDispatcherAsset name="info"/>} count={data.filter(t => t.availability === 'available').length} label="Available teams" onClick={() => navigate('teams')}/>}</QueryState>
      <QueryState query={missionList} layout="compact">{data => <WorkspaceStatCard tone="active" icon="boat" artwork={<FigmaDispatcherAsset name="info"/>} count={data.filter(m => !['completed','cancelled'].includes(m.status)).length} label="Active missions" onClick={() => navigate('missions')}/>}</QueryState>
      <QueryState query={missionList} layout="compact">{data => <WorkspaceStatCard tone="completed" icon="check" artwork={<FigmaDispatcherAsset name="info"/>} count={data.filter(m => m.status === 'completed').length} label="Completed" onClick={() => navigate('missions')}/>}</QueryState>
    </section>
    <WorkspaceCard className="coordinator-queue">
      <div className="dispatcher-panel-heading"><h3>Pending requests</h3><button className="dispatcher-refresh" aria-label="Refresh requests" title="Refresh requests" onClick={() => void queue.refetch()}><Icon name="refresh" size={18}/></button></div>
      <QueryState query={queue} layout="table" label="Loading rescue requests…">{data => <>
        <RequestQueuePreview requests={data.items} onSelect={onRequestSelect} onViewAll={onViewAll} previewLimit={4} showAllLink={data.items.filter(request => request.status === 'pending').length > 4}/>
      </>}</QueryState>
    </WorkspaceCard>
    <WorkspaceCard className="coordinator-teams">
      <h3>Team availability</h3>
      <QueryState query={teamList}>{data => data.length ? <div className="workspace-team-grid">
        {data.map(team => <button key={team.id} className="workspace-record dispatcher-team" aria-label={`View team ${team.team_name}, ${availabilityLabel(team.availability)}`} onClick={() => navigate('teams')}>
          <FigmaDispatcherAsset name="responder"/>
          <span><WorkspaceBadge status={team.availability}>{availabilityLabel(team.availability)}</WorkspaceBadge><strong>{team.team_name}</strong></span>
        </button>)}
      </div> : <WorkspaceEmpty title="No teams available" icon="volunteers">Team records will appear here when available.</WorkspaceEmpty>}</QueryState>
    </WorkspaceCard>
    <WorkspaceCard className="coordinator-active">
      <h3>Active missions</h3>
      <QueryState query={missionList}>{data => {
        const active = data.filter(m => !['completed','cancelled'].includes(m.status))
        return active.length ? <div className="dispatcher-mission-list">{active.map(mission => <button className="workspace-record dispatcher-mission" key={mission.id} aria-label={`View mission at ${mission.request_summary?.location.address || 'unavailable location'}, ${mission.status}`} onClick={() => onMissionSelect(mission.id)}>
          <span className="dispatcher-mission-location">{mission.request_summary?.location.address || 'Location unavailable'}</span>
          <span className="dispatcher-team-badge">{teamList.data?.find(team => team.id === mission.team_id)?.team_name ?? mission.team_id}</span>
          <WorkspaceBadge status={mission.status}>{mission.status === 'arrived' ? 'On-Scene' : mission.status.replaceAll('-', ' ')}</WorkspaceBadge>
        </button>)}</div> : <WorkspaceEmpty title="No active missions" icon="boat">Teams are standing by.</WorkspaceEmpty>
      }}</QueryState>
    </WorkspaceCard>
  </>
}
