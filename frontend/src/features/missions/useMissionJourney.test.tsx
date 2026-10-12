import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ApiError } from '../../api/missions'
import { useMissionJourney } from './useMissionJourney'
const state=vi.hoisted(()=>({user:{id:'account-a',email:'a@example.test',stationId:undefined as string|undefined},mission:vi.fn(),tracking:vi.fn()}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:state.user})}))
vi.mock('../../api/missions',async original=>({...await original<typeof import('../../api/missions')>(),getMission:state.mission,getMissionTracking:state.tracking}))
afterEach(cleanup)
beforeEach(()=>{
  state.user={id:'account-a',email:'a@example.test',stationId:undefined}
  state.mission.mockReset().mockResolvedValue({id:'one',status:'en-route',version:2})
  state.tracking.mockReset().mockResolvedValue({mission_id:'one',timestamp:'2026-10-12T00:00:02Z',position:{type:'Point',coordinates:[120.99,14.6]},progress_ratio:.4})
})
function setup() {
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})
  const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>
  return {client,wrapper}
}
it('deduplicates observers and preserves the last server position through transport failure/recovery',async()=>{
  const {wrapper}=setup()
  const first=renderHook(()=>{const journey=useMissionJourney('one');void journey.tracking.isError;return journey},{wrapper})
  renderHook(()=>useMissionJourney('one'),{wrapper})
  await waitFor(()=>expect(first.result.current.tracking.data?.progress_ratio).toBe(.4))
  expect(state.tracking).toHaveBeenCalledOnce()
  state.tracking.mockRejectedValueOnce(new ApiError(503,'database_unavailable','Temporary failure'))
  await act(async()=>{await first.result.current.tracking.refetch()})
  expect(first.result.current.tracking.data?.progress_ratio).toBe(.4)
  await waitFor(()=>expect(first.result.current.tracking.isError).toBe(true))
  state.tracking.mockResolvedValueOnce({timestamp:'2026-10-12T00:00:04Z',progress_ratio:.5})
  await act(async()=>{await first.result.current.tracking.refetch()})
  await waitFor(()=>expect(first.result.current.tracking.data?.progress_ratio).toBe(.5))
})
it.each([401,403,409])('stops authentication-failure tracking polls for HTTP %s',async status=>{
  const {client,wrapper}=setup()
  state.tracking.mockRejectedValue(new ApiError(status,status===409?'session_identity_changed':'forbidden','Sign in'))
  const hook=renderHook(()=>useMissionJourney('one'),{wrapper})
  await waitFor(()=>expect(hook.result.current.tracking.isError).toBe(true))
  const query=client.getQueryCache().find({queryKey:['mission-tracking','account-a:','one']})!
  expect((query.options as any).enabled(query)).toBe(false)
  expect((query.options as any).refetchInterval(query)).toBe(false)
  expect(state.tracking).toHaveBeenCalledOnce()
})
it('honors rate-limit delay and stops movement polls after arrival while status remains polled',async()=>{
  const {client,wrapper}=setup()
  state.tracking.mockRejectedValueOnce(new ApiError(429,'rate_limited','Wait',[],undefined,120))
  const hook=renderHook(()=>useMissionJourney('one'),{wrapper})
  await waitFor(()=>expect(hook.result.current.tracking.isError).toBe(true))
  const tracking=client.getQueryCache().find({queryKey:['mission-tracking','account-a:','one']})!
  expect((tracking.options as any).refetchInterval(tracking)).toBe(120000)
  state.mission.mockResolvedValue({id:'one',status:'arrived',version:3})
  await act(async()=>{await hook.result.current.mission.refetch()})
  const mission=client.getQueryCache().find({queryKey:['mission-journey','account-a:','one']})!
  await waitFor(()=>expect((tracking.options as any).refetchInterval(tracking)).toBe(false))
  expect((mission.options as any).refetchInterval(mission)).toBe(5000)
  state.mission.mockResolvedValue({id:'one',status:'completed',version:4})
  await act(async()=>{await hook.result.current.mission.refetch()})
  await waitFor(()=>expect((mission.options as any).refetchInterval(mission)).toBe(false))
  expect((tracking.options as any).enabled(tracking)).toBe(false)
})
it('removes previous-account data immediately when the scope changes',async()=>{
  const {wrapper}=setup()
  const hook=renderHook(()=>useMissionJourney('one'),{wrapper})
  await waitFor(()=>expect(hook.result.current.tracking.data).toBeDefined())
  state.user={id:'account-b',email:'b@example.test',stationId:'sampaloc-fire-station'}
  state.mission.mockReturnValue(new Promise(()=>{}))
  hook.rerender()
  expect(hook.result.current.mission.data).toBeUndefined()
  expect(hook.result.current.tracking.data).toBeUndefined()
})
