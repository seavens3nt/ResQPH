/**
 * Issue #71 role regression. Components use the production API modules and
 * Axios client; only the HTTP transport is replaced at the adapter boundary.
 * Response and error bodies follow docs/api/API_CONTRACT.md.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { updateMissionStatus, type MissionDetail } from '../api/missions'
import { AuthProvider } from '../features/auth/AuthContext'
import { MissionProvider } from '../features/missions/MissionContext'
import { RequestForm } from '../pages/dashboard/views/citizen/RequestForm'
import { RescuerMissionCard } from '../pages/dashboard/views/rescuer/RescuerMissionCard'

const previousAdapter = apiClient.defaults.adapter

function response(config: Parameters<AxiosAdapter>[0], status: number, data: unknown, statusText: string): AxiosResponse {
  return { config, status, data, statusText, headers: {} } as AxiosResponse
}

function renderForRole(ui: React.ReactElement, role: 'citizen' | 'rescuer') {
  sessionStorage.setItem('resqph.auth.user', JSON.stringify({ email: `${role}-demo`, role, teamId: 'team-alpha', name: 'Demo Actor' }))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider><MissionProvider>{ui}</MissionProvider></AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { apiClient.defaults.adapter = previousAdapter })

describe('authenticated citizen and station frontend contract regression', () => {
  it('citizen submits a confirmed pin without an address and accepts the server record', async () => {
    let resolveRequest!: (value: ReturnType<typeof response>) => void
    let requestConfig!: Parameters<AxiosAdapter>[0]
    const onSuccess = vi.fn()
    apiClient.defaults.adapter = ((config) => {
      requestConfig = config
      return new Promise<AxiosResponse>((resolve) => { resolveRequest = resolve })
    }) as AxiosAdapter

    renderForRole(<RequestForm onSuccess={onSuccess} onCancel={vi.fn()} />, 'citizen')
    fireEvent.click(screen.getByRole('button', { name: 'Use this rescue location' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Citizen rescue request form' }))

    expect(await screen.findByRole('button', { name: /Submitting/i })).toBeDisabled()
    expect(onSuccess).not.toHaveBeenCalled()
    await waitFor(() => expect(requestConfig.url).toBe('/rescue-requests'))
    expect(requestConfig.method).toBe('post')
    expect(requestConfig.headers.get('X-Demo-Role')).toBe('citizen')
    expect(JSON.parse(String(requestConfig.data))).toMatchObject({
      headcount: 1,
      location: { address: 'Pinned location', point: { type: 'Point', coordinates: [120.9946, 14.6042] } },
    })

    const created = {
      id: 'request-issue71-synthetic', citizen_id: 'citizen-demo',
      location: { address: 'Synthetic U-Belt location', point: { type: 'Point', coordinates: [120.9946, 14.6042] } },
      headcount: 1, vulnerabilities: [], medical_needs: false, medical_details: null,
      situation_summary: null, reported_flood_level: 'unknown',
      status: 'pending', version: 1, created_at: '2026-10-05T00:00:00Z', updated_at: '2026-10-05T00:00:00Z',
    }
    resolveRequest(response(requestConfig, 201, created, 'Created'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: created.id, status: 'pending', version: 1 })))
  })

  it('citizen renders API validation failure as an announced error and preserves entered input', async () => {
    apiClient.defaults.adapter = vi.fn(async (config) => {
      throw new AxiosError('Request failed with status code 422', 'ERR_BAD_REQUEST', config, undefined,
        response(config, 422, { error: { code: 'validation_error', message: 'Headcount must be positive.' } }, 'Unprocessable Entity'))
    })
    renderForRole(<RequestForm onSuccess={vi.fn()} onCancel={vi.fn()} />, 'citizen')
    const address = screen.getByLabelText(/Optional address or location description/i)
    fireEvent.change(address, { target: { value: 'Synthetic block, Sampaloc, Manila' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this rescue location' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Citizen rescue request form' }))

    expect(await screen.findByText('Headcount must be positive.')).toBeInTheDocument()
    expect(address).toHaveValue('Synthetic block, Sampaloc, Manila')
  })

  it.each([
    ['zero people', /People needing assistance/i, '0'],
  ])('citizen rejects %s locally without sending a request', async (_case, label, value) => {
    const transport = vi.fn()
    const onSuccess = vi.fn()
    apiClient.defaults.adapter = transport
    renderForRole(<RequestForm onSuccess={onSuccess} onCancel={vi.fn()} />, 'citizen')
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this rescue location' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Citizen rescue request form' }))
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(transport).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('rejects an outside-study-area pin without moving it or sending a request', () => {
    const transport = vi.fn()
    apiClient.defaults.adapter = transport
    renderForRole(<RequestForm onSuccess={vi.fn()} onCancel={vi.fn()} />, 'citizen')
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '121.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this rescue location' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Citizen rescue request form' }))
    expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes('inside the pilot area'))).toBe(true)
    expect(screen.getByLabelText('Longitude')).toHaveValue(121.5)
    expect(transport).not.toHaveBeenCalled()
  })

  it('citizen retains input and does not signal success during service outage', async () => {
    const onSuccess = vi.fn()
    apiClient.defaults.adapter = vi.fn(async (config) => {
      throw new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', config, undefined,
        response(config, 503, { error: { code: 'database_unavailable', message: 'Synthetic outage.' } }, 'Service Unavailable'))
    })
    renderForRole(<RequestForm onSuccess={onSuccess} onCancel={vi.fn()} />, 'citizen')
    const address = screen.getByLabelText(/Optional address or location description/i)
    fireEvent.change(address, { target: { value: 'Synthetic retry location, Manila' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this rescue location' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Citizen rescue request form' }))
    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument()
    expect(address).toHaveValue('Synthetic retry location, Manila')
    expect(onSuccess).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit request/i })).toBeEnabled())
  })

  it('rescuer uses the status-event API response and renders completed history', async () => {
    const completed: MissionDetail = {
      id: 'mission-issue71-synthetic', request_id: 'request-issue71-synthetic', team_id: 'rescuer-demo',
      assigned_rescuer_id: 'rescuer-demo', status: 'completed', version: 4,
      assigned_at: '2026-10-05T00:00:00Z', created_at: '2026-10-05T00:00:00Z', updated_at: '2026-10-05T00:02:00Z',
      request_summary: null, data_source: 'synthetic', sync_status: 'synced', completed_at: '2026-10-05T00:02:00Z',
      status_history: [{ event_id: 'event-issue71-synthetic', mission_id: 'mission-issue71-synthetic', prior_status: 'arrived',
        new_status: 'completed', actor_id: 'rescuer-demo', actor_role: 'rescuer', source: 'online',
        client_recorded_at: '2026-10-05T00:02:00Z', server_recorded_at: '2026-10-05T00:02:01Z', note: 'Synthetic completion.' }],
    }
    let requestConfig!: Parameters<AxiosAdapter>[0]
    apiClient.defaults.adapter = vi.fn(async (config) => {
      requestConfig = config
      return response(config, 200, completed, 'OK')
    })
    sessionStorage.setItem('resqph.auth.user', JSON.stringify({ email: 'rescuer-demo', role: 'rescuer', teamId: 'team-alpha', name: 'Demo Rescuer' }))
    const accepted = await updateMissionStatus(completed.id, {
      event_id: 'event-issue71-synthetic', new_status: 'completed', expected_mission_version: 3,
      client_recorded_at: '2026-10-05T00:02:00Z', source: 'online', note: 'Synthetic completion.',
    })
    expect(requestConfig.url).toBe(`/missions/${completed.id}/status-events`)
    expect(requestConfig.headers.get('X-Demo-Role')).toBe('rescuer')
    renderForRole(<RescuerMissionCard mission={accepted} lastSyncedAt="2026-10-05T00:02:01Z" isStale={false}
      isAdvancing={false} onAdvanceStatus={vi.fn()} />, 'rescuer')

    expect(screen.getByText(/Mission Completed/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Status history \(1 events\)/i))
    expect(screen.getByLabelText('Mission status history')).toHaveTextContent('arrived → completed')
    expect(screen.getByLabelText('Mission status history')).toHaveTextContent('Synthetic completion.')
  })
})
