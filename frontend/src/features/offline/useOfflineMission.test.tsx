import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type MissionDetail, type OfflineQueueEntry } from '../../api/missions'

const store = vi.hoisted(() => {
  const missions = new Map<string, { mission: MissionDetail; last_synced_at: string }>()
  const queues = new Map<string, OfflineQueueEntry>()
  return { missions, queues, readMission: vi.fn(), readQueue: vi.fn(), writeMission: vi.fn(), enqueueEvent: vi.fn(), updateQueue: vi.fn(), acknowledgeEvent: vi.fn(), discardEvent: vi.fn() }
})

vi.mock('./offlineStore', () => ({
  readMission: store.readMission,
  readQueue: store.readQueue,
  writeMission: store.writeMission,
  enqueueEvent: store.enqueueEvent,
  updateQueue: store.updateQueue,
  acknowledgeEvent: store.acknowledgeEvent,
  discardEvent: store.discardEvent,
}))

const api = vi.hoisted(() => ({ listMyMissions: vi.fn(), getMission: vi.fn(), updateMissionStatus: vi.fn() }))
vi.mock('../../api/missions', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api/missions')>()), ...api }))

import { useOfflineMission } from './useOfflineMission'

const mission: MissionDetail = {
  id: 'mission-1', request_id: 'request-1', team_id: 'rescuer-a', assigned_rescuer_id: 'rescuer-a',
  status: 'en-route', version: 2, assigned_at: '2026-10-04T00:00:00Z', created_at: '2026-10-04T00:00:00Z',
  updated_at: '2026-10-04T00:00:00Z', request_summary: null, status_history: [], data_source: 'synthetic', sync_status: 'synced',
}

describe('useOfflineMission', () => {
  beforeEach(() => {
    store.missions.clear(); store.queues.clear()
    store.enqueueEvent.mockClear(); store.updateQueue.mockClear(); store.acknowledgeEvent.mockClear()
    store.readMission.mockImplementation(async (actor: string) => store.missions.get(actor) ?? null)
    store.readQueue.mockImplementation(async (actor: string) => store.queues.get(actor) ?? null)
    store.writeMission.mockImplementation(async (actor: string, value: MissionDetail) => {
      const record = { mission: value, last_synced_at: new Date().toISOString() }
      store.missions.set(actor, record)
      return record
    })
    store.enqueueEvent.mockImplementation(async (actor: string, entry: OfflineQueueEntry) => {
      if (store.queues.has(actor)) throw new Error('queue full')
      store.queues.set(actor, entry)
    })
    store.updateQueue.mockImplementation(async (actor: string, entry: OfflineQueueEntry) => store.queues.set(actor, entry))
    store.acknowledgeEvent.mockImplementation(async (actor: string, id: string, value: MissionDetail) => {
      if (store.queues.get(actor)?.localId !== id) throw new Error('wrong event')
      store.queues.delete(actor)
      const record = { mission: value, last_synced_at: new Date().toISOString() }
      store.missions.set(actor, record)
      return record
    })
    api.listMyMissions.mockResolvedValue([mission])
    api.updateMissionStatus.mockReset()
    api.getMission.mockReset()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  })

  it('recovers one cached mission and keeps the same queued event across controller reload', async () => {
    store.missions.set('rescuer-a', { mission, last_synced_at: '2026-10-04T00:00:00Z' })
    const first = renderHook(() => useOfflineMission('rescuer-a', false))
    await waitFor(() => expect(first.result.current.mission?.id).toBe('mission-1'))
    await act(async () => first.result.current.advance())
    const queued = first.result.current.entry
    expect(queued?.body.event_id).toBeTruthy()
    expect(queued?.body.expected_mission_version).toBe(2)
    await act(async () => first.unmount())

    const second = renderHook(() => useOfflineMission('rescuer-a', false))
    await waitFor(() => expect(second.result.current.entry?.localId).toBe(queued?.localId))
    await act(async () => second.result.current.advance())
    expect(second.result.current.entry?.localId).toBe(queued?.localId)
    expect(store.enqueueEvent).toHaveBeenCalledTimes(1)
  })

  it('keeps the queued ID after 503 and replaces the cache only after a later accepted replay', async () => {
    store.missions.set('rescuer-a', { mission, last_synced_at: '2026-10-04T00:00:00Z' })
    const queued: OfflineQueueEntry = {
      localId: 'event-retry', missionId: mission.id,
      body: { event_id: 'event-retry', new_status: 'arrived', expected_mission_version: 2, client_recorded_at: '2026-10-04T00:05:00Z', source: 'offline-sync' },
      syncState: 'pending', enqueuedAt: '2026-10-04T00:05:00Z',
    }
    store.queues.set('rescuer-a', queued)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const accepted = { ...mission, status: 'arrived' as const, version: 3 }
    api.updateMissionStatus
      .mockRejectedValueOnce(new ApiError(503, 'unavailable', 'Try again'))
      .mockResolvedValueOnce(accepted)
    const { result } = renderHook(() => useOfflineMission('rescuer-a', false))
    await waitFor(() => expect(result.current.entry?.syncState).toBe('pending'))
    expect(result.current.entry?.localId).toBe('event-retry')
    await waitFor(() => expect(store.updateQueue).toHaveBeenCalledTimes(2))
    await act(async () => result.current.retry())
    await waitFor(() => expect(store.acknowledgeEvent).toHaveBeenCalledWith('rescuer-a', 'event-retry', accepted))
  })

  it('preserves a conflict for review and never replays it as a different actor', async () => {
    store.missions.set('rescuer-a', { mission, last_synced_at: '2026-10-04T00:00:00Z' })
    const queued: OfflineQueueEntry = {
      localId: 'event-conflict', missionId: mission.id,
      body: { event_id: 'event-conflict', new_status: 'arrived', expected_mission_version: 2, client_recorded_at: '2026-10-04T00:05:00Z', source: 'offline-sync' },
      syncState: 'pending', enqueuedAt: '2026-10-04T00:05:00Z',
    }
    store.queues.set('rescuer-a', queued)
    api.updateMissionStatus.mockRejectedValueOnce(new ApiError(409, 'conflict', 'Stale version'))
    api.getMission.mockResolvedValue({ ...mission, version: 3 })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const { result, rerender } = renderHook(({ actor }) => useOfflineMission(actor, false), { initialProps: { actor: 'rescuer-a' } })
    await waitFor(() => expect(result.current.entry?.syncState).toBe('failed'))
    expect(result.current.entry?.body.event_id).toBe('event-conflict')
    rerender({ actor: 'rescuer-b' })
    await waitFor(() => expect(result.current.entry).toBeNull())
    expect(api.updateMissionStatus).toHaveBeenCalledTimes(1)
  })

  it('preserves a forbidden replay without fetching state the actor cannot access', async () => {
    store.missions.set('rescuer-a', { mission, last_synced_at: '2026-10-04T00:00:00Z' })
    const queued: OfflineQueueEntry = {
      localId: 'event-forbidden', missionId: mission.id,
      body: { event_id: 'event-forbidden', new_status: 'arrived', expected_mission_version: 2, client_recorded_at: '2026-10-04T00:05:00Z', source: 'offline-sync' },
      syncState: 'pending', enqueuedAt: '2026-10-04T00:05:00Z',
    }
    store.queues.set('rescuer-a', queued)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    api.updateMissionStatus.mockRejectedValueOnce(new ApiError(403, 'forbidden', 'Assignment unavailable'))
    const { result } = renderHook(() => useOfflineMission('rescuer-a', false))
    await waitFor(() => expect(result.current.entry?.syncState).toBe('failed'))
    expect(result.current.entry?.localId).toBe('event-forbidden')
    expect(api.getMission).not.toHaveBeenCalled()
  })

  it('keeps the current API mission visible and reports quota failure instead of claiming it was cached', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    store.writeMission.mockRejectedValueOnce(new Error('QuotaExceededError'))
    const { result } = renderHook(() => useOfflineMission('rescuer-a', false))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.mission).toEqual(mission)
    expect(result.current.isCached).toBe(false)
    expect(result.current.storageError).toContain('QuotaExceededError')
  })
})
