/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MissionDetail, OfflineQueueEntry } from '../../../../api/missions'
import { RescuerMissionCard } from './RescuerMissionCard'
import { RescuerOfflineQueue } from './RescuerOfflineQueue'
import fixtureJson from '../../../../../../data/samples/offline-mission.example.json?raw'

interface OfflineFixture {
  last_synced_at: string
  mission: MissionDetail
  pending_event: OfflineQueueEntry
}

const fixture = JSON.parse(fixtureJson) as OfflineFixture

function makeEntry(syncState: OfflineQueueEntry['syncState']): OfflineQueueEntry {
  return { ...fixture.pending_event, syncState }
}

describe('rescuer offline presentation', () => {
  it('shows the cached mission, full last-sync time, and changed-conditions disclosure', () => {
    render(
      <RescuerMissionCard
        mission={fixture.mission}
        lastSyncedAt={fixture.last_synced_at}
        isStale
        isAdvancing={false}
        isCached
        onAdvanceStatus={vi.fn()}
      />,
    )

    expect(screen.getByRole('article', { name: `Mission ${fixture.mission.id}` })).toBeInTheDocument()
    expect(screen.getByText(/Cached mission for offline reference/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Conditions may have changed/i)).toHaveLength(2)
    expect(screen.getByText(/Last synced:/i).closest('time')).toHaveAttribute(
      'dateTime',
      fixture.last_synced_at,
    )
    expect(screen.getByText('En route')).toBeInTheDocument()
  })

  it('locks a second status action while a queued event remains unaccepted', () => {
    const onAdvance = vi.fn()
    render(
      <RescuerMissionCard
        mission={fixture.mission}
        lastSyncedAt={fixture.last_synced_at}
        isStale
        isAdvancing={false}
        isQueueLocked
        onAdvanceStatus={onAdvance}
      />,
    )

    const button = screen.getByRole('button', { name: /Status update awaiting review/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/has not been advanced by that queued event/i)).toBeInTheDocument()
    fireEvent.click(button)
    expect(onAdvance).not.toHaveBeenCalled()
  })

  it('announces an in-progress status action without claiming acceptance', () => {
    render(
      <RescuerMissionCard
        mission={fixture.mission}
        lastSyncedAt={fixture.last_synced_at}
        isStale={false}
        isAdvancing
        onAdvanceStatus={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Saving status/i })).toBeDisabled()
    expect(screen.getByText(/acceptance is not yet confirmed/i)).toBeInTheDocument()
  })

  it('keeps pending queue event details visible and blocks retry while offline', () => {
    const onRetrySync = vi.fn()
    render(
      <RescuerOfflineQueue
        entry={fixture.pending_event}
        isOffline
        onRetrySync={onRetrySync}
        onDismissFailed={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: /Pending Sync/i })).toBeInTheDocument()
    expect(screen.getByText(fixture.pending_event.body.event_id)).toBeInTheDocument()
    expect(screen.getByText(String(fixture.pending_event.body.expected_mission_version))).toBeInTheDocument()
    expect(screen.getAllByText(/not been accepted by the server/i)).toHaveLength(2)
    const retry = screen.getByRole('button', { name: /Retry Sync Now/i })
    expect(retry).toBeDisabled()
    expect(retry).toHaveAccessibleDescription(/Reconnect before retrying/i)
    expect(retry.tagName).toBe('BUTTON')
    fireEvent.click(retry)
    expect(onRetrySync).not.toHaveBeenCalled()
  })

  it('shows syncing separately and disables further retry while a sync is in progress', () => {
    render(
      <RescuerOfflineQueue
        entry={makeEntry('syncing')}
        isOffline={false}
        onRetrySync={vi.fn()}
        onDismissFailed={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: /Syncing/i })).toBeInTheDocument()
    expect(screen.getByText(/Acceptance is not confirmed until a response is received/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument()
  })

  it('preserves failed event details and reports server state unavailable unless supplied', () => {
    const failedEntry = { ...makeEntry('failed'), failureReason: 'HTTP 409: version conflict' }
    const onDismissFailed = vi.fn()
    render(
      <RescuerOfflineQueue
        entry={failedEntry}
        isOffline
        onRetrySync={vi.fn()}
        onDismissFailed={onDismissFailed}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/Sync Failed: event preserved for review/i)
    expect(screen.getByText(failedEntry.body.event_id)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/version conflict/i)
    expect(screen.getByText(/Current server state could not be retrieved or verified/i)).toBeInTheDocument()
    expect(screen.queryByText(/Current server state: arrived/i)).not.toBeInTheDocument()

    const discard = screen.getByRole('button', { name: /Discard Failed Event After Review/i })
    discard.focus()
    expect(document.activeElement).toBe(discard)
    fireEvent.click(discard)
    expect(onDismissFailed).toHaveBeenCalledOnce()
  })

  it('shows current server mission only when passed as an authoritative prop', () => {
    render(
      <RescuerOfflineQueue
        entry={{ ...makeEntry('failed'), failureReason: 'Version conflict' }}
        isOffline={false}
        currentServerMission={{ ...fixture.mission, status: 'arrived', version: 3 }}
        onRetrySync={vi.fn()}
        onDismissFailed={vi.fn()}
      />,
    )

    expect(screen.getByText('Current server state:').parentElement).toHaveTextContent(
      /arrived, version 3/i,
    )
    expect(screen.queryByText(/could not be retrieved or verified/i)).not.toBeInTheDocument()
  })

  it('displays storage failure and offline-without-queue state without inventing cache availability', () => {
    render(
      <RescuerOfflineQueue
        entry={null}
        isOffline
        storageError="IndexedDB is unavailable."
        onRetrySync={vi.fn()}
        onDismissFailed={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/IndexedDB is unavailable/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot confirm that offline data was saved or retrieved/i)
    expect(screen.getByText(/No status transition is queued/i)).toBeInTheDocument()
    expect(screen.getByText(/does not confirm that a mission or map is cached/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('marks a supplied successful event as acknowledged rather than pending', () => {
    render(
      <RescuerOfflineQueue
        entry={makeEntry('success')}
        isOffline={false}
        onRetrySync={vi.fn()}
        onDismissFailed={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: /Acknowledged/i })).toBeInTheDocument()
    expect(screen.getByText(/server acknowledged this queued status/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('includes keyboard-focus and narrow-screen layout rules for owned offline surfaces', () => {
    const styles = [
      'src/pages/dashboard/views/rescuer/RescuerMissionCard.css',
      'src/pages/dashboard/views/rescuer/RescuerOfflineQueue.css',
      'src/components/ui/SyncStatusBadge.css',
    ]
      .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
      .join('\n')

    expect(styles).toMatch(/:focus-visible/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*40rem\)/)
    expect(styles).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(styles).toMatch(/\.offline-queue-panel__actions\s*\.btn\s*\{[^}]*width:\s*100%/s)
  })
})
