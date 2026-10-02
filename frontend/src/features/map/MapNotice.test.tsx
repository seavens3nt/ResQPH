import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapNotice } from './MapNotice'

const REQUIRED_PROPS = {
  scenarioId: 'scenario-controlled-001',
  scenarioTimestamp: '2026-09-22T00:00:00Z',
  sourceType: 'controlled' as const,
  studyAreaId: 'ubelt-pilot-v1',
}

describe('MapNotice Component', () => {
  it('renders default controlled scenario metadata and truthful prototype disclaimers', () => {
    render(<MapNotice {...REQUIRED_PROPS} />)

    // Heading / title
    expect(screen.getByText('ResQPH Controlled Synthetic Scenario Map')).toBeInTheDocument()

    // Provenance badges
    expect(screen.getByText('CONTROLLED')).toBeInTheDocument()
    expect(screen.getByText(/BOUNDS: ubelt-pilot-v1/i)).toBeInTheDocument()
    expect(screen.getByText(/Scenario Time: 2026-09-22T00:00:00Z/i)).toBeInTheDocument()

    // Required truthful prototype and non-emergency notices
    expect(
      screen.getByText(/Academic prototype — do not use for a real emergency/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Synthetic academic scenario/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not live or historical flood evidence/i),
    ).toBeInTheDocument()
    expect(screen.getByText('scenario-controlled-001')).toBeInTheDocument()
    expect(
      screen.getByText(/Recommended corridors reflect prototype edge costs and do not guarantee transit safety/i),
    ).toBeInTheDocument()
  })

  it('renders historical source type and custom scenario parameters', () => {
    render(
      <MapNotice
        {...REQUIRED_PROPS}
        scenarioId="scenario-hist-1988"
        scenarioTimestamp="1988-11-04T12:00:00Z"
        sourceType="historical"
        studyAreaId="ubelt-pilot-v2"
        customNotice="Archived monsoon flood event record."
      />,
    )

    expect(screen.getByText('HISTORICAL')).toBeInTheDocument()
    expect(screen.getByText(/BOUNDS: ubelt-pilot-v2/i)).toBeInTheDocument()
    expect(screen.getByText(/Scenario Time: 1988-11-04T12:00:00Z/i)).toBeInTheDocument()
    expect(screen.getByText('Archived monsoon flood event record.')).toBeInTheDocument()
    expect(screen.getByText(/archived evidence is not a live condition report/i)).toBeInTheDocument()
    expect(screen.queryByText(/not live or historical flood evidence/i)).not.toBeInTheDocument()
  })

  it('renders unverified and simulated source types with accessible icons and text', () => {
    const { rerender } = render(<MapNotice {...REQUIRED_PROPS} sourceType="unverified" />)
    expect(screen.getByText('UNVERIFIED')).toBeInTheDocument()

    rerender(<MapNotice {...REQUIRED_PROPS} sourceType="simulated" />)
    expect(screen.getByText('SIMULATED')).toBeInTheDocument()
  })

  it('renders loading state without presenting stale values as current', () => {
    render(<MapNotice {...REQUIRED_PROPS} status="loading" />)

    expect(screen.getByText('Loading Scenario Data...')).toBeInTheDocument()
    expect(
      screen.getByText(/Retrieving controlled synthetic scenario map layers and edge passability for ubelt-pilot-v1/i),
    ).toBeInTheDocument()
  })

  it('renders stale state with lastSyncedAt and accessible retry button', () => {
    const onRetryMock = vi.fn()
    render(
      <MapNotice
        {...REQUIRED_PROPS}
        status="stale"
        lastSyncedAt="2026-09-22T08:30:00Z"
        onRetry={onRetryMock}
      />,
    )

    expect(screen.getByText('Cached / Stale Scenario Data')).toBeInTheDocument()
    expect(
      screen.getByText(/Displaying cached scenario data\. Last synced at 2026-09-22T08:30:00Z/i),
    ).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Retry loading map scenario data/i })
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders unavailable / error state with error details and safe retry context', () => {
    const onRetryMock = vi.fn()
    render(
      <MapNotice
        {...REQUIRED_PROPS}
        status="unavailable"
        errorMessage="Network timeout connecting to scenario server."
        onRetry={onRetryMock}
      />,
    )

    // Alert role for accessibility
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()

    expect(screen.getByText('Map Scenario Data Unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(/Network timeout connecting to scenario server\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No simulated safe route can be determined\./i),
    ).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Retry loading map scenario data/i })
    fireEvent.click(retryBtn)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders offline mode state explaining that network actions are unavailable', () => {
    render(<MapNotice {...REQUIRED_PROPS} status="offline" />)

    expect(screen.getByText('Offline Mode — Cached Scenario Active')).toBeInTheDocument()
    expect(
      screen.getByText(/Network is disconnected\. Running on cached local scenario/i),
    ).toBeInTheDocument()
  })

  it('renders ML fallback state stating rule-based routing remains active', () => {
    render(<MapNotice {...REQUIRED_PROPS} status="fallback" />)

    expect(screen.getByText('ML Fallback — Rule-Based Routing')).toBeInTheDocument()
    expect(
      screen.getByText(/Optional ML road-risk input is unavailable\. The deterministic rule-based routing fallback remains active/i),
    ).toBeInTheDocument()
  })

  it('renders compact mode with custom class', () => {
    const { container } = render(
      <MapNotice {...REQUIRED_PROPS} compact className="custom-test-notice" />,
    )
    const notice = container.querySelector('.map-notice')
    expect(notice).toHaveClass('map-notice--compact')
    expect(notice).toHaveClass('custom-test-notice')
  })
})
