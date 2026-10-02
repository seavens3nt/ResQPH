import { isAxiosError } from 'axios'
import { z } from 'zod'
import { apiClient } from '../../api/client'
import type { RouteErrorKind, RouteRequest, RouteResult } from './types'

const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
])

const routeFoundSchema = z.object({
  fixture_notice: z.string().min(1).optional(),
  status: z.literal('route-found'),
  route_id: z.string().min(1),
  algorithm: z.literal('astar').optional(),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(coordinateSchema).min(2),
  }),
  distance_m: z.number().nonnegative(),
  estimated_time_s: z.number().nonnegative(),
  total_cost: z.number().nonnegative(),
  edge_ids: z.array(z.string().min(1)).min(1),
  cost_breakdown: z.object({
    base: z.number().nonnegative(),
    deterministic_risk: z.number().nonnegative(),
    ml_risk: z.number().nonnegative(),
  }),
  fallback_used: z.boolean(),
  warnings: z.array(z.string().min(1)),
  explanation: z.string().min(1),
  scenario_timestamp: z.string().min(1),
  model_version: z.string().min(1).nullable(),
})

const noRouteSchema = z.object({
  fixture_notice: z.string().min(1).optional(),
  status: z.literal('no-route'),
  reason: z.string().min(1),
  warnings: z.array(z.string().min(1)).min(1),
  scenario_timestamp: z.string().min(1),
})

export const routeResultSchema = z.discriminatedUnion('status', [
  routeFoundSchema,
  noRouteSchema,
])

export class RouteApiError extends Error {
  readonly kind: RouteErrorKind
  readonly httpStatus?: number
  readonly code?: string

  constructor(
    kind: RouteErrorKind,
    message: string,
    options: { httpStatus?: number; code?: string } = {},
  ) {
    super(message)
    this.name = 'RouteApiError'
    this.kind = kind
    this.httpStatus = options.httpStatus
    this.code = options.code
  }

  get retryable(): boolean {
    return this.kind === 'network' || this.httpStatus === 503
  }
}
function normalizeRouteError(error: unknown): never {
  if (error instanceof RouteApiError) throw error

  if (isAxiosError(error) && error.response) {
    const envelope = error.response.data?.error
    throw new RouteApiError(
      'api',
      envelope?.message ?? 'The routing request could not be completed.',
      {
        httpStatus: error.response.status,
        code: envelope?.code,
      },
    )
  }

  if (isAxiosError(error)) {
    throw new RouteApiError(
      'network',
      'The routing service could not be reached. The map will not draw a substitute route.',
    )
  }

  throw error
}

export function parseRouteResult(value: unknown): RouteResult {
  const parsed = routeResultSchema.safeParse(value)
  if (!parsed.success) {
    throw new RouteApiError(
      'malformed-response',
      'The routing service returned an invalid result. No route was drawn.',
    )
  }
  return parsed.data
}

export async function evaluateRoute(request: RouteRequest): Promise<RouteResult> {
  try {
    const response = await apiClient.post<unknown>('/routes/evaluate', request)
    return parseRouteResult(response.data)
  } catch (error) {
    return normalizeRouteError(error)
  }
}
