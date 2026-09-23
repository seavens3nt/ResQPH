import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import { RescuerOfflineQueue } from './RescuerOfflineQueue'
import { RescuerMissionCard } from './RescuerMissionCard'
import type { OfflineQueueEntry, MissionDetail } from '../../../../api/missions'

describe('Rescuer Phase 2 UI States', () => {
  describe('SyncStatusBadge', () => {
    it('renders fresh status badge with timestamp', () => {
      render(<SyncStatusBadge state="fresh" lastSyncedAt="2026-09-23T10:00:00Z" />)
      expect(screen.getByText('Synced')).toBeInTheDocument()
    })

    it('renders stale status badge', () => {
      render(<SyncStatusBadge state="stale" lastSyncedAt="2026-09-23T09:00:00Z" />)
      expect(screen.getByText(/Cached · Possibly Stale/i)).toBeInTheDocument()
    })

    it('renders pending sync state', () => {
      render(<SyncStatusBadge state="pending" />)
      expect(screen.getByText(/Pending Sync/i)).toBeInTheDocument()
      expect(screen.getByText(/One transition queued — will sync on reconnect/i)).toBeInTheDocument()
    })

    it('renders sync failed state with failure reason', () => {
      render(
        <SyncStatusBadge
          state="failed"
          failureReason="HTTP 409: Status already completed on server"
        />,
      )
      expect(screen.getByText('Sync Failed')).toBeInTheDocument()
      expect(screen.getByText(/Status already completed on server/i)).toBeInTheDocument()
    })
  })

  describe('RescuerOfflineQueue', () => {
    const mockEntry: OfflineQueueEntry = {
      localId: 'evt-test-1',
      missionId: 'MSN-202',
      body: {
        event_id: 'evt-test-1',
        new_status: 'en-route',
        expected_mission_version: 1,
        client_recorded_at: '2026-09-23T10:30:00Z',
        source: 'offline-sync',
      },
      syncState: 'pending',
      enqueuedAt: '2026-09-23T10:30:00Z',
    }

    it('renders offline advisory banner when offline with no entries', () => {
      render(
        <RescuerOfflineQueue
          entry={null}
          isOffline={true}
          onRetrySync={vi.fn()}
          onDismissFailed={vi.fn()}
        />,
      )
      expect(screen.getByText(/Offline Mode Active/i)).toBeInTheDocument()
      expect(screen.getByText(/You may queue one status transition/i)).toBeInTheDocument()
    })

    it('displays single queued transition correctly', () => {
      render(
        <RescuerOfflineQueue
          entry={mockEntry}
          isOffline={true}
          onRetrySync={vi.fn()}
          onDismissFailed={vi.fn()}
        />,
      )
      expect(screen.getByText(/Queued Transition/i)).toBeInTheDocument()
      expect(screen.getByText('MSN-202')).toBeInTheDocument()
      expect(screen.getByText('en-route')).toBeInTheDocument()
    })

    it('provides retry button when online with pending entry', () => {
      const onRetry = vi.fn()
      render(
        <RescuerOfflineQueue
          entry={mockEntry}
          isOffline={false}
          onRetrySync={onRetry}
          onDismissFailed={vi.fn()}
        />,
      )
      const retryBtn = screen.getByRole('button', { name: /Retry Sync Now/i })
      fireEvent.click(retryBtn)
      expect(onRetry).toHaveBeenCalled()
    })

    it('renders failure message and dismiss button on failed sync', () => {
      const failedEntry: OfflineQueueEntry = {
        ...mockEntry,
        syncState: 'failed',
        failureReason: 'Server rejected transition: version conflict',
      }
      const onDismiss = vi.fn()

      render(
        <RescuerOfflineQueue
          entry={failedEntry}
          isOffline={false}
          onRetrySync={vi.fn()}
          onDismissFailed={onDismiss}
        />,
      )

      expect(screen.getByText(/Sync Failed:/i)).toBeInTheDocument()
      expect(screen.getAllByText(/version conflict/i).length).toBeGreaterThan(0)
      const dismissBtn = screen.getByRole('button', { name: /Dismiss Failed Event/i })
      fireEvent.click(dismissBtn)
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('RescuerMissionCard', () => {
    const mockMission: MissionDetail = {
      id: 'MSN-303',
      request_id: 'REQ-303',
      team_id: 'team-alpha',
      status: 'assigned',
      version: 1,
      request_summary: {
        id: 'REQ-303',
        status: 'assigned',
        version: 1,
        location: {
          address: 'Legarda St, Manila',
          point: { type: 'Point', coordinates: [120.99, 14.6] },
        },
        headcount: 4,
        vulnerabilities: [],
        medical_needs: false,
        reported_flood_level: 'knee',
        situation_summary: 'Water on first floor',
        submitted_at: '2026-09-23T11:00:00Z',
      },
      status_history: [
        {
          event_id: 'evt-init',
          prior_status: 'assigned',
          new_status: 'assigned',
          actor_id: 'usr-coord',
          actor_role: 'coordinator',
          source: 'online',
          server_recorded_at: '2026-09-23T11:05:00Z',
          note: 'Initial dispatch',
        },
      ],
      created_at: '2026-09-23T11:05:00Z',
      updated_at: '2026-09-23T11:05:00Z',
    }

    it('renders mission card with TAP EN ROUTE button when status is assigned', () => {
      const onAdvance = vi.fn()
      render(
        <RescuerMissionCard
          mission={mockMission}
          lastSyncedAt="2026-09-23T11:05:00Z"
          isStale={false}
          isAdvancing={false}
          onAdvanceStatus={onAdvance}
        />,
      )

      expect(screen.getByText('MSN-303')).toBeInTheDocument()
      expect(screen.getByText(/Legarda St, Manila/i)).toBeInTheDocument()
      const advanceBtn = screen.getByRole('button', { name: /TAP EN ROUTE/i })
      fireEvent.click(advanceBtn)
      expect(onAdvance).toHaveBeenCalled()
    })

    it('renders collapsible status history with events', () => {
      render(
        <RescuerMissionCard
          mission={mockMission}
          lastSyncedAt="2026-09-23T11:05:00Z"
          isStale={false}
          isAdvancing={false}
          onAdvanceStatus={vi.fn()}
        />,
      )

      expect(screen.getByText(/Status history \(1 events\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Initial dispatch/i)).toBeInTheDocument()
    })
  })
})
