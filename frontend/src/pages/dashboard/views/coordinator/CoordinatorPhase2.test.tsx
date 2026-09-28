import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CoordinatorPendingQueue } from './CoordinatorPendingQueue'
import { CoordinatorAssignModal } from './CoordinatorAssignModal'
import { ApiError } from '../../../../api/assignments'
import * as assignmentsApi from '../../../../api/assignments'
import { MissionProvider } from '../../../../features/missions/MissionContext'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe('Coordinator Phase 2 UI States', () => {
  describe('CoordinatorPendingQueue', () => {
    it('renders empty queue state when items array is empty', async () => {
      vi.spyOn(assignmentsApi, 'listPendingRequests').mockResolvedValueOnce({
        items: [],
        next_cursor: null,
        total: 0,
      })

      const client = createQueryClient()
      render(
        <QueryClientProvider client={client}>
          <CoordinatorPendingQueue
            selectedId={null}
            onSelect={vi.fn()}
            onAssign={vi.fn()}
          />
        </QueryClientProvider>,
      )

      expect(await screen.findByText(/No Pending Requests/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Refresh Queue/i })).toBeInTheDocument()
    })

    it('renders populated queue on success', async () => {
      vi.spyOn(assignmentsApi, 'listPendingRequests').mockResolvedValueOnce({
        items: [
          {
            id: 'REQ-999',
            status: 'pending',
            version: 1,
            location: {
              address: 'Sampaloc, Manila',
              point: { type: 'Point', coordinates: [121.0, 14.6] },
            },
            headcount: 5,
            vulnerabilities: ['infant'],
            medical_needs: true,
            reported_flood_level: 'chest',
            situation_summary: 'Water chest high',
            submitted_at: '2026-09-23T10:00:00Z',
          },
        ],
        next_cursor: null,
        total: 1,
      })

      const client = createQueryClient()
      const onAssign = vi.fn()
      render(
        <QueryClientProvider client={client}>
          <CoordinatorPendingQueue
            selectedId={null}
            onSelect={vi.fn()}
            onAssign={onAssign}
          />
        </QueryClientProvider>,
      )

      expect(await screen.findByText('REQ-999')).toBeInTheDocument()
      expect(screen.getByText(/Sampaloc, Manila/i)).toBeInTheDocument()
      expect(screen.getByText(/5 people/i)).toBeInTheDocument()
      expect(screen.getByText(/Medical Needed/i)).toBeInTheDocument()

      const assignBtn = screen.getByRole('button', { name: /Assign/i })
      fireEvent.click(assignBtn)
      expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'REQ-999' }))
    })

    it('renders RoleNotice when server returns 403 Forbidden', async () => {
      vi.spyOn(assignmentsApi, 'listPendingRequests').mockRejectedValueOnce(
        new ApiError(403, 'forbidden_role', 'Simulated role not permitted'),
      )

      const client = createQueryClient()
      render(
        <QueryClientProvider client={client}>
          <CoordinatorPendingQueue
            selectedId={null}
            onSelect={vi.fn()}
            onAssign={vi.fn()}
          />
        </QueryClientProvider>,
      )

      expect(await screen.findByText(/Action Not Permitted/i)).toBeInTheDocument()
      expect(screen.getByText(/Role access is controlled by the prototype role-simulation boundary/i)).toBeInTheDocument()
    })

    it('renders ApiErrorBanner on 503 System Error', async () => {
      vi.spyOn(assignmentsApi, 'listPendingRequests').mockRejectedValueOnce(
        new ApiError(503, 'service_unavailable', 'Database unavailable'),
      )

      const client = createQueryClient()
      render(
        <QueryClientProvider client={client}>
          <CoordinatorPendingQueue
            selectedId={null}
            onSelect={vi.fn()}
            onAssign={vi.fn()}
          />
        </QueryClientProvider>,
      )

      expect(await screen.findByText(/Service Unavailable/i)).toBeInTheDocument()
      expect(screen.getByText(/Database unavailable/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    })
  })

  describe('CoordinatorAssignModal', () => {
    const mockRequest: assignmentsApi.ApiRescueRequestSummary = {
      id: 'REQ-777',
      status: 'pending',
      version: 1,
      location: {
        address: 'Bilibid St, Quiapo',
        point: { type: 'Point', coordinates: [120.98, 14.6] },
      },
      headcount: 2,
      vulnerabilities: [],
      medical_needs: true,
      reported_flood_level: 'waist',
      situation_summary: 'Trapped on roof',
      submitted_at: '2026-09-23T11:00:00Z',
    }

    it('renders prototype disclaimer and medical alert banner', () => {
      const client = createQueryClient()
      render(
        <QueryClientProvider client={client}>
          <MissionProvider>
            <CoordinatorAssignModal
              isOpen={true}
              targetRequest={mockRequest}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </MissionProvider>
        </QueryClientProvider>,
      )

      expect(screen.getByText(/Prototype:/i)).toBeInTheDocument()
      expect(screen.getByText(/Medical Emergency Flagged!/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Confirm Dispatch Assignment/i })).toBeInTheDocument()
    })

    it('displays 409 conflict banner when assignTeam returns 409 conflict', async () => {
      vi.spyOn(assignmentsApi, 'assignTeam').mockRejectedValueOnce(
        new ApiError(409, 'conflict_detected', 'Request was already assigned'),
      )

      const client = createQueryClient()
      render(
        <QueryClientProvider client={client}>
          <MissionProvider>
            <CoordinatorAssignModal
              isOpen={true}
              targetRequest={mockRequest}
              onClose={vi.fn()}
              onSuccess={vi.fn()}
            />
          </MissionProvider>
        </QueryClientProvider>,
      )

      const submitBtn = screen.getByRole('button', { name: /Confirm Dispatch Assignment/i })
      fireEvent.click(submitBtn)

      expect(await screen.findByText('Conflict')).toBeInTheDocument()
      expect(screen.getByText(/Request was already assigned/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Refresh Current State/i })).toBeInTheDocument()
    })
  })
})
