import { describe, expect, it } from 'vitest'
import { RESCUE_STATIONS, stationGooglePosition, stationMarkerData } from './stations'

describe('shared simulated station catalog', () => {
  it('contains all five stable station identities and supplied addresses', () => {
    expect(RESCUE_STATIONS.map(({ station_id, name, address }) => [station_id, name, address])).toEqual([
      ['sampaloc-fire-station', 'Sampaloc Fire Station', 'A.H. Lacson Ave. cor. J.F. Fajardo St.'],
      ['central-sampaloc-algeciras', 'Central Sampaloc Fire and Rescue Volunteer Brigade', 'Algeciras St.'],
      ['central-sampaloc-lacson-hq', 'Central Sampaloc Fire and Rescue Brigade Headquarters', '156 Lacson Ave.'],
      ['iverson-fire-rescue', 'Iverson Fire and Rescue Volunteer', '622 Sobriedad St.'],
      ['david-fire-rescue-hq', 'David Fire and Rescue Volunteer Inc. Headquarters', '519 Vicente Cruz St.'],
    ])
  })

  it('converts GeoJSON longitude/latitude to Google Maps {lat, lng}', () => {
    expect(RESCUE_STATIONS.map(stationGooglePosition)).toEqual([
      { lat: 14.608, lng: 120.9931 },
      { lat: 14.6181, lng: 120.9909 },
      { lat: 14.6067, lng: 120.9918 },
      { lat: 14.6071, lng: 120.9972 },
      { lat: 14.6088, lng: 120.9986 },
    ])
  })

  it('produces five fixed headquarters markers and flags only the assigned station', () => {
    const markers = stationMarkerData('iverson-fire-rescue')
    expect(markers).toHaveLength(5)
    expect(markers.map(({ station }) => station.station_id)).toEqual(RESCUE_STATIONS.map(({ station_id }) => station_id))
    expect(markers.filter(({ assigned }) => assigned).map(({ station }) => station.station_id)).toEqual(['iverson-fire-rescue'])
    expect(markers.map(({ position }) => position)).toEqual(RESCUE_STATIONS.map(stationGooglePosition))
  })
})
