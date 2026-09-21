import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ForecastHour,
  HazardReport,
  IncidentReport,
  MissionStatus,
  RequestStatus,
  RescueMission,
  RescueRequest,
  RescueTeam,
  WaterLevelStation,
} from './types'
import {
  DEFAULT_ALTERNATIVE_ROUTE,
  DEFAULT_FORECAST_HOURLY,
  DEFAULT_IMPASSABLE_ROAD,
  DEFAULT_PRIMARY_ROUTE,
  DEFAULT_WATER_STATIONS,
  INITIAL_HAZARD_REPORTS,
  INITIAL_INCIDENT_REPORTS,
  INITIAL_MISSION_UPDATES,
  INITIAL_REQUESTS,
  INITIAL_TEAMS,
} from './mockData'

interface MissionContextValue {
  requests: RescueRequest[]
  teams: RescueTeam[]
  missions: RescueMission[]
  hazardReports: HazardReport[]
  incidentReports: IncidentReport[]
  hourlyForecast: ForecastHour[]
  waterStations: WaterLevelStation[]
  isOffline: boolean
  pendingSyncCount: number
  toggleOffline: () => void
  createRescueRequest: (req: Omit<RescueRequest, 'id' | 'status' | 'submittedAt'>) => RescueRequest
  updateRequestStatus: (id: string, status: RequestStatus) => void
  cancelRescueRequest: (id: string) => void
  assignMission: (
    requestId: string,
    teamId: string,
    rescuerCount: number,
    hasMedicalUnit: boolean,
  ) => RescueMission
  updateMissionStatus: (missionId: string, status: MissionStatus, notes?: string) => void
  overrideRoute: (missionId: string, routeName: string, reason: string) => void
  updateRouteDelayExplanation: (
    missionId: string,
    etaMinutes: number,
    explanation: string,
    author?: string,
  ) => void
  addMissionStatusUpdate: (
    missionId: string,
    message: string,
    author?: string,
    type?: 'reroute' | 'dispatch' | 'system',
  ) => void
  submitHazardReport: (
    report: Omit<HazardReport, 'id' | 'reportedAt' | 'verifiedByDispatch'>,
  ) => HazardReport
  submitIncidentReport: (report: Omit<IncidentReport, 'id' | 'documentedAt'>) => IncidentReport
  activeRescuerMission: RescueMission | null
  activeCitizenRequest: RescueRequest | null
  resetToInitialData: () => void
}

const STORAGE_PREFIX = 'resqph.state.v2.'

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val))
  } catch {
    // Storage full or unavailable
  }
}

