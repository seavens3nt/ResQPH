import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../../../features/auth/AuthContext'
import * as MissionContext from '../../../../features/missions/MissionContext'
import { RescuerView } from '../RescuerView'

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('../../../../features/offline/useOfflineMission', () => ({ useOfflineMission: () => state.value }))
vi.mock('../rescuer/RescuerMissionCard', () => ({ RescuerMissionCard: (props: Record<string, unknown>) => <div data-testid="mission-card" data-cached={String(props.isCached)} data-locked={String(props.isQueueLocked)} /> }))
vi.mock('../rescuer/RescuerOfflineQueue', () => ({ RescuerOfflineQueue: (props: Record<string, unknown>) => <div data-testid="offline-queue" data-storage-error={String(props.storageError ?? '')} data-server-state={props.currentServerMission ? 'provided' : 'unavailable'} /> }))

describe('rescuer offline presentation wiring', () => {
  beforeEach(() => {
    sessionStorage.setItem('resqph.auth.user', JSON.stringify({ email: 'rescuer-a', role: 'rescuer', teamId: 'team-alpha', name: 'Rescuer A' }))
    vi.spyOn(MissionContext, 'useMissions').mockReturnValue({ activeRescuerMission: null, requests: [], isOffline: true } as never)
  })

  it('shows no invented mission or map when the actor has no offline cache', () => {
    state.value = {
      mission: null, entry: null, loading: false, isOffline: true, isCached: false, isStale: true,
      storageError: null, currentServerMission: null, busy: false,
      advance: vi.fn(), retry: vi.fn(), discard: vi.fn(), reload: vi.fn(), lastSyncedAt: null,
    }
    render(<AuthProvider><RescuerView /></AuthProvider>)
    expect(screen.getByText(/Mission unavailable offline/i)).toBeInTheDocument()
    expect(screen.queryByTestId('mission-card')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /map/i })).not.toBeInTheDocument()
  })

  it('passes cached and queue-lock state through the existing presentation interfaces', () => {
    const mission = { id: 'mission-1', status: 'en-route', version: 2, status_history: [], request_summary: null }
    const entry = { localId: 'event-1', missionId: 'mission-1', body: { event_id: 'event-1', new_status: 'arrived' }, syncState: 'pending', enqueuedAt: '2026-10-04T00:05:00Z' }
    state.value = {
      mission, entry, loading: false, isOffline: true, isCached: true, isStale: true,
      storageError: 'Quota exceeded', currentServerMission: null, busy: false,
      advance: vi.fn(), retry: vi.fn(), discard: vi.fn(), reload: vi.fn(), lastSyncedAt: '2026-10-04T00:00:00Z',
    }
    render(<AuthProvider><RescuerView /></AuthProvider>)
    expect(screen.getByTestId('mission-card')).toHaveAttribute('data-cached', 'true')
    expect(screen.getByTestId('mission-card')).toHaveAttribute('data-locked', 'true')
    expect(screen.getByTestId('offline-queue')).toHaveAttribute('data-storage-error', 'Quota exceeded')
  })

  it('does not claim server state was fetched when a failed event has no authorized refresh', () => {
    state.value = {
      mission: { id: 'mission-1', status: 'en-route', version: 2, status_history: [], request_summary: null },
      entry: { localId: 'event-1', syncState: 'failed', failureReason: 'Assignment unavailable' },
      loading: false, isOffline: false, isCached: true, isStale: true,
      currentServerMission: null, busy: false, discard: vi.fn(), retry: vi.fn(), advance: vi.fn(),
    }
    render(<AuthProvider><RescuerView /></AuthProvider>)
    expect(screen.getByTestId('offline-queue')).toHaveAttribute('data-server-state', 'unavailable')
    expect(screen.queryByText(/Current server state is shown above/)).not.toBeInTheDocument()
    expect(screen.getByTestId('offline-queue')).toBeInTheDocument()
  })
})
