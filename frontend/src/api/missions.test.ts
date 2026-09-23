import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './client'
import {
  listMyMissions,
  updateMissionStatus,
  nextValidStatus,
  ApiError,
  type PaginatedMissions,
  type StatusEventResult,
} from './missions'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('missions API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('nextValidStatus transition state machine', () => {
    it('progresses correctly according to RESCUE_LIFECYCLE.md', () => {
      expect(nextValidStatus('assigned')).toBe('en-route')
      expect(nextValidStatus('en-route')).toBe('arrived')
      expect(nextValidStatus('arrived')).toBe('completed')
    })

    it('returns null for terminal or unadvanceable states', () => {
      expect(nextValidStatus('completed')).toBeNull()
      expect(nextValidStatus('cancelled')).toBeNull()
    })
  })

  describe('listMyMissions', () => {
    it('returns missions list for current rescuer', async () => {
      const mockData: PaginatedMissions = {
        items: [
          {
            id: 'MSN-101',
            request_id: 'REQ-101',
            team_id: 'team-alpha',
            status: 'assigned',
            version: 1,
            request_summary: {
              id: 'REQ-101',
              status: 'assigned',
              version: 1,
              location: {
                address: 'España Blvd, Manila',
                point: { type: 'Point', coordinates: [120.99, 14.6] },
              },
              headcount: 2,
              vulnerabilities: [],
              medical_needs: false,
              reported_flood_level: 'waist',
              situation_summary: 'Rescue needed',
              submitted_at: '2026-09-23T11:00:00Z',
            },
            status_history: [],
            created_at: '2026-09-23T11:05:00Z',
            updated_at: '2026-09-23T11:05:00Z',
          },
        ],
        next_cursor: null,
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

      const res = await listMyMissions()
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('MSN-101')
      expect(apiClient.get).toHaveBeenCalledWith('/missions', {
        params: { assigned_to: 'me', status: 'assigned,en-route,arrived' },
      })
    })

    it('throws ApiError with isForbidden=true on 403 role error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              code: 'forbidden_role',
              message: 'Simulated role [citizen] is not permitted to view missions',
            },
          },
        },
      }

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      try {
        await listMyMissions()
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.httpStatus).toBe(403)
        expect(apiErr.isForbidden).toBe(true)
      }
    })
  })

  describe('updateMissionStatus', () => {
    it('returns updated mission and event on 200 OK', async () => {
      const mockResult: StatusEventResult = {
        mission: {
          id: 'MSN-101',
          request_id: 'REQ-101',
          team_id: 'team-alpha',
          status: 'en-route',
          version: 2,
          request_summary: {
            id: 'REQ-101',
            status: 'assigned',
            version: 1,
            location: {
              address: 'España Blvd, Manila',
              point: { type: 'Point', coordinates: [120.99, 14.6] },
            },
            headcount: 2,
            vulnerabilities: [],
            medical_needs: false,
            reported_flood_level: 'waist',
            situation_summary: 'Rescue needed',
            submitted_at: '2026-09-23T11:00:00Z',
          },
          status_history: [
            {
              event_id: 'evt-1',
              prior_status: 'assigned',
              new_status: 'en-route',
              actor_id: 'usr-rescuer',
              actor_role: 'rescuer',
              source: 'online',
              server_recorded_at: '2026-09-23T11:10:00Z',
            },
          ],
          created_at: '2026-09-23T11:05:00Z',
          updated_at: '2026-09-23T11:10:00Z',
        },
        event: {
          event_id: 'evt-1',
          prior_status: 'assigned',
          new_status: 'en-route',
          actor_id: 'usr-rescuer',
          actor_role: 'rescuer',
          source: 'online',
          server_recorded_at: '2026-09-23T11:10:00Z',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResult })

      const res = await updateMissionStatus('MSN-101', {
        event_id: 'evt-1',
        new_status: 'en-route',
        expected_mission_version: 1,
        client_recorded_at: '2026-09-23T11:09:59Z',
        source: 'online',
      })

      expect(res.mission.status).toBe('en-route')
      expect(res.mission.version).toBe(2)
      expect(apiClient.post).toHaveBeenCalledWith(
        '/missions/MSN-101/status-events',
        expect.objectContaining({ event_id: 'evt-1', new_status: 'en-route' }),
      )
    })

    it('throws ApiError with isConflict=true on 409 transition conflict', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              code: 'invalid_status_transition',
              message: 'Cannot transition from arrived to en-route (invalid backwards transition)',
            },
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValueOnce(axiosError)

      try {
        await updateMissionStatus('MSN-101', {
          event_id: 'evt-2',
          new_status: 'en-route',
          expected_mission_version: 2,
          client_recorded_at: '2026-09-23T11:15:00Z',
          source: 'online',
        })
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.httpStatus).toBe(409)
        expect(apiErr.isConflict).toBe(true)
        expect(apiErr.code).toBe('invalid_status_transition')
      }
    })
  })
})
