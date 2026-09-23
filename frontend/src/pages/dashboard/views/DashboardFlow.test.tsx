import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../../features/auth/AuthContext'
import { useAuth } from '../../../features/auth/AuthContext'
import { MissionProvider } from '../../../features/missions/MissionContext'
import {
  DEFAULT_ALTERNATIVE_ROUTE,
  DEFAULT_IMPASSABLE_ROAD,
  DEFAULT_PRIMARY_ROUTE,
  INITIAL_REQUESTS,
  INITIAL_TEAMS,
} from '../../../features/missions/mockData'
import { CitizenView } from './CitizenView'
import { RescuerView } from './RescuerView'
import { CoordinatorView } from './CoordinatorView'
import { DashboardPage } from '../DashboardPage'

const TEST_RESCUERS = [
  { email: 'rescuer.one@example.test', name: 'Rescuer One', role: 'rescuer' as const, phone: '09XX XXX XXXX' },
  { email: 'rescuer.two@example.test', name: 'Rescuer Two', role: 'rescuer' as const, phone: '09XX XXX XXXX' },
]
const TEST_TEAM_MEMBERS = TEST_RESCUERS.map(({ email, name, phone }) => ({ email, name, phone }))

function RescuerDirectoryProbe() {
  const { login, registeredRescuers } = useAuth()
  return (
    <div>
      <button onClick={() => login({ email: 'signed.in@example.test', role: 'rescuer', name: 'Signed In Rescuer' })}>
        Sign in as rescuer
      </button>
      <output>{registeredRescuers.map((person) => person.name).join(', ')}</output>
    </div>
  )
}

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

