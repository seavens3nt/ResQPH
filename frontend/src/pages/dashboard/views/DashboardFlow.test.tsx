import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../../features/auth/AuthContext'
import { MissionProvider } from '../../../features/missions/MissionContext'
import { CitizenView } from './CitizenView'
import { RescuerView } from './RescuerView'
import { CoordinatorView } from './CoordinatorView'
import { DashboardPage } from '../DashboardPage'

function renderWithProviders(ui: React.ReactElement, initialRole: 'citizen' | 'rescuer' | 'coordinator' = 'citizen') {
  // Pre-seed localStorage with authenticated user
  localStorage.setItem(
    'resqph.auth.user',
    JSON.stringify({
      email: 'maria@example.com',
      role: initialRole,
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

  it('renders the redesigned citizen dashboard sections', () => {
    renderWithProviders(<DashboardPage />, 'citizen')

    // Header & Role
    expect(screen.getByText('Logged in as')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()

    // Sanitized U-Belt demonstration location
    expect(screen.getByText(/Sanitized address, Jhocson St\., U-Belt pilot/i)).toBeInTheDocument()
    expect(screen.getByText(/14\.6042 N · 120\.9946 E/i)).toBeInTheDocument()
    expect(screen.getByText(/Demo Location/i)).toBeInTheDocument()

    // Emergency actions
    expect(screen.getByRole('button', { name: /REQUEST EMERGENCY RESCUE/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Direct 911 Hotline/i })).toBeInTheDocument()

    // 4 Services
    expect(screen.getByText(/Request Assistance/i)).toBeInTheDocument()
    expect(screen.getByText(/4 Services Available/i)).toBeInTheDocument()
    expect(screen.getByText('Flood Rescue')).toBeInTheDocument()
    expect(screen.getByText('Evacuation')).toBeInTheDocument()
    expect(screen.getByText('Medical Aid')).toBeInTheDocument()
    expect(screen.getByText('Relief Goods')).toBeInTheDocument()

    // Nearest Responders
    expect(screen.getByText(/Nearest Responders/i)).toBeInTheDocument()
    expect(screen.getByText(/Rescue Team Alpha/i)).toBeInTheDocument()
    expect(screen.getByText(/ETA 6 min/i)).toBeInTheDocument()
    expect(screen.getByText(/Coast Guard Boat 4/i)).toBeInTheDocument()
    expect(screen.getByText(/ETA 11 min/i)).toBeInTheDocument()

    // Controlled-scenario notices
    expect(screen.getByText(/Scenario Notices/i)).toBeInTheDocument()
    expect(screen.getByText(/Controlled flood scenario active/i)).toBeInTheDocument()
    expect(screen.getByText(/Heavy-rain demonstration condition/i)).toBeInTheDocument()
    expect(screen.getByText(/Evacuation center at 70% capacity/i)).toBeInTheDocument()

    // Portal navigation
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inquiries' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hazard Map' })).toBeInTheDocument()
  })

  it('renders localized rainfall forecast widget', () => {
    renderWithProviders(<DashboardPage />, 'citizen')
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

  it('renders OpenStreetMap controlled-scenario map and routing rationale', () => {
    renderWithProviders(<CitizenView navSection="map" />, 'citizen')

    // Verify OpenStreetMap HUD indicator and layer buttons
    expect(screen.getByText(/OpenStreetMap · U-Belt controlled scenario/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OpenStreetMap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tactical Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satellite View' })).toBeInTheDocument()

    // Verify OpenStreetMap container element
    expect(document.getElementById('openmap-hazard-map')).toBeInTheDocument()

    // Verify controlled-scenario rationale drawer
    expect(screen.getByText(/Controlled-Scenario Routing Rationale/i)).toBeInTheDocument()
    expect(screen.getByText(/AVOIDED SHORTCUT/i)).toBeInTheDocument()
    expect(screen.getAllByText(/RECOMMENDED ROUTE/i).length).toBeGreaterThanOrEqual(1)
  })



  it('opens severity-adaptive form and shows Step A triage with all 5 flood levels', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    // Tap request emergency rescue
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

  it('activates Branch 3 fast-track mode for High/Severe severity with auto-pulled profile', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    fireEvent.click(screen.getByRole('button', { name: /REQUEST EMERGENCY RESCUE/i }))

    // Select High severity
    fireEvent.click(screen.getByText('Chest-deep (1.0–1.4m)'))
    fireEvent.click(screen.getByRole('button', { name: /Continue to Step B/i }))

    // Verify Fast-Track emergency banner appears
    expect(screen.getByText(/FAST-TRACK EMERGENCY RESCUE ACTIVATED/i)).toBeInTheDocument()
    expect(screen.getByText(/Auto-Attached Citizen Profile Data/i)).toBeInTheDocument()
    expect(screen.getByText(/4 persons \(1 Infant, 1 Senior Citizen\)/i)).toBeInTheDocument()

    // Verify single-step location input and fast submit
    expect(screen.getByRole('button', { name: /SUBMIT EMERGENCY RESCUE REQUEST/i })).toBeInTheDocument()
  })

  it('renders 5-stage prototype request tracking sequence when request is active', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    // Tracking title
    expect(screen.getByText(/Active Rescue Tracking/i)).toBeInTheDocument()
    expect(screen.getByText('Pending Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Rescuer Assigned')).toBeInTheDocument()
    expect(screen.getByText('En Route')).toBeInTheDocument()
    expect(screen.getByText('Arrived at Area')).toBeInTheDocument()
    expect(screen.getByText('Rescued')).toBeInTheDocument()
  })

  it('shows simulated route delay explanation card in En Route stage', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    // The default mission is en-route, so the advisory card should be visible
    expect(screen.getByText(/SIMULATED ROUTE & DELAY ADVISORY/i)).toBeInTheDocument()
    // The default route explanation message appears in both the advisory card and map telemetry banner
    expect(screen.getAllByText(/All possible shortcuts are flooded/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Prototype Status Log/i)).toBeInTheDocument()
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
describe('Dispatcher / Coordinator Dashboard Flows', () => {
  it('renders incoming rescue inquiry queue and situation inspector', () => {
    renderWithProviders(<CoordinatorView navSection="inquiries" />, 'coordinator')

    expect(screen.getByText(/Citizen Rescue Inquiries/i)).toBeInTheDocument()
    expect(screen.getByText(/Inquiry Detail Inspector/i)).toBeInTheDocument()
  })

  it('has restricted manual route override with legal liability notice', () => {
    renderWithProviders(<CoordinatorView navSection="missions" />, 'coordinator')

    // Click Manual Override
    const overrideButtons = screen.getAllByRole('button', { name: /Manual Override/i })
    expect(overrideButtons.length).toBeGreaterThan(0)
    fireEvent.click(overrideButtons[0])

    // Verify restricted liability modal appears
    expect(screen.getByText(/LEGAL & SAFETY LIABILITY NOTICE/i)).toBeInTheDocument()
    expect(screen.getByText(/Mandatory Dispatch Justification/i)).toBeInTheDocument()
  })

  it('shows simulated route delay message tool in missions tab', () => {
    renderWithProviders(<CoordinatorView navSection="missions" />, 'coordinator')

    expect(screen.getByText(/Simulated Route Delay/i)).toBeInTheDocument()
    expect(screen.getByText(/Push Route Advisory to All Screens/i)).toBeInTheDocument()
    // Quick preset buttons
    expect(screen.getByText(/Loyola impassable/i)).toBeInTheDocument()
  })
})


describe('Dashboard Prototype Controls', () => {
  it('renders current portal view and provides portal switcher', () => {
    renderWithProviders(<DashboardPage />, 'citizen')

    expect(screen.getByText(/Citizen Distress & Volunteer Portal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch portal/i })).toBeInTheDocument()
  })
})
