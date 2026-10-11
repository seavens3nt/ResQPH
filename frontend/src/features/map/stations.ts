import stationCatalog from '../../../../data/samples/simulated-rescue-stations.json'

export interface RescueStation {
  station_id: string
  team_id: string
  name: string
  address: string
  point: { type: string; coordinates: number[] }
}

export const RESCUE_STATIONS = stationCatalog.stations as RescueStation[]

/** Convert GeoJSON [longitude, latitude] to Google Maps' explicit {lat, lng}. */
export function stationGooglePosition(station: RescueStation): google.maps.LatLngLiteral {
  const [longitude, latitude] = station.point.coordinates
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(`Station ${station.station_id} has invalid GeoJSON coordinates.`)
  }
  return { lat: latitude, lng: longitude }
}

export function stationIdForTeamId(teamId: string | undefined): string | undefined {
  return RESCUE_STATIONS.find((station) => station.team_id === teamId)?.station_id
}

export function stationMarkerData(assignedStationId?: string) {
  return RESCUE_STATIONS.map((station) => ({
    station,
    position: stationGooglePosition(station),
    assigned: station.station_id === assignedStationId,
  }))
}
