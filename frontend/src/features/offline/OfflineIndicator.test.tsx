import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineIndicator } from './OfflineIndicator'

const state = vi.hoisted(() => ({
  isOffline: true,
  pendingSyncCount: 1,
  toggleOffline: vi.fn(),
}))

vi.mock('../missions/MissionContext', () => ({
  useMissions: () => state,
}))

describe('OfflineIndicator', () => {
  beforeEach(() => {
    state.isOffline = true
    state.pendingSyncCount = 1
    state.toggleOffline.mockReset()
  })

  it('identifies simulated offline mode without claiming cached maps or server acceptance', () => {
    render(<OfflineIndicator />)

    expect(screen.getByRole('complementary', { name: /Offline demonstration status/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Demo offline mode is simulated/i)
    expect(screen.getByRole('status')).toHaveTextContent(/does not change browser connectivity/i)
    expect(screen.getByRole('status')).toHaveTextContent(/server acceptance is not confirmed/i)
    expect(screen.queryByText(/map cached on-device/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/all pending offline actions synced/i)).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Simulate reconnect' })
    toggle.focus()
    expect(document.activeElement).toBe(toggle)
    fireEvent.click(toggle)
    expect(state.toggleOffline).toHaveBeenCalledOnce()
  })

  it('does not call unverified queued changes synced after simulated reconnection', () => {
    state.isOffline = false
    state.pendingSyncCount = 2
    render(<OfflineIndicator />)

    expect(screen.getByRole('status')).toHaveTextContent(/awaiting verification/i)
    expect(screen.getByRole('status')).toHaveTextContent(/cannot confirm server acceptance/i)
    expect(screen.queryByText(/synced to central dispatch/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simulate offline mode' })).toBeInTheDocument()
  })

  it('renders nothing when the simulated indicator has no offline or pending state', () => {
    state.isOffline = false
    state.pendingSyncCount = 0
    const { container } = render(<OfflineIndicator />)
    expect(container).toBeEmptyDOMElement()
  })
})
