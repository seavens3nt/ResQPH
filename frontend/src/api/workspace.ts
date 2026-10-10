import { apiClient } from './client'
import type { RescueRequestRecord } from '../features/requests/types'
import type { MissionDetail } from './missions'
export interface Team { id: string; team_name: string; availability: string; assigned_mission_id: string | null }
interface RequestPage {items: RescueRequestRecord[]; total: number; next_cursor: string | null}
// Traverse server cursors so counters and inspectors use the same complete queue.
export async function requests() {
  const items: RescueRequestRecord[] = []
  let cursor: string | null = null
  const visited = new Set<string>()
  do {
    const page: RequestPage = (await apiClient.get<RequestPage>('/rescue-requests', {params: {limit: 100, ...(cursor ? {cursor} : {})}})).data
    items.push(...page.items)
    cursor = page.next_cursor
    if (cursor && visited.has(cursor)) throw new Error('Server returned a repeated queue cursor. Retry the request list.')
    if (cursor) visited.add(cursor)
  } while (cursor)
  return {items, total: items.length, next_cursor: null}
}
export async function teams() { return (await apiClient.get<Team[]>('/teams')).data }
export async function missions(own = false) { return (await apiClient.get<MissionDetail[]>('/missions', {params: own ? {assigned_to: 'me'} : {}})).data }
export async function cancelMission(id: string, version: number, reason: string) { return (await apiClient.post<MissionDetail>(`/missions/${id}/cancel`, {expected_mission_version: version, reason})).data }
export async function cancelRequest(id: string, version: number, reason: string) { return (await apiClient.post<RescueRequestRecord>(`/rescue-requests/${id}/cancel`, {version, reason})).data }
