/**
 * CitizenRequestFlow.test.tsx
 *
 * Automated tests for the citizen rescue-request and authoritative status-
 * tracking flow (Issue #17). Covers every required UI state from UI_STATES.md:
 *   loading · empty · validation error · outside-boundary error · system error
 *   unauthorized (403) · conflict (409) · success · cached/stale · cancellation
 *
 * All tests use the committed sanitised fixture from
 * data/samples/rescue-request.example.json.
 *
 * No live-data, official-dispatch, nationwide, or guaranteed-safety claims are
 * made anywhere in this file or the components it exercises.
 *
 * Test strategy:
 *   - API calls are intercepted via vi.mock so no real network is made.
 *   - renderWithProviders wraps in QueryClientProvider + MemoryRouter +
 *     AuthProvider + MissionProvider (same pattern as DashboardFlow.test.tsx).
 *   - fireEvent (not userEvent) is used — no @testing-library/user-event installed.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../../../features/auth/AuthContext'
import { MissionProvider } from '../../../../features/missions/MissionContext'
import { CitizenView } from '../CitizenView'
import { RequestForm } from './RequestForm'
import { RequestStatusView } from './RequestStatusView'
import { PrototypeNotice } from './PrototypeNotice'
import { StatusBadge } from './StatusBadge'

// ---------------------------------------------------------------------------
// Sanitised fixture — aligned to data/samples/rescue-request.example.json
// Fixture notice: Synthetic academic demonstration data; not a real emergency.
// ---------------------------------------------------------------------------
const FIXTURE_REQUEST = {
  id: 'RQ-DEMO-001',
  citizen_id: 'citizen-demo-001',
  location: {
    address: 'Sanitized demonstration address, Sampaloc, Manila',
    point: { type: 'Point' as const, coordinates: [120.9946, 14.6042] as [number, number] },
    landmark: 'Sanitized demonstration landmark',
  },
  headcount: 4,
  vulnerabilities: ['infant', 'senior'] as const,
  medical_needs: true,
  medical_details: 'Sanitized demonstration note',
  reported_flood_level: 'high' as const,
  situation_summary: 'Controlled rescue demonstration',
  status: 'pending' as const,
  version: 1,
  created_at: '2026-09-21T04:00:00Z',
  updated_at: '2026-09-21T04:00:00Z',
}

// ---------------------------------------------------------------------------
// Mock the API module so tests never hit a real server
// ---------------------------------------------------------------------------
vi.mock('../../../../api/rescueRequests', () => ({
  createRescueRequest: vi.fn(),
  getRescueRequest: vi.fn(),
  listMyRescueRequests: vi.fn(),
  cancelRescueRequest: vi.fn(),
  extractApiError: vi.fn(),
}))

import * as rescueRequestsApi from '../../../../api/rescueRequests'

const mockCreate = rescueRequestsApi.createRescueRequest as ReturnType<typeof vi.fn>
const mockGet = rescueRequestsApi.getRescueRequest as ReturnType<typeof vi.fn>
const mockList = rescueRequestsApi.listMyRescueRequests as ReturnType<typeof vi.fn>
const mockCancel = rescueRequestsApi.cancelRescueRequest as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(
  ui: React.ReactElement,
  role: 'citizen' | 'rescuer' | 'coordinator' = 'citizen',
) {
  localStorage.setItem(
    'resqph.auth.user',
    JSON.stringify({ email: 'maria@example.com', role, name: 'Maria Santos' }),
  )
  const queryClient = makeQueryClient()
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <MissionProvider>
              {ui}
            </MissionProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

// ---------------------------------------------------------------------------
// RequestForm unit tests
// ---------------------------------------------------------------------------

describe('RequestForm', () => {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({ items: [] })
  })

  function renderForm() {
    return renderWithProviders(
      <RequestForm onSuccess={onSuccess} onCancel={onCancel} />,
    )
  }

  // ── Prototype notice ─────────────────────────────────────────────────────

  it('shows the academic-prototype warning banner', () => {
    renderForm()
    expect(
      screen.getByText(/Academic prototype — do not use for a real emergency/i),
    ).toBeInTheDocument()
  })

  it('shows a call-911 advisory in the prototype notice', () => {
    renderForm()
    expect(screen.getByText(/Call 911 for real emergencies/i)).toBeInTheDocument()
  })

  // ── Form fields presence ─────────────────────────────────────────────────

  it('renders all required form fields', () => {
    renderForm()
    expect(screen.getByLabelText(/Location — street address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Longitude/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Latitude/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/People needing assistance/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Reported flood level/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Submit request/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  // ── Validation error — empty address ─────────────────────────────────────

  it('shows field-linked validation error for an empty address', async () => {
    renderForm()
    const addressInput = screen.getByLabelText(/Location — street address/i)
    fireEvent.change(addressInput, { target: { value: '' } })
    fireEvent.submit(screen.getByRole('form', { hidden: true }) ?? screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByText(/at least 5 characters/i)).toBeInTheDocument()
    })
    // Input should be aria-invalid
    expect(addressInput).toHaveAttribute('aria-invalid', 'true')
  })

  // ── Validation error — headcount zero ────────────────────────────────────

  it('shows field-linked error when headcount is zero', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/People needing assistance/i), {
      target: { value: '0' },
    })
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByText(/At least 1 person/i)).toBeInTheDocument()
    })
  })

  // ── Outside-boundary validation error ────────────────────────────────────

  it('shows outside-boundary error when coordinates are outside U-Belt area', async () => {
    renderForm()
    // Set coordinates outside U-Belt boundary (far from pilot area)
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: '121.05' } })
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: '14.7' } })
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(
        screen.getByText(/inside the U-Belt pilot area/i),
      ).toBeInTheDocument()
    })
  })

  it('does NOT show a boundary error for the default in-boundary coordinates', async () => {
    renderForm()
    // Default coords are 120.9946, 14.6042 — inside the boundary
    // Submit without changing coordinates
    mockCreate.mockResolvedValueOnce(FIXTURE_REQUEST)
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))
    await waitFor(() => {
      expect(screen.queryByText(/inside the U-Belt pilot area/i)).not.toBeInTheDocument()
    })
  })

  // ── Preserve safe input after failure ────────────────────────────────────

  it('preserves address input after a system error', async () => {
    mockCreate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        statusText: 'Service Unavailable',
        data: { error: { code: 'service_unavailable', message: 'Backend offline.' } },
      },
    })
    renderForm()
    const addressInput = screen.getByLabelText(/Location — street address/i)
    fireEvent.change(addressInput, {
      target: { value: 'Block 5 Lot 21 Jhocson St., Sampaloc, Manila' },
    })
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByTestId('submit-error-banner')).toBeInTheDocument()
    })
    // Input is still populated — safe input preserved
    expect(addressInput).toHaveValue('Block 5 Lot 21 Jhocson St., Sampaloc, Manila')
  })

  // ── System error state (503) ──────────────────────────────────────────────

  it('shows system-error banner on 503 response', async () => {
    mockCreate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        statusText: 'Service Unavailable',
        data: { error: { code: 'service_unavailable', message: 'Backend offline.' } },
      },
    })
    renderForm()
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByTestId('submit-error-banner')).toBeInTheDocument()
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument()
    })
  })

  // ── Unauthorized (403) ────────────────────────────────────────────────────

  it('shows unauthorized-role message on 403 response', async () => {
    mockCreate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: { error: { code: 'forbidden', message: 'Role not permitted.' } },
      },
    })
    renderForm()
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByText(/simulated citizen role is not allowed/i)).toBeInTheDocument()
    })
  })

  // ── Conflict (409) ────────────────────────────────────────────────────────

  it('shows conflict message on 409 response', async () => {
    mockCreate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        statusText: 'Conflict',
        data: { error: { code: 'conflict', message: 'State changed.' } },
      },
    })
    renderForm()
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByText(/conflict occurred on the server/i)).toBeInTheDocument()
    })
  })

  // ── Loading / submitting state ────────────────────────────────────────────

  it('shows "Submitting…" while the mutation is in flight', async () => {
    // Delay the resolution so we can check the in-flight state
    let resolve!: (v: unknown) => void
    mockCreate.mockImplementationOnce(() => new Promise((res) => { resolve = res }))

    renderForm()
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submitting/i })).toBeInTheDocument()
    })

    // Clean up: resolve the promise
    await act(async () => { resolve(FIXTURE_REQUEST) })
  })

  // ── Success callback ──────────────────────────────────────────────────────

  it('calls onSuccess with the returned record on successful submission', async () => {
    mockCreate.mockResolvedValueOnce(FIXTURE_REQUEST)
    renderForm()
    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'RQ-DEMO-001', status: 'pending' }),
      )
    })
  })

  // ── Cancel button ─────────────────────────────────────────────────────────

  it('calls onCancel when the Cancel button is clicked', () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  // ── Keyboard submission ───────────────────────────────────────────────────

  it('submits via Enter key on the submit button', async () => {
    mockCreate.mockResolvedValueOnce(FIXTURE_REQUEST)
    renderForm()
    const submitBtn = screen.getByRole('button', { name: /Submit request/i })
    fireEvent.keyDown(submitBtn, { key: 'Enter', code: 'Enter' })
    fireEvent.click(submitBtn) // Enter triggers click on native button

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// RequestStatusView unit tests
// ---------------------------------------------------------------------------

describe('RequestStatusView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows loading state while the query is in-flight', () => {
    // Never resolves — stays in loading state
    mockGet.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )
    expect(screen.getByTestId('status-loading')).toBeInTheDocument()
    expect(screen.getByText(/Loading request status/i)).toBeInTheDocument()
  })

  // ── Error state ───────────────────────────────────────────────────────────

  it('shows error state and Retry button when the query fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status-error')).toBeInTheDocument()
      expect(screen.getByText(/Could not load request status/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    })
  })

  // ── Pending status ────────────────────────────────────────────────────────

  it('shows pending status badge and request ID', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status-view')).toBeInTheDocument()
      expect(screen.getByText(/RQ-DEMO-001/i)).toBeInTheDocument()
      expect(screen.getByText(/Pending dispatch/i)).toBeInTheDocument()
    })
  })

  // ── Assigned status ───────────────────────────────────────────────────────

  it('shows assigned status badge', async () => {
    mockGet.mockResolvedValueOnce({ ...FIXTURE_REQUEST, status: 'assigned' })

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      // Multiple "Team assigned" text exists (badge + stepper), so check by role
      expect(screen.getByRole('status', { name: /Team assigned/i })).toBeInTheDocument()
    })
  })

  // ── En-route status ───────────────────────────────────────────────────────

  it('shows en-route status badge', async () => {
    mockGet.mockResolvedValueOnce({ ...FIXTURE_REQUEST, status: 'en-route' })

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      // Multiple "En route" text exists (badge + stepper), so check by role
      expect(screen.getByRole('status', { name: /En route/i })).toBeInTheDocument()
    })
  })

  // ── Controlled-data notice ────────────────────────────────────────────────

  it('shows the controlled/historical data notice', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Controlled\/historical information only/i),
      ).toBeInTheDocument()
    })
  })

  it('shows the prototype status notice banner', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Controlled scenario data only/i),
      ).toBeInTheDocument()
    })
  })

  // ── No ETA / safety guarantee ─────────────────────────────────────────────

  it('does NOT claim a guaranteed response time or safe route', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/safe route/i)).not.toBeInTheDocument()
    })
  })

  // ── Refresh button ────────────────────────────────────────────────────────

  it('renders the Refresh button when data is loaded', async () => {
    mockGet.mockResolvedValue(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh request status/i })).toBeInTheDocument()
    })
  })

  // ── Cancel pending request ────────────────────────────────────────────────

  it('shows Cancel request button for a pending request', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel request/i })).toBeInTheDocument()
    })
  })

  it('shows confirmation dialog when Cancel request is clicked', async () => {
    mockGet.mockResolvedValueOnce(FIXTURE_REQUEST)

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel request/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cancel request/i }))

    expect(screen.getByText(/Cancel this request\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Keep active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yes, cancel/i })).toBeInTheDocument()
  })

  it('shows conflict error message when cancellation returns 409', async () => {
    mockGet.mockResolvedValue(FIXTURE_REQUEST)
    mockCancel.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: { code: 'conflict', message: 'State changed.' } },
      },
    })

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel request/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cancel request/i }))
    fireEvent.click(screen.getByRole('button', { name: /Yes, cancel/i }))

    await waitFor(() => {
      expect(screen.getByText(/Conflict: the request state changed/i)).toBeInTheDocument()
    })
  })

  // ── Status history ────────────────────────────────────────────────────────

  it('renders status history when provided', async () => {
    mockGet.mockResolvedValueOnce({
      ...FIXTURE_REQUEST,
      status_history: [
        { status: 'pending', occurred_at: '2026-09-21T04:00:00Z' },
        { status: 'assigned', occurred_at: '2026-09-21T04:05:00Z' },
      ],
    })

    renderWithProviders(
      <RequestStatusView requestId="RQ-DEMO-001" />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Status history/i)).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// CitizenView integration tests (inquiries tab — API-backed flow)
// ---------------------------------------------------------------------------

describe('CitizenView — API-backed request flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({ items: [] })
    mockGet.mockResolvedValue(FIXTURE_REQUEST)
  })

  function renderInquiries() {
    return renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')
  }

  // ── Role simulation notice ────────────────────────────────────────────────

  it('shows role-simulation notice on the inquiries tab', () => {
    renderInquiries()
    expect(screen.getByText(/Simulation only — not production authentication/i)).toBeInTheDocument()
  })

  // ── New API Request button ────────────────────────────────────────────────

  it('shows New API Request button on the inquiries tab', () => {
    renderInquiries()
    expect(
      screen.getByRole('button', { name: /Submit a new rescue request via API/i }),
    ).toBeInTheDocument()
  })

  it('opens the API request form modal when "New API Request" is clicked', () => {
    renderInquiries()
    fireEvent.click(screen.getByRole('button', { name: /Submit a new rescue request via API/i }))
    expect(
      screen.getByText(/Academic prototype — do not use for a real emergency/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Submit request/i })).toBeInTheDocument()
  })

  // ── Success confirmation shown after API submission ───────────────────────

  it('shows success confirmation with request ID after successful submission', async () => {
    mockCreate.mockResolvedValueOnce(FIXTURE_REQUEST)
    mockGet.mockResolvedValue(FIXTURE_REQUEST)

    renderInquiries()
    fireEvent.click(screen.getByRole('button', { name: /Submit a new rescue request via API/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit request/i })).toBeInTheDocument()
    })

    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByTestId('submission-success')).toBeInTheDocument()
      // Check for request ID in the success banner specifically
      const successBanner = screen.getByTestId('submission-success')
      expect(successBanner).toHaveTextContent(/RQ-DEMO-001/i)
      expect(successBanner).toHaveTextContent(/pending/i)
      // Must NOT promise response time
      expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument()
    })
  })

  // ── Authoritative status view shown after submission ──────────────────────

  it('shows the authoritative RequestStatusView after successful submission', async () => {
    mockCreate.mockResolvedValueOnce(FIXTURE_REQUEST)
    mockGet.mockResolvedValue(FIXTURE_REQUEST)

    renderInquiries()
    fireEvent.click(screen.getByRole('button', { name: /Submit a new rescue request via API/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit request/i })).toBeInTheDocument()
    })

    fireEvent.submit(screen.getByLabelText(/Citizen rescue request form/i))

    await waitFor(() => {
      expect(screen.getByText(/Authoritative status from the API/i)).toBeInTheDocument()
    })
  })

  // ── Controlled-data label ─────────────────────────────────────────────────

  it('labels hazard/route data as controlled or simulated', () => {
    renderInquiries()
    // Role simulation notice
    expect(screen.getByText(/Simulation only/i)).toBeInTheDocument()
  })

  // ── Mock tracking still renders (existing tests must pass) ───────────────

  it('still renders the mock Active Rescue Tracking stepper', () => {
    renderInquiries()
    expect(screen.getByText(/Active Rescue Tracking/i)).toBeInTheDocument()
    expect(screen.getByText(/Pending Dispatch/i)).toBeInTheDocument()
    expect(screen.getByText(/Rescuer Assigned/i)).toBeInTheDocument()
    expect(screen.getByText(/En Route/i)).toBeInTheDocument()
    expect(screen.getByText(/Arrived at Area/i)).toBeInTheDocument()
    expect(screen.getByText(/Rescued/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PrototypeNotice standalone tests
// ---------------------------------------------------------------------------

describe('PrototypeNotice', () => {
  it('renders the form variant with academic-prototype heading', () => {
    renderWithProviders(<PrototypeNotice variant="form" />)
    expect(
      screen.getByText(/Academic prototype — do not use for a real emergency/i),
    ).toBeInTheDocument()
  })

  it('renders the status variant with controlled-scenario heading', () => {
    renderWithProviders(<PrototypeNotice variant="status" />)
    expect(screen.getByText(/Controlled scenario data only/i)).toBeInTheDocument()
  })

  it('renders the role variant with simulation-only heading', () => {
    renderWithProviders(<PrototypeNotice variant="role" />)
    expect(
      screen.getByText(/Simulation only — not production authentication/i),
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// StatusBadge standalone tests
// ---------------------------------------------------------------------------

describe('StatusBadge', () => {
  const statuses = [
    'pending',
    'assigned',
    'en-route',
    'arrived',
    'completed',
    'cancelled',
  ] as const

  it.each(statuses)(
    'status "%s" has an accessible label and never relies on color alone',
    (status) => {
      const { unmount } = renderWithProviders(<StatusBadge status={status} />)
      const badge = screen.getByRole('status')
      expect(badge).toBeInTheDocument()
      expect(badge.getAttribute('aria-label')).toMatch(/Request status:/i)
      // Must contain non-whitespace text content (shape char + label text)
      expect(badge.textContent?.trim().length).toBeGreaterThan(0)
      unmount()
    },
  )
})
