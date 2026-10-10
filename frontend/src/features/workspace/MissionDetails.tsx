import type { MissionDetail } from '../../api/missions'
import { RecordId } from './Records'
import { WorkspaceBadge, WorkspaceFacts, WorkspaceProgress, WorkspaceTimeline } from './WorkspaceUI'

import { MISSION_STAGES } from './missionStages'

/** Read-only mission summary shared by history, coordinator and completion review. */
export function MissionDetails({ mission }: { mission: MissionDetail }) {
  return <div className="mission-details"><div className="workspace-panel-heading"><h3>Mission details</h3><WorkspaceBadge status={mission.status}/></div><RecordId id={mission.id}/>
    {mission.status !== 'cancelled' && <WorkspaceProgress stages={MISSION_STAGES} current={mission.status} label="Mission progress"/>}
    <WorkspaceFacts items={[
      {label:'Request',value:<RecordId id={mission.request_id}/>},
      {label:'Team',value:mission.team_id},
      {label:'Location',value:mission.request_summary?.location.address ?? 'Unavailable'},
      {label:'People',value:mission.request_summary?.headcount ?? 'Unavailable'},
      {label:'Flood level',value:mission.request_summary?.reported_flood_level ?? 'Unknown'},
      {label:'Situation',value:mission.request_summary?.situation_summary || 'No optional situation details.'},
      {label:'Medical needs',value:mission.request_summary?.medical_needs ? mission.request_summary.medical_details || 'Medical assistance requested' : 'None reported'},
      {label:'Assigned',value:new Date(mission.assigned_at).toLocaleString()},
    ]}/>
    <h3>Status history</h3><WorkspaceTimeline events={mission.status_history.map(event => ({id:event.event_id,status:event.new_status,timestamp:event.server_recorded_at,note:event.note}))}/>
  </div>
}
