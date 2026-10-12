export const WEATHER_STALE_MS = 15 * 60 * 1000
export const HEAT_TIP_C = 32
export const RAIN_CHANCE_TIP_PERCENT = 60
export interface AdvisoryConditions {
  kind?: 'clear' | 'cloud' | 'rain'
  condition?: string
  temperatureC?: number | null
  rainChance?: number | null
}
export interface AdvisoryTip {
  id: 'rain' | 'heat'
  title: string
  text: string
  why: string
}
/** One rule source serves both the existing string API and presentation details. */
export function weatherAdviceDetails(weather: AdvisoryConditions): AdvisoryTip[] {
  const tips: AdvisoryTip[] = []
  if (weather.kind === 'rain') tips.push({
    id:'rain', title:'Prepare for rain',
    text:'Bring an umbrella or raincoat and protect belongings from getting wet.',
    why:`Google Weather reports ${weather.condition ?? 'rainy conditions'}.`,
  })
  else if (weather.rainChance != null && weather.rainChance >= RAIN_CHANCE_TIP_PERCENT) tips.push({
    id:'rain', title:'Prepare for possible rain',
    text:'Rain is possible. Consider carrying an umbrella or raincoat.',
    why:`Reported rain probability is ${weather.rainChance}% (app threshold: ${RAIN_CHANCE_TIP_PERCENT}%).`,
  })
  if (weather.temperatureC != null && Number.isFinite(weather.temperatureC) && weather.temperatureC >= HEAT_TIP_C) tips.push({
    id:'heat', title:'Prepare for heat',
    text:'Carry drinking water and reduce prolonged heat exposure.',
    why:`Reported temperature is ${weather.temperatureC} °C (app threshold: ${HEAT_TIP_C} °C).`,
  })
  return tips
}
/** Practical app suggestions; these thresholds are not official alert levels. */
export function weatherAdvisories(weather: AdvisoryConditions): string[] {
  return weatherAdviceDetails(weather).map(tip => tip.text)
}
export function weatherIsStale(time: string, now: number): boolean {
  const timestamp = Date.parse(time)
  return !Number.isFinite(timestamp) || now - timestamp > WEATHER_STALE_MS
}
