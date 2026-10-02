import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../../features/auth/AuthContext'
import { MissionProvider } from '../../../features/missions/MissionContext'
import {
  DEFAULT_ALTERNATIVE_ROUTE,
  DEFAULT_IMPASSABLE_ROAD,
  DEFAULT_PRIMARY_ROUTE,
  INITIAL_REQUESTS,
  INITIAL_TEAMS,
} from '../../../features/missions/mockData'
import type { RescueMission } from '../../../features/missions/types'
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
    expect(screen.queryByRole('button', { name: /Direct 911 Hotline/i })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: /Direct 911 Hotline/i })).not.toBeInTheDocument()

    // The redundant service-type panel is not shown on the overview.
    expect(screen.queryByText(/Request Assistance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/4 Service Types/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Flood Rescue')).not.toBeInTheDocument()
    expect(screen.queryByText('Evacuation')).not.toBeInTheDocument()
    expect(screen.queryByText('Medical Aid')).not.toBeInTheDocument()
    expect(screen.queryByText('Relief Goods')).not.toBeInTheDocument()

    // Controlled responder fixtures must not present operational ETAs.
    expect(screen.getByText(/Simulated Responders/i)).toBeInTheDocument()
    expect(screen.getByText(/Rescue Team Alpha/i)).toBeInTheDocument()
    expect(screen.getAllByText(/No live ETA/i)).toHaveLength(2)
    expect(screen.queryByText(/ETA 6 min/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Rescue Boat 4/i)).toBeInTheDocument()
    expect(screen.queryByText(/ETA 11 min/i)).not.toBeInTheDocument()

    // Controlled-scenario notices
    expect(screen.getByText(/Scenario Notices/i)).toBeInTheDocument()
    expect(screen.getByText(/Controlled flood scenario active/i)).toBeInTheDocument()
    expect(screen.getByText(/Heavy-rain demonstration condition/i)).toBeInTheDocument()
    expect(screen.getByText(/Evacuation center at 70% capacity/i)).toBeInTheDocument()

    // Portal navigation
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Tracking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Team Location' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hazard Map' })).not.toBeInTheDocument()
  })

  it('describes the citizen map as a simulated rescue team location view', () => {
    renderWithProviders(<DashboardPage />, 'citizen')
    fireEvent.click(screen.getByRole('button', { name: 'Rescue Team Location' }))

    expect(document.querySelector('.header-page-title')).toHaveTextContent('Rescue Team Location')
    expect(screen.getByText(/Sample team position and route relative to the sanitized target; not live GPS tracking/i)).toBeInTheDocument()
  })

  it('renders localized rainfall forecast widget', () => {
    renderWithProviders(<DashboardPage />, 'citizen')
    expect(screen.getByText(/U-Belt Pilot Area/i)).toBeInTheDocument()
    expect(screen.getByText(/Controlled rainfall scenario · demonstration data/i)).toBeInTheDocument()
    expect(screen.getByText(/Hourly Intensity/i)).toBeInTheDocument()
    expect(screen.getByText(/H=31°/i)).toBeInTheDocument()
    expect(screen.getByText(/P=90%/i)).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Tactical Dark' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satellite View' })).toBeInTheDocument()

    // Verify OpenStreetMap container element
    expect(document.getElementById('openmap-hazard-map')).toBeInTheDocument()

    // Verify controlled-scenario rationale drawer
    expect(screen.getByText(/Controlled-Scenario Routing Rationale/i)).toBeInTheDocument()
    expect(screen.getByText(/AVOIDED SHORTCUT/i)).toBeInTheDocument()
    expect(screen.getAllByText(/RECOMMENDED ROUTE/i).length).toBeGreaterThanOrEqual(1)
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
    expect(screen.queryByLabelText(/Reported flood level/i)).not.toBeInTheDocument()
  })

  it('does not present MissionContext mock state as a persisted citizen request', () => {
    renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')

    expect(screen.getByText(/Loading your rescue requests/i)).toBeInTheDocument()
    expect(screen.queryByText('Pending Dispatch')).not.toBeInTheDocument()
    expect(screen.queryByText('Rescuer Assigned')).not.toBeInTheDocument()
  })

  it('shows the simulated route delay explanation only in the controlled map view', () => {
    renderWithProviders(<CitizenView navSection="map" />, 'citizen')

    // The default mission is en-route, so the advisory card should be visible
    expect(screen.getByText(/SIMULATED EN ROUTE ADVISORY/i)).toBeInTheDocument()
    // The controlled map retains the route explanation after the mock tracking panel is disabled.
    expect(screen.getAllByText(/All possible shortcuts are flooded/i).length).toBeGreaterThanOrEqual(1)
  })
})
describe('Field Rescuer Mobile Dashboard Flows', () => {
  it('keeps a large open-mission queue compact until expanded', () => {
    const missions: RescueMission[] = Array.from({ length: 5 }, (_, index) => ({
      id: `MSN-QUEUE-${index + 1}`,
      requestId: index === 0 ? 'RQ-0042' : `RQ-OPEN-${index + 1}`,
      teamId: 'team-alpha',
      status: index === 0 ? 'en-route' : 'assigned',
      suggestedRoute: {
        primary: DEFAULT_PRIMARY_ROUTE,
        alternative: DEFAULT_ALTERNATIVE_ROUTE,
        impassable: DEFAULT_IMPASSABLE_ROAD,
      },
      activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
      isManualOverride: false,
      routeDelayExplanation: 'Controlled scenario test mission.',
      etaMinutes: 9,
      liveStatusUpdates: [],
      startedAt: index === 0 ? 'Just now' : undefined,
    }))
    localStorage.setItem('resqph.state.v2.missions', JSON.stringify(missions))
    localStorage.setItem('resqph.state.v2.requests', JSON.stringify(INITIAL_REQUESTS))
    localStorage.setItem('resqph.state.v2.teams', JSON.stringify(INITIAL_TEAMS))

    const { container } = renderWithProviders(<DashboardPage />, 'rescuer')
    const missionList = container.querySelector('.rescuer-open-mission-list')

    expect(missionList?.querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Show all 5 missions' })).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Show all 5 missions' }))

    expect(missionList?.querySelectorAll('li')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Show fewer missions' })).toHaveAttribute('aria-expanded', 'true')
    localStorage.removeItem('resqph.state.v2.missions')
    localStorage.removeItem('resqph.state.v2.requests')
    localStorage.removeItem('resqph.state.v2.teams')
  })

  it('keeps mission, target, and combined navigation in separate console tabs', () => {
    renderWithProviders(<DashboardPage />, 'rescuer')

    expect(screen.getByRole('button', { name: 'Assigned Team & Progress' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Target Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flood-Aware Navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Records' })).toBeInTheDocument()
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Assigned Team & Progress')
    expect(screen.getAllByRole('heading', { name: 'Assigned Team & Progress' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Routes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument()
    expect(screen.getByText(/4 responders/i)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Mission progress' })).toBeInTheDocument()
    expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Open Missions' })).toBeInTheDocument()
    expect(screen.getByText('MSN-0042')).toBeInTheDocument()
    expect(screen.queryByText('Mission Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Estimated Transit')).not.toBeInTheDocument()
    expect(screen.queryByText('Target Flood Depth')).not.toBeInTheDocument()
    expect(screen.queryByText('Evacuees Count')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Emergency Hotlines/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/CONTROLLED FLOOD SCENARIO/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/House & Location Description/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rescue Target Details' }))
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Rescue Target Details')
    expect(screen.getByText(/House & Location Description/i)).toBeInTheDocument()
    expect(screen.queryByText(/Flood-Aware Navigation & Rerouting Engine/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Flood-Aware Navigation' }))
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Flood-Aware Navigation')
    expect(screen.getByText(/Flood-Aware Navigation & Rerouting Engine/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Interactive Realistic Flood-Aware Rescue Map' })).toBeInTheDocument()
    expect(screen.queryByText(/SIMULATED EN ROUTE ADVISORY/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Controlled-Scenario Routing Rationale/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/House & Location Description/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rescue Records' }))
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Rescue Records')
    expect(screen.getAllByRole('heading', { name: 'Rescue Records' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Field Reports' })).toBeInTheDocument()
    expect(screen.getByText('MSN-0038')).toBeInTheDocument()
    expect(screen.getByText('RQ-0040')).toBeInTheDocument()
    expect(screen.getByText('Capt. R. Santos, Team Alpha')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Field Notes')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Completed Tickets' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Successful/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/Flood-Aware Navigation & Rerouting Engine/i)).not.toBeInTheDocument()
  })

  it('renders target details panel, medical alerts, and flood severity status', () => {
    renderWithProviders(<RescuerView navSection="inquiries" />, 'rescuer')

    // Target location and landmark
    expect(screen.getByText(/House & Location Description/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Block 5 Lot 21 Jhocson St/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Vulnerability Breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/HIGH PRIORITY MEDICAL ALERT/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Chest-deep/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders flood-aware route engine with avoided Loyola St and recommended Jhocson St', () => {
    renderWithProviders(<RescuerView navSection="missions" />, 'rescuer')

    // Impassable warning
    expect(screen.getByText(/LOYOLA ST\. — IMPASSABLE/i)).toBeInTheDocument()
    expect(screen.getAllByText(/RECOMMENDED ROUTE/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Jhocson St\. Recommended Corridor/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Gerardo St\. Detour/i)).toBeInTheDocument()

    const recommendedRoute = screen.getByRole('button', { name: /Select recommended route/i })
    const alternativeRoute = screen.getByRole('button', { name: /Select alternative route/i })
    expect(recommendedRoute).toHaveAttribute('aria-pressed', 'true')
    expect(alternativeRoute).toHaveAttribute('aria-pressed', 'false')
    fireEvent.keyDown(alternativeRoute, { key: 'Enter' })
    expect(alternativeRoute).toHaveAttribute('aria-pressed', 'true')
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
  it('separates dispatcher overview, requests, responses, teams, map, and records tabs', () => {
    renderWithProviders(<DashboardPage />, 'coordinator')

    for (const tab of [
      'Dispatch Overview',
      'Rescue Request Queue',
      'Active Responses',
      'Rescue Fleet Status',
      'Hazard Map & Route Oversight',
      'Incident Reports',
    ]) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: 'Dispatch Overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active Responses' })).toBeInTheDocument()
    expect(screen.queryByText(/Citizen Rescue Inquiries/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rescue Request Queue' }))
    expect(screen.getByRole('heading', { name: 'Rescue Request Queue' })).toBeInTheDocument()
    expect(screen.getByText(/Citizen Rescue Inquiries/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Active Responses' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rescue Fleet Status' }))
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Rescue Fleet Status')
    expect(screen.getAllByRole('heading', { name: 'Rescue Fleet Status' }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Citizen Rescue Inquiries/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Incident Reports' }))
    expect(document.querySelector('.header-page-title')).toHaveTextContent('Incident Reports')
    expect(screen.getByRole('heading', { name: 'Completed Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Field Reports' })).toBeInTheDocument()
  })

  it('shows the selected operation details with the hazard map on the dispatcher map tab', () => {
    renderWithProviders(<DashboardPage />, 'coordinator')
    fireEvent.click(screen.getByRole('button', { name: 'Hazard Map & Route Oversight' }))

    expect(document.querySelector('.header-page-title')).toHaveTextContent('Hazard Map & Route Oversight')
    expect(screen.getByRole('heading', { name: 'Citizen Rescue Operation Route' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Select active rescue operation' })).toBeInTheDocument()
    expect(screen.getByText('SELECTED DISPATCH')).toBeInTheDocument()
    expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    expect(screen.getByText(/Jhocson St\. Recommended Corridor/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Interactive Realistic Flood-Aware Rescue Map' })).toBeInTheDocument()
  })

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
  it('renders the citizen portal without volunteer controls or prototype header suffix', () => {
    renderWithProviders(<DashboardPage />, 'citizen')

    expect(screen.getByText('Citizen Distress Portal')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'ResQPH Logo' })).toHaveAttribute('src', '/logo.png')
    expect(document.querySelector('.brand-title')).toHaveTextContent('ResQPH')
    expect(document.querySelector('.brand-title__p')).toHaveTextContent('P')
    expect(document.querySelector('.brand-title__h')).toHaveTextContent('H')
    expect(screen.queryByText(/U-Belt Pilot · Academic Prototype/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Volunteer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Switch portal/i })).not.toBeInTheDocument()
    expect(document.querySelector('.header-center')).not.toBeInTheDocument()
  })
})
