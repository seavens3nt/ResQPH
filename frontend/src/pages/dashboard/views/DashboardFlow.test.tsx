import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../../features/auth/AuthContext'
import { MissionProvider } from '../../../features/missions/MissionContext'
import { CitizenView } from './CitizenView'
import { RescuerView } from './RescuerView'
import { DashboardPage } from '../DashboardPage'

function renderWithProviders(ui: React.ReactElement, initialRole: 'citizen' | 'rescuer' | 'coordinator' = 'citizen') {
  // Pre-seed sessionStorage with authenticated user
  sessionStorage.setItem(
    'resqph.auth.user',
    JSON.stringify({
      email: 'maria@example.com',
      role: initialRole, teamId: 'team-alpha',
      name: 'Maria Santos',
    }),
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <MissionProvider>
            {ui}
          </MissionProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Citizen / Volunteer Dashboard Flows', () => {
  it('renders localized weather warning and primary rescue actions', () => {
    renderWithProviders(<CitizenView />, 'citizen')

    // 1. Weather and flood warning
    expect(screen.getByText(/Controlled Scenario: High tide & heavy rainfall/i)).toBeInTheDocument()
    expect(screen.getByText(/Heavy Rain Scenario/i)).toBeInTheDocument()

    // 2. Primary emergency actions
    expect(screen.getByRole('button', { name: /REQUEST EMERGENCY RESCUE/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Direct 911 Hotline/i })).toBeInTheDocument()
  })

  it('does NOT render the rescue-teams-deployed stat card (removed)', () => {
    renderWithProviders(<CitizenView />, 'citizen')
    // This stat card should no longer be present
    expect(screen.queryByText(/Rescue teams deployed/i)).not.toBeInTheDocument()
  })

  it('renders the API-only citizen dashboard and distinct navigation', () => {
    renderWithProviders(<DashboardPage />, 'citizen')
    expect(screen.getByText(/Citizen workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Request rescue'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'My Requests'})).toBeInTheDocument()
    expect(screen.queryByText('Maria Santos / RQ-0042')).not.toBeInTheDocument()
  })

  it('renders localized rainfall forecast widget', () => {
    renderWithProviders(<CitizenView />, 'citizen')
    expect(screen.getByText(/U-Belt Pilot Area/i)).toBeInTheDocument()
    expect(screen.getByText(/Controlled rainfall scenario · demonstration data/i)).toBeInTheDocument()
    expect(screen.getByText(/Hourly Intensity/i)).toBeInTheDocument()
  })

  it('renders emergency preparedness guide with 5 survival rules', () => {
    renderWithProviders(<CitizenView navSection="map" />, 'citizen')
    expect(screen.getByText(/What To Do During Severe Flooding/i)).toBeInTheDocument()
    expect(screen.getByText(/Move to Higher Ground/i)).toBeInTheDocument()
    expect(screen.getByText(/Shut Off Main Circuit Breaker/i)).toBeInTheDocument()
    expect(screen.getByText(/Signal Incoming Rescue Boats/i)).toBeInTheDocument()
    expect(screen.getByText(/Keep Distress Tracking Active/i)).toBeInTheDocument()
    expect(screen.getByText(/Avoid Floodwater Contamination/i)).toBeInTheDocument()
  })

  it('renders the controlled-scenario map without inventing a calculated route', () => {
    renderWithProviders(<CitizenView navSection="map" />, 'citizen')

    // The simplified map retains layers without the removed style selector.
    expect(screen.queryByText(/OpenStreetMap · U-Belt controlled scenario/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'OpenStreetMap' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tactical Dark' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Satellite View' })).not.toBeInTheDocument()

    // Verify OpenStreetMap container element
    expect(document.getElementById('google-rescue-map')).toBeInTheDocument()

    expect(screen.getByText(/No route has been calculated/i)).toBeInTheDocument()
    expect(screen.queryByText(/Safety Score/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/RECOMMENDED ROUTE/i)).not.toBeInTheDocument()
  })



  it('opens SOS flood triage and shows all 5 flood levels', () => {
    renderWithProviders(<CitizenView navSection="overview" />, 'citizen')

    fireEvent.click(screen.getByRole('button', { name: /REQUEST EMERGENCY RESCUE/i }))

    // Expect Step A Triage title
    expect(screen.getByText(/Step A — How severe is the flooding at your location\?/i)).toBeInTheDocument()

    // Verify all 5 severity tiers exist
    expect(screen.getByText('Ankle-deep (0.1–0.2m)')).toBeInTheDocument()
    expect(screen.getByText('Knee-deep (0.2–0.4m)')).toBeInTheDocument()
    expect(screen.getByText('Waist-deep (0.5–0.9m)')).toBeInTheDocument()
    expect(screen.getByText('Chest-deep (1.0–1.4m)')).toBeInTheDocument()
    expect(screen.getByText('Overhead / Fast Current (>1.5m)')).toBeInTheDocument()
  })

  it('carries high SOS flood severity into the API request form', () => {
    renderWithProviders(<CitizenView navSection="overview" />, 'citizen')

    fireEvent.click(screen.getByRole('button', { name: /REQUEST EMERGENCY RESCUE/i }))

    // Select High severity
    fireEvent.click(screen.getByText('Chest-deep (1.0–1.4m)'))
    fireEvent.click(screen.getByRole('button', { name: /Continue to request details/i }))
    expect(screen.getByRole('button', { name: /Submit request/i })).toBeInTheDocument()
    // Flood level pre-filled from triage — not shown again as an editable field
    expect(screen.getByLabelText(/Reported severity/i)).toBeInTheDocument()
  })

  it('does not present MissionContext mock state as a persisted citizen request', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    expect(screen.getByText(/Loading your rescue requests/i)).toBeInTheDocument()
    expect(screen.queryByText('Pending Dispatch')).not.toBeInTheDocument()
    expect(screen.queryByText('Rescuer Assigned')).not.toBeInTheDocument()
  })

  it('does not present mock mission copy as a calculated route', () => {
    renderWithProviders(<CitizenView navSection="map" />, 'citizen')

    expect(screen.getByText(/No route has been calculated/i)).toBeInTheDocument()
    expect(screen.queryByText(/SIMULATED EN ROUTE ADVISORY/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/All possible shortcuts are flooded/i)).not.toBeInTheDocument()
  })
})
describe('Field Rescuer Mobile Dashboard Flows', () => {
  it('renders target details panel, medical alerts, and flood severity status', () => {
    renderWithProviders(<RescuerView />, 'rescuer')

    // Target location and landmark
    expect(screen.getByText(/House & Location Description/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Block 5 Lot 21 Jhocson St/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Vulnerability Breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/HIGH PRIORITY MEDICAL ALERT/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Chest-deep/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders flood-aware route engine with avoided Loyola St and recommended Jhocson St', () => {
    renderWithProviders(<RescuerView />, 'rescuer')

    // Impassable warning
    expect(screen.getByText(/LOYOLA ST\. — IMPASSABLE/i)).toBeInTheDocument()
    expect(screen.getAllByText(/RECOMMENDED ROUTE/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Jhocson St\. Recommended Corridor/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Gerardo St\. Detour/i)).toBeInTheDocument()
  })

  it('shows active prototype en route status advisory on rescuer view', () => {
    renderWithProviders(<RescuerView />, 'rescuer')

    expect(screen.getByText(/ACTIVE EN ROUTE STATUS ADVISORY/i)).toBeInTheDocument()
    expect(screen.getByText(/Prototype status shared across role views/i)).toBeInTheDocument()
    // The default route delay explanation should appear
    expect(screen.getAllByText(/All possible shortcuts are flooded/i).length).toBeGreaterThanOrEqual(1)
  })
})
describe('Dashboard Prototype Controls', () => {
  it('does not offer a role switch inside a workspace', () => {
    renderWithProviders(<DashboardPage />, 'citizen')
    expect(screen.getByText(/Citizen workspace/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: /Switch portal/i})).not.toBeInTheDocument()
  })
})
