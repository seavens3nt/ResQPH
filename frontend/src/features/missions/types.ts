export type SeverityLevel = 'low' | 'low-moderate' | 'moderate' | 'high' | 'severe'

export type FloodDepth = 'ankle' | 'knee' | 'waist' | 'chest' | 'overhead'

export type RequestStatus = 'pending' | 'assigned' | 'en-route' | 'arrived' | 'completed' | 'cancelled'

export type MissionStatus = 'assigned' | 'en-route' | 'arrived' | 'completed' | 'cancelled'

export interface Vulnerabilities {
  infant: boolean
  senior: boolean
  pwd: boolean
  pregnant: boolean
}

export interface LocationDetail {
  address: string
  coordinates: [number, number] // [lng, lat] GeoJSON convention
  landmark?: string
  houseDescription?: string
}

export interface RouteOption {
  name: string
  estimatedMinutes: number
  floodRisk: 'Low' | 'Moderate' | 'High'
  waterDepth: string
  elevation: string
  safetyScore: number
  explanation: string
}

export interface ImpassableRoad {
  name: string
  reason: string
  waterDepth: string
  threshold: string
}

export interface MissionStatusUpdate {
  id: string
  time: string
  message: string
  author: string
  type: 'reroute' | 'dispatch' | 'system'
}

export interface RescueRequest {
  id: string
  citizenName: string
  citizenPhone: string
  severity: SeverityLevel
  branchTaken: 1 | 2 | 3
  location: LocationDetail
  headcount: number
  vulnerabilities: Vulnerabilities
  medicalNeeds: boolean
  medicalDetails?: string
  floodDepth: string
  photoUrl?: string
  status: RequestStatus
  assignedTeamId?: string
  assignedTeamName?: string
  hasMedicalUnit?: boolean
  rescuerCount?: number
  submittedAt: string
  eta?: string
  isAutoPulledProfile?: boolean
}

export interface RescueTeam {
  id: string
  name: string
  unitType: 'Rubber Boat' | 'High-Clearance Truck' | 'Amphibious Unit'
  membersCount: number
  hasMedicalUnit: boolean
  status: 'available' | 'assigned' | 'en-route' | 'on-scene'
  contactPhone: string
  leadRescuer: string
}

export interface RescueMission {
  id: string
  requestId: string
  teamId: string
  status: MissionStatus
  suggestedRoute: {
    primary: RouteOption
    alternative: RouteOption
    impassable: ImpassableRoad
  }
  activeRouteName: string
  isManualOverride: boolean
  overrideReason?: string
  routeDelayExplanation: string
  etaMinutes: number
  liveStatusUpdates: MissionStatusUpdate[]
  startedAt?: string
  arrivedAt?: string
  completedAt?: string
  rescuerNotes?: string
}

export interface HazardReport {
  id: string
  reporterName: string
  locationName: string
  coordinates: [number, number]
  hazardType: 'Impassable Flood' | 'Blocked Road' | 'Submerged Obstacle' | 'Live Electrical Wire'
  severity: SeverityLevel
  floodDepth: string
  photoUrl?: string
  reportedAt: string
  verifiedByDispatch: boolean
}

export interface IncidentReport {
  id: string
  missionId: string
  requestId: string
  teamName: string
  outcome: 'Successful' | 'Partially Completed' | 'Rerouted' | 'Evacuated to Shelter'
  evacuatedCount: number
  casualtiesCount: number
  delaysOrComplications: string
  operationalNotes: string
  futureSuggestions: string
  documentedAt: string
  dispatcherName: string
}

export interface ForecastHour {
  time: string
  rainfallRate: number // mm/hr
  condition: string
  floodRisk: 'Low' | 'Moderate' | 'High' | 'Severe'
  windSpeedKmh: number
}

export interface WaterLevelStation {
  name: string
  currentLevel: number
  alertLevel: number
  criticalLevel: number
  status: 'Normal' | 'Alert' | 'Alarm' | 'Critical'
  trend: 'Rising' | 'Steady' | 'Falling'
}

// ---------------------------------------------------------------------------
// API snake_case type aliases (real backend responses, per API_CONTRACT.md)
// Used by api/assignments.ts and api/missions.ts; kept here for shared reference.
// ---------------------------------------------------------------------------

export type ApiRequestStatus = RequestStatus
export type ApiMissionStatus = MissionStatus
