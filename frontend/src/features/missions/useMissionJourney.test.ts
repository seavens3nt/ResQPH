import { describe, expect, it } from 'vitest'
import { isMissionTrackingActive } from './useMissionJourney'

describe('mission tracking lifecycle', () => {
  it('stops tracking polling at arrival and terminal mission states', () => {
    expect(isMissionTrackingActive('assigned')).toBe(true)
    expect(isMissionTrackingActive('en-route')).toBe(true)
    expect(isMissionTrackingActive('arrived')).toBe(false)
    expect(isMissionTrackingActive('completed')).toBe(false)
    expect(isMissionTrackingActive('cancelled')).toBe(false)
  })
})
