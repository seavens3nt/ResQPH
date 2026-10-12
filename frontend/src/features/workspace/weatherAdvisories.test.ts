import { describe, expect, it } from 'vitest'
import { weatherAdviceDetails, weatherAdvisories, weatherIsStale } from './weatherAdvisories'
import { weatherRefreshAllowedAt } from './useUbeltWeather'

describe('deterministic practical weather suggestions', () => {
  it('explains each suggestion using the same measurements and thresholds as the string API', () => {
    const conditions = {kind:'rain' as const,condition:'Light rain',temperatureC:33.2,rainChance:90}
    const tips = weatherAdviceDetails(conditions)
    expect(tips.map(tip=>tip.text)).toEqual(weatherAdvisories(conditions))
    expect(tips.map(tip=>tip.why)).toEqual([
      'Google Weather reports Light rain.',
      'Reported temperature is 33.2 °C (app threshold: 32 °C).',
    ])
    expect(weatherAdviceDetails({rainChance:60})[0].why).toBe('Reported rain probability is 60% (app threshold: 60%).')
    expect(weatherAdviceDetails({kind:'cloud',condition:'Rain',temperatureC:31,rainChance:59})).toEqual([])
  })
  it('uses structured rain category and Celsius thresholds without display-string guessing', () => {
    expect(weatherAdvisories({kind:'rain',temperatureC:32})).toHaveLength(2)
    expect(weatherAdvisories({kind:'cloud',temperatureC:31.99,rainChance:59})).toEqual([])
    expect(weatherAdvisories({rainChance:60})).toEqual(['Rain is possible. Consider carrying an umbrella or raincoat.'])
  })
  it('does not infer conditions from missing measurements or invent official alerts', () => {
    expect(weatherAdvisories({})).toEqual([])
    expect(weatherAdvisories({temperatureC:null,rainChance:null})).toEqual([])
    expect(weatherAdvisories({temperatureC:NaN})).toEqual([])
    expect(weatherAdvisories({kind:'cloud'})).toEqual([])
  })
  it('uses the provider time for stale classification', () => {
    const now=Date.parse('2026-10-11T12:00:00Z')
    expect(weatherIsStale('2026-10-11T11:50:00Z',now)).toBe(false)
    expect(weatherIsStale('2026-10-11T11:44:59Z',now)).toBe(true)
    expect(weatherIsStale('invalid',now)).toBe(true)
  })
  it('bounds manual refresh and honors server Retry-After', () => {
    expect(weatherRefreshAllowedAt({dataUpdatedAt:1000,errorUpdatedAt:0,error:null})).toBe(61_000)
    expect(weatherRefreshAllowedAt({dataUpdatedAt:1000,errorUpdatedAt:2000,error:{retryAfterSeconds:120}})).toBe(122_000)
  })
})
