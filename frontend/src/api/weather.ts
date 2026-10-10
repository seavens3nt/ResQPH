import { z } from 'zod'
import { apiClient } from './client'
const weatherSchema=z.object({temperature:z.number().finite(),high:z.number().finite(),low:z.number().finite(),
  condition:z.string().min(1),kind:z.enum(['clear','cloud','rain']),time:z.string().datetime({offset:true}),
  feelsLike:z.number().finite().nullish(),windSpeed:z.number().finite().nonnegative().nullish(),
  rainChance:z.number().int().min(0).max(100).nullish(),rainAmount:z.number().finite().nonnegative().nullish(),
  humidity:z.number().int().min(0).max(100).nullish(),windDirection:z.string().nullish()})
export async function getUbeltWeather(signal?:AbortSignal) {
  const response=await apiClient.get('/weather/ubelt',{signal})
  const data=weatherSchema.parse(response.data)
  return {...data,temperature:Math.round(data.temperature),high:Math.round(data.high),low:Math.round(data.low)}
}

const hourSchema=z.object({
  time:z.string().datetime({offset:true}),endTime:z.string().datetime({offset:true}),
  temperature:z.number().finite(),condition:z.string().min(1),kind:z.enum(['clear','cloud','rain']),
  isDaytime:z.boolean().nullable(),rainChance:z.number().int().min(0).max(100).nullable(),
  rainAmount:z.number().finite().nonnegative().nullable(),windSpeed:z.number().finite().nonnegative().nullable(),
  humidity:z.number().int().min(0).max(100).nullable(),pressure:z.number().finite().positive().nullable(),
}).refine(hour=>Date.parse(hour.endTime)>Date.parse(hour.time),'Invalid forecast interval')
export type WeatherHour=z.infer<typeof hourSchema>
export async function getUbeltHourlyWeather(signal?:AbortSignal):Promise<WeatherHour[]> {
  const response=await apiClient.get('/weather/ubelt/hourly',{signal})
  return z.array(hourSchema).min(1).max(6).parse(response.data)
}
