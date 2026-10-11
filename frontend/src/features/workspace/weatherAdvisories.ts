export const WEATHER_STALE_MS = 15 * 60 * 1000
export const HEAT_TIP_C = 32
export const RAIN_CHANCE_TIP_PERCENT = 60
export interface AdvisoryConditions {
  kind?: 'clear' | 'cloud' | 'rain'
  temperatureC?: number | null
  rainChance?: number | null
}
/** Practical app suggestions; these thresholds are not official alert levels. */
export function weatherAdvisories(weather: AdvisoryConditions): string[] {
  const tips: string[] = []
  if (weather.kind === 'rain') tips.push('Bring an umbrella or raincoat and protect belongings from getting wet.')
  else if (weather.rainChance != null && weather.rainChance >= RAIN_CHANCE_TIP_PERCENT) tips.push('Rain is possible. Consider carrying an umbrella or raincoat.')
  if (weather.temperatureC != null && Number.isFinite(weather.temperatureC) && weather.temperatureC >= HEAT_TIP_C) tips.push('Carry drinking water and reduce prolonged heat exposure.')
  return tips
}
export function weatherIsStale(time: string, now: number): boolean {
  const timestamp = Date.parse(time)
  return !Number.isFinite(timestamp) || now - timestamp > WEATHER_STALE_MS
}
