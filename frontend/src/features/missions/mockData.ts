import type {
  ForecastHour,
  HazardReport,
  IncidentReport,
  RescueRequest,
  RescueTeam,
  RouteOption,
  ImpassableRoad,
  WaterLevelStation,
  MissionStatusUpdate,
} from './types'

export const SAVED_CITIZEN_PROFILE = {
  name: 'Maria Santos',
  phone: '+63 917 555 4321',
  address: 'Block 5 Lot 21 Jhocson St., Sampaloc, Manila',
  coordinates: [120.9946, 14.6042] as [number, number],
  landmark: 'Near National University Gate 2, beside green sari-sari store',
  houseDescription: '2-storey concrete house with blue iron gate; family assembled on 2nd floor terrace',
  headcount: 4,
  vulnerabilities: {
    infant: true,
    senior: true,
    pwd: false,
    pregnant: false,
  },
  medicalNeeds: true,
  medicalDetails: 'Senior citizen requires bronchial asthma nebulizer and hypertension maintenance medications.',
}

export const INITIAL_TEAMS: RescueTeam[] = [
  {
    id: 'team-alpha',
    name: 'Team Alpha',
    unitType: 'Rubber Boat',
    membersCount: 4,
    hasMedicalUnit: true,
    status: 'available',
    contactPhone: '+63 918 123 4567',
    leadRescuer: 'Capt. R. Santos',
  },
  {
    id: 'team-bravo',
    name: 'Team Bravo',
    unitType: 'High-Clearance Truck',
    membersCount: 3,
    hasMedicalUnit: false,
    status: 'available',
    contactPhone: '+63 918 234 5678',
    leadRescuer: 'Sgt. M. Dizon',
  },
  {
    id: 'team-charlie',
    name: 'Team Charlie',
    unitType: 'Amphibious Unit',
    membersCount: 2,
    hasMedicalUnit: true,
    status: 'available',
    contactPhone: '+63 918 345 6789',
    leadRescuer: 'Lt. C. Valenzuela',
  },
]

export const DEFAULT_PRIMARY_ROUTE: RouteOption = {
  name: 'Jhocson St. Recommended Corridor',
  estimatedMinutes: 9,
  floodRisk: 'Low',
  waterDepth: '0.12 m (Ankle)',
  elevation: '4.2 m',
  safetyScore: 94,
  explanation: 'Lowest eligible rule-based cost in the controlled scenario. No impassable edge is included.',
}

export const DEFAULT_ALTERNATIVE_ROUTE: RouteOption = {
  name: 'Gerardo St. Detour',
  estimatedMinutes: 12,
  floodRisk: 'Moderate',
  waterDepth: '0.26 m (Knee)',
  elevation: '3.5 m',
  safetyScore: 82,
  explanation: 'Passable with cautious navigation speed. Water depth within craft safety margin.',
}

export const DEFAULT_IMPASSABLE_ROAD: ImpassableRoad = {
  name: 'Loyola St.',
  reason: 'Critical flood depth exceeds safe rescue craft & vehicle limit',
  waterDepth: '1.40 m (Chest-deep)',
  threshold: '0.30 m maximum safe vehicle threshold',
}

export const INITIAL_MISSION_UPDATES: MissionStatusUpdate[] = [
  {
    id: 'upd-1',
    time: '10:15 AM',
    author: 'Central Dispatch',
    message: 'Mission MSN-0042 dispatched to Team Alpha (Rubber Boat craft).',
    type: 'dispatch',
  },
  {
    id: 'upd-2',
    time: '10:22 AM',
    author: 'Rule-Based Routing Engine',
    message: 'Direct shortcut via Loyola St. is IMPASSABLE in the controlled scenario. Deterministic reroute triggered.',
    type: 'reroute',
  },
  {
    id: 'upd-3',
    time: '10:26 AM',
    author: 'Central Dispatch',
    message: 'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes "Loyola St.".',
    type: 'dispatch',
  },
]

