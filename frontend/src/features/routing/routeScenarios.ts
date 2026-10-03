import type { RouteRequest } from './types'

export const CONTROLLED_ROUTE_REQUEST: RouteRequest = {
  origin: { type: 'Point', coordinates: [120.9938198, 14.5977093] },
  destination: { type: 'Point', coordinates: [120.9931743, 14.5983287] },
  scenario_id: 'scenario-controlled-ubelt-001',
  algorithm: 'astar',
  include_ml_penalty: true,
}

export const CONTROLLED_NO_ROUTE_REQUEST: RouteRequest = {
  ...CONTROLLED_ROUTE_REQUEST,
  destination: { type: 'Point', coordinates: [121.0036128, 14.6117538] },
}
