import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { OfflineQueueEntry } from '../../api/missions'
import { SyncStatusBadge } from './SyncStatusBadge'
import fixtureJson from '../../../../data/samples/offline-mission.example.json?raw'

interface OfflineFixture {
  last_synced_at: string
  pending_event: OfflineQueueEntry
}

const fixture = JSON.parse(fixtureJson) as OfflineFixture

describe('SyncStatusBadge', () => {
  it('shows cached state with the full supplied last-sync timestamp and changed-conditions notice', () => {
    render(<SyncStatusBadge state="stale" lastSyncedAt={fixture.last_synced_at} />)

    expect(screen.getByRole('status', { name: /Cached · Possibly Stale/i })).toBeInTheDocument()
    expect(screen.getByText(/Conditions may have changed/i)).toBeInTheDocument()
    expect(screen.getByText(/Last synced:/i).closest('time')).toHaveAttribute(
      'dateTime',
      fixture.last_synced_at,
    )
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('does not invent a last-sync time when a cached timestamp is missing or invalid', () => {
    const { rerender } = render(<SyncStatusBadge state="stale" />)
    expect(screen.getByText(/Last sync time is unavailable/i)).toBeInTheDocument()

    rerender(<SyncStatusBadge state="stale" lastSyncedAt="not-a-timestamp" />)
    expect(screen.getByText(/Last sync time is unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText(/Last synced:/i)).not.toBeInTheDocument()
  })

  it('keeps pending, syncing, failed, and acknowledged labels and messages distinct', () => {
    const { rerender } = render(<SyncStatusBadge state="pending" />)
    expect(screen.getByText('Pending Sync')).toBeInTheDocument()
    expect(screen.getByText(/not been accepted by the server/i)).toBeInTheDocument()

    rerender(<SyncStatusBadge state="syncing" />)
    expect(screen.getByText('Syncing')).toBeInTheDocument()
    expect(screen.getByText(/acceptance is not yet confirmed/i)).toBeInTheDocument()

    rerender(<SyncStatusBadge state="failed" failureReason={fixture.pending_event.failureReason} />)
    expect(screen.getByText('Sync Failed')).toBeInTheDocument()
    expect(screen.getByText(/queued transition was not accepted/i)).toBeInTheDocument()
    expect(screen.getByText(/Failure reason was not provided/i)).toBeInTheDocument()

    rerender(<SyncStatusBadge state="success" />)
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.getByText(/server acknowledged this transition/i)).toBeInTheDocument()
  })

  it('shows a supplied failure reason without implying the attempted status was accepted', () => {
    render(<SyncStatusBadge state="failed" failureReason="Version conflict" />)
    expect(screen.getByText(/Failure reason: Version conflict/i)).toBeInTheDocument()
    expect(screen.queryByText(/Synced/i)).not.toBeInTheDocument()
  })
})
