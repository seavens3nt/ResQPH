export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface RouteRequest {
  origin: GeoPoint
  destination: GeoPoint
  scenario_id: string
  algorithm: 'astar'
  include_ml_penalty: boolean
}

export interface RouteCostBreakdown {
  base: number
  deterministic_risk: number
  ml_risk: number
}

export interface RouteFoundResult {
  fixture_notice?: string
  status: 'route-found'
  route_id: string
  algorithm?: 'astar'
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  distance_m: number
  estimated_time_s: number
  total_cost: number
  edge_ids: string[]
  cost_breakdown: RouteCostBreakdown
  fallback_used: boolean
  warnings: string[]
  explanation: string
  scenario_timestamp: string
  model_version: string | null
}

export interface NoRouteResult {
  fixture_notice?: string
  status: 'no-route'
  reason: string
  warnings: string[]
  scenario_timestamp: string
}

export type RouteResult = RouteFoundResult | NoRouteResult

export type RouteErrorKind = 'api' | 'network' | 'malformed-response'

export type RouteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'route-found'; result: RouteFoundResult }
  | { status: 'no-route'; result: NoRouteResult }
  | {
      status: 'error'
      kind: RouteErrorKind
      message: string
      retryable: boolean
    }

export function toMapRouteCoordinates(result: RouteFoundResult): [number, number][] {
  return result.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
}
