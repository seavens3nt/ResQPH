import { useEffect, useState } from 'react'
import { retryAfterDelay } from '../../api/retryAfter'
import { useQuery } from '@tanstack/react-query'
import { getUbeltWeather, getUbeltHourlyWeather } from '../../api/weather'

export function useUbeltWeather() {
  return useQuery({queryKey:['weather','ubelt'],queryFn:({signal})=>getUbeltWeather(signal),
    staleTime:15*60*1000,refetchInterval:false,refetchOnWindowFocus:false,
    refetchOnReconnect:false,gcTime:30*60*1000,retry:false})
}

export function useUbeltHourlyWeather() {
  return useQuery({queryKey:['weather','ubelt','hourly'],queryFn:({signal})=>getUbeltHourlyWeather(signal),
    staleTime:15*60*1000,refetchInterval:false,refetchOnWindowFocus:false,
    refetchOnReconnect:false,gcTime:30*60*1000,retry:false})
}

/** Bound manual refresh across Home/Advisory mounts using the shared query timestamps. */
export function weatherRefreshAllowedAt(query: {dataUpdatedAt:number;errorUpdatedAt:number;error:unknown}): number {
  return Math.max(query.dataUpdatedAt ? query.dataUpdatedAt + 60_000 : 0,
    query.errorUpdatedAt ? query.errorUpdatedAt + retryAfterDelay(query.error, 60_000) : 0)
}

/** Clock only; this never fetches weather. */
export function useWeatherClock(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