describe('Citizen Dashboard Flows', () => {
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

    // The assistance cards are informational, while SOS remains the request action.
    expect(screen.getByText(/Request Assistance/i)).toBeInTheDocument()
    expect(screen.getByText(/4 Service Types/i)).toBeInTheDocument()
    expect(screen.getByText('Flood Rescue')).toBeInTheDocument()
    expect(screen.getByText('Evacuation')).toBeInTheDocument()
    expect(screen.getByText('Medical Aid')).toBeInTheDocument()
    expect(screen.getByText('Relief Goods')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Flood Rescue/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Evacuation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Medical Aid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Relief Goods/i })).not.toBeInTheDocument()

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
    expect(screen.queryByLabelText(/Reported flood level/i)).not.toBeInTheDocument()
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
    expect(screen.queryByRole('link', { name: /Call assigned team/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Contact: No leader contact assigned/i)).toBeInTheDocument()
    expect(screen.getByText(/Simulated team contact for this prototype/i)).toBeInTheDocument()
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
    renderWithProviders(<RescuerView navSection="inquiries" />, 'rescuer')

    // Target location and landmark
    expect(screen.getByText(/House & Location Description/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Block 5 Lot 21 Jhocson St/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Vulnerability Breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/HIGH PRIORITY MEDICAL ALERT/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Chest-deep/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders flood-aware route engine with avoided Loyola St and recommended Jhocson St', () => {
    renderWithProviders(<RescuerView navSection="map" />, 'rescuer')

    // Impassable warning
    expect(screen.getByText(/LOYOLA ST\. — IMPASSABLE/i)).toBeInTheDocument()
    expect(screen.getAllByText(/RECOMMENDED ROUTE/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Jhocson St\. Recommended Corridor/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Gerardo St\. Detour/i)).toBeInTheDocument()
  })

  it('shows different rescuer features when sidebar tabs are selected', () => {
    renderWithProviders(<DashboardPage />, 'rescuer')

    expect(screen.getByRole('heading', { name: /Team Assignment/i })).toBeInTheDocument()
    expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    expect(screen.getByText(/No rescuers are attached to this saved sample mission yet/i)).toBeInTheDocument()
    expect(screen.getByText(/Assigned colleagues · prototype roster/i)).toBeInTheDocument()
    expect(screen.getByText(/ACTIVE EN ROUTE STATUS ADVISORY/i)).toBeInTheDocument()
    expect(screen.queryByText(/HIGH PRIORITY MEDICAL ALERT AT TARGET/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Assigned Mission/i }))
    expect(screen.getByText(/HIGH PRIORITY MEDICAL ALERT AT TARGET/i)).toBeInTheDocument()
    expect(screen.getByText('Mission Status')).toBeInTheDocument()
    expect(screen.getByText('Estimated Transit')).toBeInTheDocument()
    expect(screen.queryByText(/HAZARD DETECTED · ROAD EXCLUDED/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Route & Hazards/i }))
    expect(screen.getByText(/HAZARD DETECTED · ROAD EXCLUDED/i)).toBeInTheDocument()
    expect(screen.queryByText(/HIGH PRIORITY MEDICAL ALERT AT TARGET/i)).not.toBeInTheDocument()
  })

  it('marks a newly dispatched mission in the team assignment view', () => {
    const missionsKey = 'resqph.state.v2.missions'
    const savedMissions = localStorage.getItem(missionsKey)
    localStorage.setItem(missionsKey, JSON.stringify([{
      id: 'MSN-NEW-0043',
      requestId: 'RQ-0042',
      teamId: 'team-bravo',
      status: 'assigned',
      suggestedRoute: {
        primary: DEFAULT_PRIMARY_ROUTE,
        alternative: DEFAULT_ALTERNATIVE_ROUTE,
        impassable: DEFAULT_IMPASSABLE_ROAD,
      },
      activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
      isManualOverride: false,
      routeDelayExplanation: 'Controlled prototype route update.',
      etaMinutes: 9,
      liveStatusUpdates: [],
    }]))

    try {
      renderWithProviders(<RescuerView navSection="overview" />, 'rescuer')
      expect(screen.getByText(/New assignment received/i)).toBeInTheDocument()
      expect(screen.getByText('New assignment')).toBeInTheDocument()
      expect(screen.getAllByText(/MSN-NEW-0043/).length).toBeGreaterThanOrEqual(1)
    } finally {
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })

  it('shows completed missions in history and requires confirmation before deletion', () => {
    const missionsKey = 'resqph.state.v2.missions'
    const savedMissions = localStorage.getItem(missionsKey)
    localStorage.setItem(missionsKey, JSON.stringify([{
      id: 'MSN-HISTORY-1',
      requestId: 'RQ-0042',
      teamId: 'team-alpha',
      status: 'completed',
      suggestedRoute: {
        primary: DEFAULT_PRIMARY_ROUTE,
        alternative: DEFAULT_ALTERNATIVE_ROUTE,
        impassable: DEFAULT_IMPASSABLE_ROAD,
      },
      activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
      isManualOverride: false,
      routeDelayExplanation: 'Controlled prototype route update.',
      etaMinutes: 9,
      liveStatusUpdates: [],
      completedAt: 'Today',
      rescuerNotes: 'Four people transferred in this demo scenario.',
    }]))

    try {
      renderWithProviders(<DashboardPage />, 'rescuer')
      fireEvent.click(screen.getByRole('button', { name: /Mission History/i }))
      expect(screen.getByRole('heading', { name: 'MSN-HISTORY-1' })).toBeInTheDocument()
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.getByText(/Four people transferred in this demo scenario/i)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Delete completed mission MSN-HISTORY-1/i }))
      expect(screen.getByRole('dialog', { name: /Delete completed mission/i })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Delete mission record/i }))

      expect(screen.getByText(/No completed missions yet/i)).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'MSN-HISTORY-1' })).not.toBeInTheDocument()
    } finally {
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })

  it('shows active prototype en route status advisory on rescuer view', () => {
    renderWithProviders(<RescuerView />, 'rescuer')

    expect(screen.getByText(/ACTIVE EN ROUTE STATUS ADVISORY/i)).toBeInTheDocument()
    expect(screen.getByText(/Prototype status shared across role views/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Join this mission as an on-scene responder/i })).not.toBeInTheDocument()
    // The default route delay explanation should appear
    expect(screen.getAllByText(/All possible shortcuts are flooded/i).length).toBeGreaterThanOrEqual(1)
  })

  it('lets a signed-in rescuer join the mission roster after arrival is recorded', () => {
    const missionsKey = 'resqph.state.v2.missions'
    const teamsKey = 'resqph.state.v2.teams'
    const savedMissions = localStorage.getItem(missionsKey)
    const savedTeams = localStorage.getItem(teamsKey)
    localStorage.setItem(teamsKey, JSON.stringify(INITIAL_TEAMS.map((team) => ({ ...team, crewMembers: [] }))))
    localStorage.setItem(missionsKey, JSON.stringify([{
      id: 'MSN-ON-SCENE-1',
      requestId: 'RQ-0042',
      teamId: 'team-alpha',
      status: 'arrived',
      suggestedRoute: {
        primary: DEFAULT_PRIMARY_ROUTE,
        alternative: DEFAULT_ALTERNATIVE_ROUTE,
        impassable: DEFAULT_IMPASSABLE_ROAD,
      },
      activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
      isManualOverride: false,
      routeDelayExplanation: 'Controlled prototype route update.',
      etaMinutes: 9,
      liveStatusUpdates: [],
      assignedCrewMembers: [],
    }]))

    try {
      renderWithProviders(<RescuerView navSection="overview" />, 'rescuer')
      fireEvent.click(screen.getByRole('button', { name: /Join this mission as an on-scene responder/i }))
      expect(screen.getByText(/You are listed on this mission as an on-scene responder/i)).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    } finally {
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
      if (savedTeams === null) localStorage.removeItem(teamsKey)
      else localStorage.setItem(teamsKey, savedTeams)
    }
  })

  it('shows a structured completion dialog and validates the evacuee count', () => {
    renderWithProviders(<RescuerView />, 'rescuer')

    fireEvent.click(screen.getByRole('button', { name: /TAP ARRIVED AT AREA/i }))
    const completeButton = screen.getByRole('button', { name: /Complete rescue/i })
    expect(completeButton).toHaveClass('btn', 'btn--primary', 'btn--lg', 'btn-danger-emergency')
    fireEvent.click(completeButton)

    expect(screen.getByRole('dialog', { name: /Confirm Rescue Completion/i })).toBeInTheDocument()
    expect(screen.getByText(/Mission MSN-0042/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirmed evacuees/i)).toHaveValue(4)

    fireEvent.change(screen.getByLabelText(/Confirmed evacuees/i), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirm rescued/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/from 1 to 4/i)
    expect(screen.getByRole('dialog', { name: /Confirm Rescue Completion/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Confirmed evacuees/i), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirm rescued/i }))
    expect(screen.queryByRole('dialog', { name: /Confirm Rescue Completion/i })).not.toBeInTheDocument()
  })
})
describe('Dispatcher / Coordinator Dashboard Flows', () => {
  it('keeps dispatch overview separate from the inquiry queue', () => {
    renderWithProviders(<CoordinatorView navSection="overview" />, 'coordinator')

    expect(screen.getByText(/Pending Dispatch/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Priority Requests/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Active Responses/i })).toBeInTheDocument()
    expect(screen.queryByText(/Citizen Rescue Inquiries/i)).not.toBeInTheDocument()
  })

  it('exposes dispatcher-specific navigation for queues, missions, teams, and reports', () => {
    renderWithProviders(<DashboardPage />, 'coordinator')

    expect(screen.getByText('Dispatcher')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dispatch Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Queue' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Active Missions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rescue Teams' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incident Reports' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hazard Map' })).toBeInTheDocument()
  })

  it('repairs stale saved team data and derives availability from active missions', () => {
    const teamsKey = 'resqph.state.v2.teams'
    const missionsKey = 'resqph.state.v2.missions'
    const savedTeams = localStorage.getItem(teamsKey)
    const savedMissions = localStorage.getItem(missionsKey)
    const staleTeams = INITIAL_TEAMS.map((team) => ({
      ...team,
      status: 'assigned' as const,
      contactPhone: '+63 918 123 4567',
      leadRescuer: 'Legacy fake leader',
      crewMembers: ['Legacy fake rescuer'],
    }))
    localStorage.setItem(teamsKey, JSON.stringify(staleTeams))
    localStorage.removeItem(missionsKey)

    try {
      renderWithProviders(<CoordinatorView navSection="teams" />, 'coordinator')

      expect(within(screen.getByLabelText(/Staffed available team & vehicle/i)).queryByRole('option', { name: /Team Bravo.*High-Clearance Truck/ })).not.toBeInTheDocument()
      expect(screen.getByText(/No available team has logged-in rescuers assigned yet/)).toBeInTheDocument()
      expect(screen.getAllByText(/No logged-in rescuers assigned yet/).length).toBe(3)
      expect(screen.queryByText('Legacy fake leader')).not.toBeInTheDocument()
      expect(screen.queryByText(/09XX XXX XXXX/)).not.toBeInTheDocument()
      expect(screen.queryByText('+63 918 123 4567')).not.toBeInTheDocument()
    } finally {
      if (savedTeams === null) localStorage.removeItem(teamsKey)
      else localStorage.setItem(teamsKey, savedTeams)
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })

  it('lets the dispatcher add rescuers who have signed in to a team roster', () => {
    const rescuersKey = 'resqph.auth.rescuers'
    const teamsKey = 'resqph.state.v2.teams'
    const savedRescuers = localStorage.getItem(rescuersKey)
    const savedTeams = localStorage.getItem(teamsKey)
    localStorage.setItem(rescuersKey, JSON.stringify(TEST_RESCUERS))

    try {
      const view = renderWithProviders(<CoordinatorView navSection="teams" />, 'coordinator')
      const rescuerSelect = screen.getByLabelText(/Logged-in rescuer/i)

      fireEvent.change(rescuerSelect, { target: { value: TEST_RESCUERS[0].email } })
      fireEvent.click(screen.getByRole('button', { name: /Add rescuer to team/i }))
      const alphaMembership = within(screen.getByRole('region', { name: 'Team Alpha membership' }))
      expect(alphaMembership.getByText('Rescuer One')).toBeInTheDocument()

      fireEvent.change(rescuerSelect, { target: { value: TEST_RESCUERS[1].email } })
      fireEvent.click(screen.getByRole('button', { name: /Add rescuer to team/i }))
      expect(alphaMembership.getByText('Rescuer Two')).toBeInTheDocument()
      expect(alphaMembership.getByText('rescuer.one@example.test')).toBeInTheDocument()
      expect(alphaMembership.getByText('rescuer.two@example.test')).toBeInTheDocument()
      view.unmount()
    } finally {
      if (savedRescuers === null) localStorage.removeItem(rescuersKey)
      else localStorage.setItem(rescuersKey, savedRescuers)
      if (savedTeams === null) localStorage.removeItem(teamsKey)
      else localStorage.setItem(teamsKey, savedTeams)
    }
  })

  it('adds a rescuer to the local directory when that account signs in', () => {
    render(
      <AuthProvider>
        <RescuerDirectoryProbe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Sign in as rescuer/i }))

    expect(screen.getByText('Signed In Rescuer')).toBeInTheDocument()
    expect(localStorage.getItem('resqph.auth.rescuers')).toContain('signed.in@example.test')
  })

  it('shows the selected citizen rescue operation on the hazard map tab', () => {
    renderWithProviders(<CoordinatorView navSection="map" />, 'coordinator')

    expect(screen.getByLabelText(/Active rescue operation/i)).toBeInTheDocument()
    expect(screen.getAllByText(/MSN-0042/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/RQ-0042/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Assigned team/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Jhocson St\. Recommended Corridor$/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Flood-Aware Rescue Map/i })).toBeInTheDocument()
  })

  it('renders incoming rescue inquiry queue and situation inspector', () => {
    renderWithProviders(<CoordinatorView navSection="inquiries" />, 'coordinator')

    expect(screen.getByText(/Citizen Rescue Inquiries/i)).toBeInTheDocument()
    expect(screen.getByText(/Inquiry Detail Inspector/i)).toBeInTheDocument()
  })

  it('shows only unassigned requests in the Rescue Queue', () => {
    const requestsKey = 'resqph.state.v2.requests'
    const missionsKey = 'resqph.state.v2.missions'
    const savedRequests = localStorage.getItem(requestsKey)
    const savedMissions = localStorage.getItem(missionsKey)
    const [assigned, unassigned, ...rest] = INITIAL_REQUESTS
    localStorage.setItem(requestsKey, JSON.stringify([
      { ...assigned, status: 'pending', assignedTeamId: 'team-alpha' },
      { ...unassigned, status: 'pending', assignedTeamId: undefined },
      ...rest.map((request) => ({ ...request, status: 'completed' })),
    ]))
    localStorage.setItem(missionsKey, '[]')

    try {
      renderWithProviders(<CoordinatorView navSection="inquiries" />, 'coordinator')
      expect(screen.queryByText(assigned.id)).not.toBeInTheDocument()
      expect(screen.getByText(unassigned.id)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: `${unassigned.id} — ${unassigned.citizenName}` })).toBeInTheDocument()
    } finally {
      if (savedRequests === null) localStorage.removeItem(requestsKey)
      else localStorage.setItem(requestsKey, savedRequests)
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })

  it('shows the available deployment selected from the Rescue Teams workflow', () => {
    const requestsKey = 'resqph.state.v2.requests'
    const teamsKey = 'resqph.state.v2.teams'
    const missionsKey = 'resqph.state.v2.missions'
    const rescuersKey = 'resqph.auth.rescuers'
    const savedRequests = localStorage.getItem(requestsKey)
    const savedTeams = localStorage.getItem(teamsKey)
    const savedMissions = localStorage.getItem(missionsKey)
    const savedRescuers = localStorage.getItem(rescuersKey)
    const pendingRequests = INITIAL_REQUESTS.map((request) =>
      request.id === 'RQ-0042' ? { ...request, status: 'pending' as const, assignedTeamId: undefined } : request,
    )
    localStorage.setItem(requestsKey, JSON.stringify(pendingRequests))
    localStorage.setItem(missionsKey, '[]')
    localStorage.setItem(teamsKey, JSON.stringify(INITIAL_TEAMS.map((team) => team.id === 'team-alpha'
      ? { ...team, status: 'assigned' as const }
      : team.id === 'team-bravo' ? { ...team, crewMembers: TEST_TEAM_MEMBERS } : team,
    )))
    localStorage.setItem(rescuersKey, JSON.stringify(TEST_RESCUERS))

    try {
      const view = renderWithProviders(<CoordinatorView navSection="inquiries" />, 'coordinator')

      fireEvent.click(screen.getAllByRole('button', { name: /^Assign$/i })[0])
      expect(screen.getByRole('dialog', { name: /Assign Rescue Team & Personnel/i })).toBeInTheDocument()
      expect(screen.getAllByText(/Citizen rescue request/i).length).toBeGreaterThan(0)
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      expect(screen.getAllByText(/Team Bravo.*High-Clearance Truck/).length).toBeGreaterThan(0)
      expect(screen.getByText(/Leader: Rescuer One/)).toBeInTheDocument()
      expect(screen.getAllByText(/Rescuer Two/).length).toBeGreaterThan(0)
      expect(screen.getByRole('checkbox', { name: /Attach medical unit \/ paramedic/i })).toBeInTheDocument()
      view.unmount()
    } finally {
      if (savedRequests === null) localStorage.removeItem(requestsKey)
      else localStorage.setItem(requestsKey, savedRequests)
      if (savedTeams === null) localStorage.removeItem(teamsKey)
      else localStorage.setItem(teamsKey, savedTeams)
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
      if (savedRescuers === null) localStorage.removeItem(rescuersKey)
      else localStorage.setItem(rescuersKey, savedRescuers)
    }
  })

  it('selects a pending request and available team group with vehicle on Rescue Teams', () => {
    const requestsKey = 'resqph.state.v2.requests'
    const teamsKey = 'resqph.state.v2.teams'
    const missionsKey = 'resqph.state.v2.missions'
    const rescuersKey = 'resqph.auth.rescuers'
    const savedRequests = localStorage.getItem(requestsKey)
    const savedTeams = localStorage.getItem(teamsKey)
    const savedMissions = localStorage.getItem(missionsKey)
    const savedRescuers = localStorage.getItem(rescuersKey)
    localStorage.setItem(requestsKey, JSON.stringify(INITIAL_REQUESTS.map((request) =>
      request.id === 'RQ-0042' ? { ...request, status: 'pending' as const, assignedTeamId: undefined } : request,
    )))
    localStorage.setItem(missionsKey, '[]')
    localStorage.setItem(teamsKey, JSON.stringify(INITIAL_TEAMS.map((team) => team.id === 'team-alpha'
      ? { ...team, status: 'assigned' as const }
      : team.id === 'team-bravo' ? { ...team, crewMembers: TEST_TEAM_MEMBERS } : team,
    )))
    localStorage.setItem(rescuersKey, JSON.stringify(TEST_RESCUERS))

    try {
      const view = renderWithProviders(<CoordinatorView navSection="teams" />, 'coordinator')
      fireEvent.change(screen.getByLabelText(/Citizen rescue request/i), { target: { value: 'RQ-0042' } })
      fireEvent.change(screen.getByLabelText(/Staffed available team & vehicle/i), { target: { value: 'team-bravo' } })
      expect(screen.getByRole('button', { name: /Review dispatch assignment/i })).toBeDisabled()
      fireEvent.click(screen.getByRole('checkbox', { name: 'Rescuer One' }))
      fireEvent.click(screen.getByRole('checkbox', { name: 'Rescuer Two' }))
      fireEvent.change(screen.getByLabelText(/Assign team leader/i), { target: { value: TEST_RESCUERS[0].email } })
      expect(screen.getAllByText(/Team Bravo/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/High-Clearance Truck/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Rescuer One/).length).toBeGreaterThan(0)
      fireEvent.click(screen.getByRole('button', { name: /Review dispatch assignment/i }))
      expect(screen.getByRole('dialog', { name: /Assign Rescue Team & Personnel/i })).toBeInTheDocument()
      expect(screen.getAllByText(/Team Bravo.*High-Clearance Truck/).length).toBeGreaterThan(0)
      expect(screen.getByText(/Leader: Rescuer One/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Confirm Dispatch Assignment/i }))
      view.unmount()

      renderWithProviders(<CitizenView navSection="inquiries" />, 'citizen')
      expect(screen.getByText(/Team leader: Rescuer One/)).toBeInTheDocument()
      expect(screen.getByText(/Contact: 09XX XXX XXXX/)).toBeInTheDocument()
      expect(screen.getByText(/Calling unavailable in simulation/)).toBeInTheDocument()
    } finally {
      if (savedRequests === null) localStorage.removeItem(requestsKey)
      else localStorage.setItem(requestsKey, savedRequests)
      if (savedTeams === null) localStorage.removeItem(teamsKey)
      else localStorage.setItem(teamsKey, savedTeams)
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
      if (savedRescuers === null) localStorage.removeItem(rescuersKey)
      else localStorage.setItem(rescuersKey, savedRescuers)
    }
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

    expect(screen.getByRole('heading', { name: 'Citizen Portal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Switch portal/i })).not.toBeInTheDocument()
  })

  it('uses rescuer-specific sidebar names', () => {
    renderWithProviders(<DashboardPage />, 'rescuer')

    expect(screen.getByRole('button', { name: /Team Assignment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Assigned Mission/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Route & Hazards/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mission History/i })).toBeInTheDocument()
  })

  it('clearly reports when there is no active mission assignment', () => {
    const missionsKey = 'resqph.state.v2.missions'
    const savedMissions = localStorage.getItem(missionsKey)
    localStorage.setItem(missionsKey, '[]')

    try {
      renderWithProviders(<RescuerView navSection="overview" />, 'rescuer')
      expect(screen.getByText(/No active mission is assigned to this unit/i)).toBeInTheDocument()
    } finally {
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })

  it('shows different empty content for each rescuer tab when there is no assignment', () => {
    const missionsKey = 'resqph.state.v2.missions'
    const savedMissions = localStorage.getItem(missionsKey)
    localStorage.setItem(missionsKey, '[]')

    try {
      const overview = renderWithProviders(<RescuerView navSection="overview" />, 'rescuer')
      expect(screen.getByText(/No active mission is assigned to this unit/i)).toBeInTheDocument()
      expect(screen.queryByText(/Eligible Scenario Roads/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Scenario Flood Level/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/No route is active/i)).not.toBeInTheDocument()
      overview.unmount()

      const inquiries = renderWithProviders(<RescuerView navSection="inquiries" />, 'rescuer')
      expect(screen.getByText(/No request details to show/i)).toBeInTheDocument()
      expect(screen.queryByText(/Available for dispatch/i)).not.toBeInTheDocument()
      inquiries.unmount()

      renderWithProviders(<RescuerView navSection="map" />, 'rescuer')
      expect(screen.getByText(/No route is active/i)).toBeInTheDocument()
      expect(screen.queryByText(/No request details to show/i)).not.toBeInTheDocument()
    } finally {
      if (savedMissions === null) localStorage.removeItem(missionsKey)
      else localStorage.setItem(missionsKey, savedMissions)
    }
  })
})