export const INITIAL_REQUESTS: RescueRequest[] = [
  {
    id: 'RQ-0042',
    citizenName: 'Maria Santos',
    citizenPhone: '+63 917 555 4321',
    severity: 'high',
    branchTaken: 3,
    location: {
      address: 'Block 5 Lot 21 Jhocson St., Sampaloc, Manila',
      coordinates: [120.9946, 14.6042],
      landmark: 'Near National University Gate 2, beside green sari-sari store',
      houseDescription: '2-storey concrete house with blue iron gate; family assembled on 2nd floor terrace',
    },
    headcount: 4,
    vulnerabilities: {
      infant: true,
      senior: true,
      pwd: false,
      pregnant: false,
    },
    medicalNeeds: true,
    medicalDetails: 'Senior citizen requires bronchial asthma nebulizer and hypertension maintenance medications.',
    floodDepth: 'Chest-deep',
    status: 'en-route',
    assignedTeamId: 'team-alpha',
    assignedTeamName: 'Team Alpha',
    hasMedicalUnit: true,
    rescuerCount: 4,
    submittedAt: '12 min ago',
    eta: '9 mins (Rerouted via Jhocson)',
    isAutoPulledProfile: true,
  },
  {
    id: 'RQ-0041',
    citizenName: 'Juan Dela Cruz',
    citizenPhone: '+63 919 444 8888',
    severity: 'moderate',
    branchTaken: 2,
    location: {
      address: 'Barangay 408 Zone 42 España Blvd., Sampaloc',
      coordinates: [120.9912, 14.6068],
      landmark: 'Near UST España overpass',
      houseDescription: '1st floor townhouse, flood entered living room',
    },
    headcount: 2,
    vulnerabilities: {
      infant: false,
      senior: true,
      pwd: false,
      pregnant: false,
    },
    medicalNeeds: false,
    floodDepth: 'Waist-deep',
    status: 'assigned',
    assignedTeamId: 'team-bravo',
    assignedTeamName: 'Team Bravo',
    hasMedicalUnit: false,
    rescuerCount: 3,
    submittedAt: '25 min ago',
    eta: '10 min',
  },
  {
    id: 'RQ-0040',
    citizenName: 'Ana Reyes',
    citizenPhone: '+63 920 777 9999',
    severity: 'severe',
    branchTaken: 3,
    location: {
      address: 'Blk 3 Lot 18 Lacson Ave. cor. Loyola, Sampaloc',
      coordinates: [120.9985, 14.6075],
      landmark: 'Corner Petron station',
      houseDescription: 'Roof level evacuation, rapid current',
    },
    headcount: 6,
    vulnerabilities: {
      infant: true,
      senior: true,
      pwd: true,
      pregnant: false,
    },
    medicalNeeds: true,
    medicalDetails: 'Severely hypothermic child and elderly PWD in wheelchair.',
    floodDepth: 'Chest-deep',
    status: 'completed',
    assignedTeamId: 'team-alpha',
    assignedTeamName: 'Team Alpha',
    hasMedicalUnit: true,
    rescuerCount: 4,
    submittedAt: '1 hr ago',
  },
]

export const INITIAL_HAZARD_REPORTS: HazardReport[] = [
  {
    id: 'HZ-101',
    reporterName: 'Volunteer Mark Tan',
    locationName: 'Loyola St. cor. Dalupan',
    coordinates: [120.9955, 14.6052],
    hazardType: 'Impassable Flood',
    severity: 'severe',
    floodDepth: 'Chest-deep (1.4m)',
    reportedAt: '18 min ago',
    verifiedByDispatch: true,
  },
  {
    id: 'HZ-102',
    reporterName: 'Kagawad Benigno',
    locationName: 'Gerardo St. corner España',
    coordinates: [120.9932, 14.6038],
    hazardType: 'Submerged Obstacle',
    severity: 'moderate',
    floodDepth: 'Knee-deep (0.26m)',
    reportedAt: '32 min ago',
    verifiedByDispatch: true,
  },
]

export const INITIAL_INCIDENT_REPORTS: IncidentReport[] = [
  {
    id: 'INC-2026-001',
    missionId: 'MSN-0038',
    requestId: 'RQ-0040',
    teamName: 'Team Alpha (Rubber Boat)',
    outcome: 'Successful',
    evacuatedCount: 6,
    casualtiesCount: 0,
    delaysOrComplications: 'Submerged debris on Loyola St forced automated detour onto Jhocson St, adding 4 minutes to route.',
    operationalNotes: 'Medical unit successfully administered first-aid warming to hypothermic child en route to shelter.',
    futureSuggestions: 'Position secondary inflatable boats at NU Gymnasium assembly area prior to monsoon peak.',
    documentedAt: '2026-09-10 09:45 AM',
    dispatcherName: 'Coordinator Elle / Ranee',
  },
]

export const DEFAULT_FORECAST_HOURLY: ForecastHour[] = [
  { time: 'Now (11:00 AM)', rainfallRate: 28.4, condition: 'Torrential Habagat Rain', floodRisk: 'Severe', windSpeedKmh: 45 },
  { time: '12:00 PM', rainfallRate: 34.0, condition: 'Intense Monsoon Downpour', floodRisk: 'Severe', windSpeedKmh: 52 },
  { time: '01:00 PM', rainfallRate: 31.5, condition: 'Heavy Sustained Rainfall', floodRisk: 'Severe', windSpeedKmh: 48 },
  { time: '02:00 PM', rainfallRate: 22.0, condition: 'Moderate to Heavy Showers', floodRisk: 'High', windSpeedKmh: 40 },
  { time: '03:00 PM', rainfallRate: 18.2, condition: 'Intermittent Heavy Rain', floodRisk: 'High', windSpeedKmh: 35 },
  { time: '04:00 PM', rainfallRate: 12.0, condition: 'Scattered Monsoon Showers', floodRisk: 'Moderate', windSpeedKmh: 28 },
  { time: '05:00 PM', rainfallRate: 8.5, condition: 'Gradual Easing Rain', floodRisk: 'Moderate', windSpeedKmh: 22 },
]

export const DEFAULT_WATER_STATIONS: WaterLevelStation[] = [
  { name: 'Estero de Sampaloc (Earnshaw St.)', currentLevel: 2.35, alertLevel: 1.80, criticalLevel: 2.20, status: 'Critical', trend: 'Rising' },
  { name: 'España Flood Basin Pumping Stn.', currentLevel: 1.95, alertLevel: 1.50, criticalLevel: 2.00, status: 'Alarm', trend: 'Rising' },
  { name: 'San Juan River - Pasig Confluence', currentLevel: 12.4, alertLevel: 11.0, criticalLevel: 13.0, status: 'Alarm', trend: 'Steady' },
]
