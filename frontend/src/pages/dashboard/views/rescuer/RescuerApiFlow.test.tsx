import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../../../features/auth/AuthContext'
import * as MissionContext from '../../../../features/missions/MissionContext'
import * as missionsApi from '../../../../api/missions'
import type { MissionDetail } from '../../../../api/missions'
import { RescuerView } from '../RescuerView'

const backendMission: MissionDetail = {
  id: 'mission-api-only',
  request_id: 'request-api-only',
  team_id: 'team-alpha',
  assigned_rescuer_id: 'team-alpha',
  status: 'assigned',
  version: 1,
  assigned_at: '2026-09-23T11:05:00Z',
  request_summary: {
    location: {
      address: 'España Boulevard, Sampaloc',
      point: { type: 'Point', coordinates: [120.99, 14.61] },
    },
    headcount: 3,
    vulnerabilities: [],
    medical_needs: false,
    reported_flood_level: 'waist',
    situation_summary: 'Controlled scenario request',
    fixture_notice: 'Synthetic academic demonstration data.',
  },
  status_history: [],
  data_source: 'synthetic',
  sync_status: 'synced',
  created_at: '2026-09-23T11:05:00Z',
  updated_at: '2026-09-23T11:05:00Z',
}

describe('Rescuer API mission flow', () => {
  beforeEach(() => {
    localStorage.setItem(
      'resqph.auth.user',
      JSON.stringify({ email: 'team-alpha', role: 'rescuer', name: 'Team Alpha' }),
    )
    vi.spyOn(MissionContext, 'useMissions').mockReturnValue({
      activeRescuerMission: null,
      requests: [],
      updateMissionStatus: vi.fn(),
      overrideRoute: vi.fn(),
      isOffline: false,
    } as unknown as ReturnType<typeof MissionContext.useMissions>)
    vi.spyOn(missionsApi, 'listMyMissions').mockResolvedValue([backendMission])
  })

  it('renders an authoritative backend mission without a matching mock fixture', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <RescuerView />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect((await screen.findAllByText('mission-api-only')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Assigned Mission')).toBeInTheDocument()
    expect((await screen.findAllByText(/España Boulevard, Sampaloc/i)).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/Field Rescuer Console — Standby/i)).not.toBeInTheDocument()
  })
})
