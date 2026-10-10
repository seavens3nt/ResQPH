import { useQuery } from '@tanstack/react-query'
import { getUbeltWeather, getUbeltHourlyWeather } from '../../api/weather'

export function useUbeltWeather() {
  return useQuery({queryKey:['weather','ubelt'],queryFn:({signal})=>getUbeltWeather(signal),
    staleTime:15*60*1000,refetchInterval:false,refetchOnWindowFocus:false,
    refetchOnReconnect:false,gcTime:0,retry:false})
}

export function useUbeltHourlyWeather() {
  return useQuery({queryKey:['weather','ubelt','hourly'],queryFn:({signal})=>getUbeltHourlyWeather(signal),
    staleTime:15*60*1000,refetchInterval:false,refetchOnWindowFocus:false,
    refetchOnReconnect:false,gcTime:0,retry:false})
}
