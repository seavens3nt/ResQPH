import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMission, getMissionTracking } from '../../api/missions'
import type { MissionDetail, MissionTracking } from '../../api/missions'
import { useAuth } from '../auth/AuthContext'
import { retryAfterDelay } from '../../api/retryAfter'
import { recordRefreshInterval, sessionReadBlocked } from '../../api/queryRecovery'

const terminal = (status: string | undefined) => status === 'completed' || status === 'cancelled'
export const isMissionTrackingActive = (status: string | undefined) =>
  status === 'en-route'

export function useMissionJourney(missionId: string | null | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const scope = `${user?.id ?? user?.email ?? 'signed-out'}:${user?.stationId ?? ''}`
  const missionKey = ['mission-journey', scope, missionId] as const
  const trackingKey = ['mission-tracking', scope, missionId] as const
  const trackingBlocked = () => sessionReadBlocked(queryClient.getQueryState(trackingKey)?.error)
  const mission = useQuery({
    queryKey: missionKey,
    staleTime:4_000,
    queryFn: async () => {
      const received = await getMission(missionId!)
      const cached = queryClient.getQueryData<MissionDetail>(missionKey)
      return cached && received.version < cached.version ? cached : received
    },
    enabled: query => Boolean(user && missionId) && !sessionReadBlocked(query.state.error) && !trackingBlocked(),
    refetchInterval: query => terminal(query.state.data?.status) || trackingBlocked() ? false : recordRefreshInterval(query.state.error,5_000),
    refetchOnWindowFocus: false,
    refetchOnReconnect:false,
    retry: (failureCount, error) => failureCount < 2 && !isDefinitive(error),
  })
  const tracking = useQuery({
    queryKey: trackingKey,
    staleTime:2_500,
    queryFn: async () => {
      const received = await getMissionTracking(missionId!)
      const cached = queryClient.getQueryData<MissionTracking>(trackingKey)
      if (cached && Date.parse(received.timestamp) < Date.parse(cached.timestamp)) return cached
      return received
    },
    enabled: query => Boolean(user && missionId && mission.data && !terminal(mission.data.status)) && !sessionReadBlocked(mission.error) && !sessionReadBlocked(query.state.error),
    refetchInterval: query => !isMissionTrackingActive(mission.data?.status) || sessionReadBlocked(query.state.error) ? false : query.state.error
      ? retryAfterDelay(query.state.error, Math.min(30_000, 3_000 * (2 ** Math.min(query.state.fetchFailureCount, 3))))
      : 3_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect:false,
    retry: false,
  })
  const refreshTracking = tracking.refetch
  useEffect(() => {
    if (mission.data?.status !== 'arrived' || tracking.data?.simulation_status === 'arrived' || sessionReadBlocked(mission.error) || sessionReadBlocked(tracking.error)) return
    // One final frozen position is useful at arrival; respect any active 429 cooldown.
    const delay = tracking.error ? Math.max(0,tracking.errorUpdatedAt + retryAfterDelay(tracking.error,15_000) - Date.now()) : 0
    const timer = window.setTimeout(()=>void refreshTracking({cancelRefetch:false}),delay)
    return ()=>window.clearTimeout(timer)
  }, [mission.data?.status, mission.error, tracking.error, tracking.errorUpdatedAt, tracking.data?.simulation_status, refreshTracking])
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
