import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './client'
import {
  listPendingRequests,
  assignTeam,
  ApiError,
  type PaginatedRequests,
  type AssignmentResult,
} from './assignments'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('assignments API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPendingRequests', () => {
    it('returns paginated requests on success (200 OK)', async () => {
      const mockData: PaginatedRequests = {
        items: [
          {
            id: 'REQ-001',
            status: 'pending',
            version: 1,
            location: {
              address: '123 Sampaloc St, Manila',
              point: { type: 'Point', coordinates: [121.0, 14.6] },
            },
            headcount: 3,
            vulnerabilities: ['senior'],
            medical_needs: false,
            reported_flood_level: 'knee',
            situation_summary: 'Water rising in ground floor',
            submitted_at: '2026-09-23T10:00:00Z',
          },
        ],
        next_cursor: null,
        total: 1,
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

      const result = await listPendingRequests()
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('REQ-001')
      expect(apiClient.get).toHaveBeenCalledWith('/rescue-requests', {
        params: { status: 'pending', limit: 20 },
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
              message: 'Simulated role [rescuer] is not permitted to list coordinator queues',
              details: [{ reason: 'Only coordinators can list pending requests' }],
              request_id: 'req-403-test',
            },
          },
        },
      }

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      try {
        await listPendingRequests()
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.httpStatus).toBe(403)
        expect(apiErr.isForbidden).toBe(true)
        expect(apiErr.code).toBe('forbidden_role')
      }
    })

    it('throws ApiError with isUnavailable=true on 503 error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 503,
          data: {
            error: {
              code: 'service_unavailable',
              message: 'Database connection pool exhausted',
            },
          },
        },
      }

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      try {
        await listPendingRequests()
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.httpStatus).toBe(503)
        expect(apiErr.isUnavailable).toBe(true)
      }
    })
  })

  describe('assignTeam', () => {
    it('returns assignment result on 201 Created', async () => {
      const mockResult: AssignmentResult = {
        mission: {
          id: 'MSN-001',
          request_id: 'REQ-001',
          team_id: 'team-alpha',
          status: 'assigned',
          version: 1,
          created_at: '2026-09-23T10:05:00Z',
        },
        request: {
          id: 'REQ-001',
          status: 'assigned',
          version: 2,
          location: {
            address: '123 Sampaloc St, Manila',
            point: { type: 'Point', coordinates: [121.0, 14.6] },
          },
          headcount: 3,
          vulnerabilities: [],
          medical_needs: false,
          reported_flood_level: 'knee',
          situation_summary: 'Assigned',
          submitted_at: '2026-09-23T10:00:00Z',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResult })

      const res = await assignTeam('REQ-001', {
        team_id: 'team-alpha',
        expected_request_version: 1,
      })

      expect(res.mission.id).toBe('MSN-001')
      expect(res.mission.status).toBe('assigned')
      expect(apiClient.post).toHaveBeenCalledWith(
        '/rescue-requests/REQ-001/assignment',
        { team_id: 'team-alpha', expected_request_version: 1 },
      )
    })

    it('throws ApiError with isConflict=true on 409 conflict', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              code: 'assignment_conflict',
              message: 'Request REQ-001 has already been assigned to team-bravo (version mismatch: expected 1, found 2)',
              details: [{ reason: 'Stale version detected. Refresh required.' }],
            },
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValueOnce(axiosError)

      try {
        await assignTeam('REQ-001', { team_id: 'team-alpha', expected_request_version: 1 })
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.httpStatus).toBe(409)
        expect(apiErr.isConflict).toBe(true)
        expect(apiErr.code).toBe('assignment_conflict')
      }
    })
  })
})
