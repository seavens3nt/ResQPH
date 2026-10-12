import { describe, expect, it } from 'vitest'
import { positionAtPathRatio, routeHeading, smoothHeading } from './navigation'

describe('simulated route presentation geometry', () => {
  const origin = { lat: 14.604, lng: 120.994 }
  const north = { lat: 14.605, lng: 120.994 }
  const east = { lat: 14.604, lng: 120.995 }
  it('derives cardinal headings and forward lookahead around a turn', () => {
    expect(routeHeading([origin, north], 0.5)).toBeCloseTo(0)
    expect(routeHeading([origin, east], 0.5)).toBeCloseTo(90)
    expect(routeHeading([origin, east, { ...east, lat: north.lat }], 0.49)).toBeLessThan(90)
  })
  it('smooths through north by the shortest angular distance', () => {
    expect(smoothHeading(359, 1, 0.5)).toBe(0)
    expect(smoothHeading(1, 359, 0.5)).toBe(0)
  })
  it('handles duplicates, short segments, stationary geometry and endpoints', () => {
    expect(routeHeading([origin, origin, north, north], 1)).toBeCloseTo(0)
    expect(routeHeading([origin, origin], 0.5, 42)).toBe(42)
    expect(routeHeading([origin, { ...origin, lat: origin.lat + 1e-10 }], 0, 42)).toBe(42)
    expect(routeHeading([], 0, 42)).toBe(42)
    expect(positionAtPathRatio([origin, origin, north], 0.5)?.lat).toBeCloseTo(14.6045)
    expect(positionAtPathRatio([origin, north], 2)).toEqual(north)
    expect(positionAtPathRatio([], 0)).toBeNull()
  })
})
