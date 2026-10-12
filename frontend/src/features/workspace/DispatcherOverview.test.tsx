import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import type { MissionDetail } from '../../api/missions'
import type { RescueRequestRecord } from '../requests/types'
import { DispatcherOverview } from './DispatcherOverview'

afterEach(cleanup)
const query = <T,>(data: T): UseQueryResult<T> => ({data, isLoading:false, isError:false, refetch:vi.fn(), fetchStatus:'idle'}) as unknown as UseQueryResult<T>
const request = (id: string): RescueRequestRecord => ({
  id, citizen_id:'synthetic', location:{address:`Synthetic location ${id}`,point:{type:'Point',coordinates:[120.9946,14.6042]}},
  headcount:2, vulnerabilities:[], medical_needs:false, reported_flood_level:'unknown', status:'pending',version:1,
  created_at:'2026-10-10T00:00:00Z',updated_at:'2026-10-10T00:00:00Z',
})
const mission = (id:string,status:MissionDetail['status']): MissionDetail => ({
  id,request_id:'linked-request',team_id:'team-one',status,version:1,assigned_at:'2026-10-10T00:00:00Z',status_history:[],
  data_source:'synthetic',sync_status:'synced',created_at:'2026-10-10T00:00:00Z',updated_at:'2026-10-10T00:00:00Z',
  request_summary:{location:request('mission').location,headcount:2,vulnerabilities:[],medical_needs:false,reported_flood_level:'unknown',situation_summary:null},
})
const props = (): ComponentProps<typeof DispatcherOverview> => ({
  queue:query({items:['1','2','3','4','5'].map(request),total:5,next_cursor:null}),
  teamList:query([{id:'team-one',team_name:'Actual team name',availability:'available',assigned_mission_id:null}]),
  missionList:query([mission('active','assigned'),mission('finished','completed'),mission('cancelled','cancelled')]),
  navigate:vi.fn(),onRequestSelect:vi.fn(),onViewAll:vi.fn(),onMissionSelect:vi.fn(),
})

describe('Dispatcher Figma overview',()=>{
  it('derives summary counts and previews from records, retaining real selection handlers',()=>{
    const p=props()
    render(<DispatcherOverview {...p}/>)
    const summary=within(screen.getByRole('region',{name:'Coordination summary'}))
    expect(summary.getByRole('button',{name:'5 Pending requests'})).toBeVisible()
    expect(summary.getByRole('button',{name:'1 Available teams'})).toBeVisible()
    expect(summary.getByRole('button',{name:'1 Active missions'})).toBeVisible()
    expect(summary.getByRole('button',{name:'1 Completed'})).toBeVisible()
    expect(within(screen.getByRole('list',{name:'Pending request overview'})).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByText('Synthetic location 5')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'View request at Synthetic location 1'}))
    expect(p.onRequestSelect).toHaveBeenCalledWith('1')
    fireEvent.click(screen.getByRole('button',{name:'View all 5 pending requests'}))
    expect(p.onViewAll).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button',{name:'Refresh requests'}))
    expect(p.queue.refetch).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button',{name:'View team Actual team name, available'}))
    expect(p.navigate).toHaveBeenCalledWith('teams')
    fireEvent.click(screen.getByRole('button',{name:'View mission at Synthetic location mission, assigned'}))
    expect(p.onMissionSelect).toHaveBeenCalledWith('active')
  })
  it('shows genuine empty states without fabricated records',()=>{
    render(<DispatcherOverview {...props()} queue={query({items:[],total:0,next_cursor:null})} teamList={query([])} missionList={query([])}/>)
    expect(screen.getByText('No pending requests')).toBeVisible()
    expect(screen.getByText('No teams available')).toBeVisible()
    expect(screen.getByText('No active missions')).toBeVisible()
  })
  it('preserves loading and retry feedback',()=>{
    const p=props()
    const {rerender}=render(<DispatcherOverview {...p} queue={{...p.queue,data:undefined,isLoading:true} as typeof p.queue}/>)
    expect(screen.getByText('Loading rescue requests…')).toBeVisible()
    rerender(<DispatcherOverview {...p} queue={{...p.queue,data:undefined,isError:true,error:new Error('Unavailable')} as typeof p.queue}/>)
    fireEvent.click(screen.getAllByRole('button',{name:'Retry'})[0])
    expect(p.queue.refetch).toHaveBeenCalledOnce()
  })
})
