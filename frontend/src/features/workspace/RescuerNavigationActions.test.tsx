import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import type { MissionDetail } from '../../api/missions'
import { RescuerWorkspace } from './RescuerWorkspace'
import fixtureJson from '../../../../data/samples/offline-mission.example.json?raw'

const offline = vi.hoisted(() => ({ mission: null as MissionDetail | null, advance: vi.fn(), busy: false, loading: false, isOffline: false, isStale: false, lastSyncedAt: null, entry: null }))
vi.mock('../offline/useOfflineMission', () => ({ useOfflineMission: () => offline }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'synthetic-rescuer', role: 'rescuer', stationId: 'iverson-fire-rescue', stationName: 'Iverson Fire and Rescue Volunteer' } }) }))
vi.mock('../missions/useMissionJourney', async original => ({ ...await original<typeof import('../missions/useMissionJourney')>(), useMissionJourney: () => ({ mission: {}, tracking: {} }) }))
vi.mock('./MissionRoute', () => ({ MissionRoute: () => <div>Navigation map</div> }))
beforeEach(() => { offline.mission = { ...JSON.parse(fixtureJson).mission, status: 'assigned' }; offline.advance.mockReset() })
it('keeps accept, arrival and explicit completion available on Routes using the existing offline controller', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui = () => <QueryClientProvider client={client}><RescuerWorkspace section="routes" /></QueryClientProvider>
  const view = render(ui())
  fireEvent.click(screen.getByRole('button', { name: 'ACCEPT MISSION & START TRAVEL' }))
  expect(offline.advance).toHaveBeenCalledTimes(1)
  offline.mission = { ...offline.mission!, status: 'en-route' }; view.rerender(ui())
  fireEvent.click(screen.getByRole('button', { name: 'TAP ARRIVED AT SCENE' }))
  expect(offline.advance).toHaveBeenCalledTimes(2)
  offline.mission = { ...offline.mission!, status: 'arrived' }; view.rerender(ui())
  fireEvent.click(screen.getByRole('button', { name: 'TAP RESCUE COMPLETED' }))
  expect(offline.advance).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: 'Confirm completion' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Completion details'), { target: { value: 'Synthetic rescue completed' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }))
  expect(offline.advance).toHaveBeenLastCalledWith('Synthetic rescue completed')
})
