import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMission, getMissionTracking } from '../../api/missions'
import type { MissionDetail, MissionTracking } from '../../api/missions'
import { useAuth } from '../auth/AuthContext'
import { retryAfterDelay } from '../../api/retryAfter'

const terminal = (status: string | undefined) => status === 'completed' || status === 'cancelled'

export function useMissionJourney(missionId: string | null | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const scope = user?.id ?? 'signed-out'
  const missionKey = ['mission-journey', scope, missionId] as const
  const mission = useQuery({
    queryKey: missionKey,
    queryFn: async () => {
      const received = await getMission(missionId!)
      const cached = queryClient.getQueryData<MissionDetail>(missionKey)
      return cached && received.version < cached.version ? cached : received
    },
    enabled: Boolean(user && missionId),
    refetchInterval: query => terminal(query.state.data?.status) ? false : 5_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => failureCount < 2 && !isDefinitive(error),
  })
  const trackingKey = ['mission-tracking', scope, missionId] as const
  const tracking = useQuery({
    queryKey: trackingKey,
    queryFn: async () => {
      const received = await getMissionTracking(missionId!)
      const cached = queryClient.getQueryData<MissionTracking>(trackingKey)
      if (cached && Date.parse(received.timestamp) < Date.parse(cached.timestamp)) return cached
      return received
    },
    enabled: Boolean(user && missionId && mission.data && !terminal(mission.data.status)),
    refetchInterval: query => query.state.error
      ? retryAfterDelay(query.state.error, Math.min(30_000, 3_000 * (2 ** Math.min(query.state.fetchFailureCount, 3))))
      : 3_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  })
  return { mission, tracking }
}

function isDefinitive(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'httpStatus' in error
    && typeof (error as { httpStatus: unknown }).httpStatus === 'number'
    && (error as { httpStatus: number }).httpStatus >= 400
    && (error as { httpStatus: number }).httpStatus < 500
}

export function journeyRoute(mission: MissionDetail | undefined): [number, number][] {
  const result = mission?.latest_route_result
  if (!result || typeof result !== 'object') return []
  const geometry = (result as { geometry?: { coordinates?: unknown } }).geometry
  if (!Array.isArray(geometry?.coordinates)) return []
  return geometry.coordinates.filter((point): point is [number, number] =>
    Array.isArray(point) && point.length === 2 && point.every(value => typeof value === 'number' && Number.isFinite(value)),
  )
}