const INITIAL_DEFAULT_MISSIONS: RescueMission[] = [
  {
    id: 'MSN-0042',
    requestId: 'RQ-0042',
    teamId: 'team-alpha',
    status: 'en-route',
    suggestedRoute: {
      primary: DEFAULT_PRIMARY_ROUTE,
      alternative: DEFAULT_ALTERNATIVE_ROUTE,
      impassable: DEFAULT_IMPASSABLE_ROAD,
    },
    activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
    isManualOverride: false,
    routeDelayExplanation:
      'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes "Loyola St.".',
    etaMinutes: 9,
    liveStatusUpdates: INITIAL_MISSION_UPDATES,
    startedAt: '12 min ago',
  },
]

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<RescueRequest[]>(() =>
    readStorage<RescueRequest[]>('requests', INITIAL_REQUESTS),
  )
  const [teams, setTeams] = useState<RescueTeam[]>(() =>
    readStorage<RescueTeam[]>('teams', INITIAL_TEAMS),
  )
  const [missions, setMissions] = useState<RescueMission[]>(() =>
    readStorage<RescueMission[]>('missions', INITIAL_DEFAULT_MISSIONS),
  )
  const [hazardReports, setHazardReports] = useState<HazardReport[]>(() =>
    readStorage<HazardReport[]>('hazards', INITIAL_HAZARD_REPORTS),
  )
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>(() =>
    readStorage<IncidentReport[]>('incidents', INITIAL_INCIDENT_REPORTS),
  )
  const [hourlyForecast] = useState<ForecastHour[]>(DEFAULT_FORECAST_HOURLY)
  const [waterStations] = useState<WaterLevelStation[]>(DEFAULT_WATER_STATIONS)
  const [isOffline, setIsOffline] = useState<boolean>(false)
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0)

  // Persist state updates
  useEffect(() => writeStorage('requests', requests), [requests])
  useEffect(() => writeStorage('teams', teams), [teams])
  useEffect(() => writeStorage('missions', missions), [missions])
  useEffect(() => writeStorage('hazards', hazardReports), [hazardReports])
  useEffect(() => writeStorage('incidents', incidentReports), [incidentReports])

  const toggleOffline = useCallback(() => {
    setIsOffline((prev) => {
      const next = !prev
      if (!next) {
        setPendingSyncCount(0)
      }
      return next
    })
  }, [])

  const resetToInitialData = useCallback(() => {
    setRequests(INITIAL_REQUESTS)
    setTeams(INITIAL_TEAMS)
    setMissions(INITIAL_DEFAULT_MISSIONS)
    setHazardReports(INITIAL_HAZARD_REPORTS)
    setIncidentReports(INITIAL_INCIDENT_REPORTS)
    setPendingSyncCount(0)
  }, [])

  const createRescueRequest = useCallback(
    (input: Omit<RescueRequest, 'id' | 'status' | 'submittedAt'>): RescueRequest => {
      const newId = `RQ-00${requests.length + 43}`
      const newReq: RescueRequest = {
        ...input,
        id: newId,
        status: 'pending',
        submittedAt: 'Just now',
      }
      setRequests((prev) => [newReq, ...prev])
      if (isOffline) {
        setPendingSyncCount((c) => c + 1)
      }
      return newReq
    },
    [requests.length, isOffline],
  )

  const updateRequestStatus = useCallback(
    (id: string, status: RequestStatus) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      )
      if (isOffline) setPendingSyncCount((c) => c + 1)
    },
    [isOffline],
  )

  const cancelRescueRequest = useCallback(
    (id: string) => {
      setRequests((prev) =>
        prev.map((request) =>
          request.id === id ? { ...request, status: 'cancelled' } : request,
        ),
      )
      if (isOffline) setPendingSyncCount((count) => count + 1)
    },
    [isOffline],
  )

  const assignMission = useCallback(
    (
      requestId: string,
      teamId: string,
      rescuerCount: number,
      hasMedicalUnit: boolean,
    ): RescueMission => {
      const team = teams.find((t) => t.id === teamId)
      const teamName = team?.name ?? 'Assigned Rescue Unit'
      const newMissionId = `MSN-00${missions.length + 43}`

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      const newMission: RescueMission = {
        id: newMissionId,
        requestId,
        teamId,
        status: 'assigned',
        suggestedRoute: {
          primary: DEFAULT_PRIMARY_ROUTE,
          alternative: DEFAULT_ALTERNATIVE_ROUTE,
          impassable: DEFAULT_IMPASSABLE_ROAD,
        },
        activeRouteName: DEFAULT_PRIMARY_ROUTE.name,
        isManualOverride: false,
        routeDelayExplanation:
          'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes "Loyola St.".',
        etaMinutes: 9,
        liveStatusUpdates: [
          {
            id: `upd-${Date.now()}`,
            time: nowTime,
            author: 'Central Dispatch',
            message: `Dispatched ${teamName} (${rescuerCount} Rescuers${hasMedicalUnit ? ' + Medical Unit' : ''}) to target.`,
            type: 'dispatch',
          },
          {
            id: `upd-${Date.now() + 1}`,
            time: nowTime,
            author: 'Route Engine',
            message: 'Loyola St. is impassable in the controlled scenario. Using the recommended eligible corridor.',
            type: 'reroute',
          },
        ],
      }

      setMissions((prev) => [newMission, ...prev.filter((m) => m.requestId !== requestId)])

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: 'assigned',
                assignedTeamId: teamId,
                assignedTeamName: teamName,
                hasMedicalUnit,
                rescuerCount,
                eta: `${newMission.etaMinutes} mins (via Jhocson St)`,
              }
            : r,
        ),
      )

      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, status: 'assigned' } : t,
        ),
      )

      if (isOffline) setPendingSyncCount((c) => c + 1)
      return newMission
    },
    [missions.length, teams, isOffline],
  )

  const updateMissionStatus = useCallback(
    (missionId: string, status: MissionStatus, notes?: string) => {
      let linkedRequestId = ''

      setMissions((prev) =>
        prev.map((m) => {
          if (m.id === missionId) {
            linkedRequestId = m.requestId
            const updated: RescueMission = { ...m, status }
            if (status === 'en-route') updated.startedAt = 'Just now'
            if (status === 'arrived') updated.arrivedAt = 'Just now'
            if (status === 'completed') updated.completedAt = 'Just now'
            if (notes) updated.rescuerNotes = notes
            return updated
          }
          return m
        }),
      )

      const mappedRequestStatus: RequestStatus =
        status === 'en-route'
          ? 'en-route'
          : status === 'arrived'
            ? 'arrived'
            : status === 'completed'
              ? 'completed'
              : 'assigned'

      if (linkedRequestId) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === linkedRequestId ? { ...r, status: mappedRequestStatus } : r,
          ),
        )
      }

      if (status === 'completed') {
        const mis = missions.find((m) => m.id === missionId)
        if (mis) {
          setTeams((prev) =>
            prev.map((t) =>
              t.id === mis.teamId ? { ...t, status: 'available' } : t,
            ),
          )
        }
      }

      if (isOffline) setPendingSyncCount((c) => c + 1)
    },
    [missions, isOffline],
  )

  // Shared prototype route-advisory state for the role views
  const updateRouteDelayExplanation = useCallback(
    (missionId: string, etaMinutes: number, explanation: string, author: string = 'Central Dispatch') => {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      let linkedReqId = ''

      setMissions((prev) =>
        prev.map((m) => {
          if (m.id === missionId) {
            linkedReqId = m.requestId
            return {
              ...m,
              etaMinutes,
              routeDelayExplanation: explanation,
              liveStatusUpdates: [
                {
                  id: `upd-${Date.now()}`,
                  time: nowTime,
                  author,
                  message: explanation,
                  type: 'reroute',
                },
                ...m.liveStatusUpdates,
              ],
            }
          }
          return m
        }),
      )

      if (linkedReqId) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === linkedReqId
              ? { ...r, eta: `${etaMinutes} mins (Rerouted)` }
              : r,
          ),
        )
      }

      if (isOffline) setPendingSyncCount((c) => c + 1)
    },
    [isOffline],
  )

  const addMissionStatusUpdate = useCallback(
    (
      missionId: string,
      message: string,
      author: string = 'Central Dispatch',
      type: 'reroute' | 'dispatch' | 'system' = 'dispatch',
    ) => {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMissions((prev) =>
        prev.map((m) => {
          if (m.id === missionId) {
            return {
              ...m,
              liveStatusUpdates: [
                {
                  id: `upd-${Date.now()}`,
                  time: nowTime,
                  author,
                  message,
                  type,
                },
                ...m.liveStatusUpdates,
              ],
            }
          }
          return m
        }),
      )
      if (isOffline) setPendingSyncCount((c) => c + 1)
    },
    [isOffline],
  )

  const overrideRoute = useCallback(
    (missionId: string, routeName: string, reason: string) => {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId
            ? {
                ...m,
                activeRouteName: routeName,
                isManualOverride: true,
                overrideReason: reason,
              }
            : m,
        ),
      )
      if (isOffline) setPendingSyncCount((c) => c + 1)
    },
    [isOffline],
  )

  const submitHazardReport = useCallback(
    (report: Omit<HazardReport, 'id' | 'reportedAt' | 'verifiedByDispatch'>): HazardReport => {
      const newReport: HazardReport = {
        ...report,
        id: `HZ-${hazardReports.length + 103}`,
        reportedAt: 'Just now',
        verifiedByDispatch: true,
      }
      setHazardReports((prev) => [newReport, ...prev])
      if (isOffline) setPendingSyncCount((c) => c + 1)
      return newReport
    },
    [hazardReports.length, isOffline],
  )

  const submitIncidentReport = useCallback(
    (report: Omit<IncidentReport, 'id' | 'documentedAt'>): IncidentReport => {
      const newInc: IncidentReport = {
        ...report,
        id: `INC-2026-00${incidentReports.length + 2}`,
        documentedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setIncidentReports((prev) => [newInc, ...prev])
      if (isOffline) setPendingSyncCount((c) => c + 1)
      return newInc
    },
    [incidentReports.length, isOffline],
  )

  const activeRescuerMission = useMemo(() => {
    return missions.find((m) => m.status !== 'completed') || missions[0] || null
  }, [missions])

  const activeCitizenRequest = useMemo(() => {
    const activeStatuses: RequestStatus[] = ['pending', 'assigned', 'en-route', 'arrived']
    return (
      requests.find((request) => request.id === 'RQ-0042' && activeStatuses.includes(request.status)) ||
      requests.find((request) => activeStatuses.includes(request.status)) ||
      null
    )
  }, [requests])

  const value = useMemo(
    () => ({
      requests,
      teams,
      missions,
      hazardReports,
      incidentReports,
      hourlyForecast,
      waterStations,
      isOffline,
      pendingSyncCount,
      toggleOffline,
      createRescueRequest,
      updateRequestStatus,
      cancelRescueRequest,
      assignMission,
      updateMissionStatus,
      overrideRoute,
      updateRouteDelayExplanation,
      addMissionStatusUpdate,
      submitHazardReport,
      submitIncidentReport,
      activeRescuerMission,
      activeCitizenRequest,
      resetToInitialData,
    }),
    [
      requests,
      teams,
      missions,
      hazardReports,
      incidentReports,
      hourlyForecast,
      waterStations,
      isOffline,
      pendingSyncCount,
      toggleOffline,
      createRescueRequest,
      updateRequestStatus,
      cancelRescueRequest,
      assignMission,
      updateMissionStatus,
      overrideRoute,
      updateRouteDelayExplanation,
      addMissionStatusUpdate,
      submitHazardReport,
      submitIncidentReport,
      activeRescuerMission,
      activeCitizenRequest,
      resetToInitialData,
    ],
  )

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
}

export function useMissions(): MissionContextValue {
  const ctx = useContext(MissionContext)
  if (!ctx) {
    throw new Error('useMissions must be used within a MissionProvider')
  }
  return ctx
}
