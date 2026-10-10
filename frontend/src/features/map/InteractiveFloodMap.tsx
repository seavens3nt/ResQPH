import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { LoadingState } from '../../components/ui/LoadingState'
import { Icon } from '../../components/art/Icon'
import { RouteOverlay } from '../routing/RouteOverlay'
import type { RouteState } from '../routing/types'
import { NON_LIVE_DATA_DISCLAIMER } from './mapData'
import { useMapLayers, type UseMapLayersOptions } from './useMapLayers'
import { stationMarkerData } from './stations'
import { LOCKED_STUDY_AREA_FIXTURE, parseStudyAreaFixture } from './mapData'
import './map.css'

export interface MapProps extends UseMapLayersOptions {
  center?: [number, number]
  controlsSlot?: ReactNode
  records?: { id: string; label: string; coordinates: [number, number] }[]
  draggableRecordIds?: string[]
  activeStage?: 'pending' | 'assigned' | 'en-route' | 'arrived' | 'completed' | 'all' | 'none'
  highlightStreet?: string
  showAlternatives?: boolean
  selectedRoute?: 'primary' | 'alternative' | 'override'
  onSelectRoute?: (route: 'primary' | 'alternative') => void
  routeExplanation?: string
  etaMinutes?: number
  routeState?: RouteState
  routeGeometry?: [number, number][]
  trackingPosition?: { type: 'Point'; coordinates: [number, number] } | null
  trackingProgress?: number
  followPosition?: boolean
  onManualPan?: () => void
  onFollowChange?: (following: boolean) => void
  onMapClick?: (coordinates: [number, number]) => void
  onRecordDragEnd?: (id: string, coordinates: [number, number]) => void
  compact?: boolean
  showRouteStatus?: boolean
  operationContext?: {
    requestId: string
    address: string
    headcount: number
    teamName: string
    status: string
    routeName: string
    stationId?: string
  }
  assignedStationId?: string
  showRouteControl?: boolean
}

type GoogleLibraries = {
  MapConstructor: typeof google.maps.Map
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement
}

let librariesPromise: Promise<GoogleLibraries> | null = null
let loaderConfigured = false
const providerFailureListeners = new Set<() => void>()
let providerHandlerInstalled = false
const DEFAULT_MAP_CENTER: google.maps.LatLngLiteral = { lat: 14.604, lng: 120.994 }
const studyFeature = parseStudyAreaFixture(LOCKED_STUDY_AREA_FIXTURE).features[0]
const studyRing = studyFeature.geometry.coordinates[0]
const studyBoundsLiteral = studyRing.reduce((bounds, [longitude, latitude]) => ({
  west: Math.min(bounds.west, longitude), east: Math.max(bounds.east, longitude),
  south: Math.min(bounds.south, latitude), north: Math.max(bounds.north, latitude),
}), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity })
// The 210 px mission-map variant has about 170 px available after padding.
// At this latitude zoom 13 shows about 3.1 km vertically; zoom 14 would clip the boundary.
export const STUDY_AREA_MIN_ZOOM = 13

function loadGoogleMaps(): Promise<GoogleLibraries> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim()
  if (!key || !mapId) return Promise.reject(new Error('Set VITE_GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_MAP_ID in frontend/.env.local, then restart Vite.'))
  if (!loaderConfigured) {
    if (!providerHandlerInstalled) {
      const browserWindow = window as Window & { gm_authFailure?: () => void }
      const previous = browserWindow.gm_authFailure
      browserWindow.gm_authFailure = () => {
        previous?.()
        providerFailureListeners.forEach(listener => listener())
      }
      providerHandlerInstalled = true
    }
    setOptions({ key, v: 'weekly', mapIds: [mapId] })
    loaderConfigured = true
  }
  if (!librariesPromise) {
    librariesPromise = Promise.all([importLibrary('maps'), importLibrary('marker')])
      .then(([maps, markers]) => ({ MapConstructor: maps.Map, AdvancedMarkerElement: markers.AdvancedMarkerElement }))
      .catch((error: unknown) => {
        librariesPromise = null
        throw error
      })
  }
  return librariesPromise
}

function textPopup(title: string, lines: string[]): HTMLElement {
  const root = document.createElement('div')
  root.className = 'google-map-popup'
  const heading = document.createElement('strong')
  heading.textContent = title
  root.append(heading)
  for (const line of lines) {
    const row = document.createElement('div')
    row.textContent = line
    root.append(row)
  }
  return root
}

function markerContent(label: string, color: string, symbol?: string): HTMLElement {
  const root = document.createElement('div')
  root.className = 'resq-google-marker'
  root.style.setProperty('--marker-color', color)
  root.setAttribute('aria-label', label)
  if (symbol) root.textContent = symbol
  else root.innerHTML = '<span aria-hidden="true"></span>'
  return root
}

function asGooglePath(coordinates: [number, number][]): google.maps.LatLngLiteral[] {
  return coordinates.map(([latitude, longitude]) => ({ lat: latitude, lng: longitude }))
}

function asGoogleLiteral(position: unknown): google.maps.LatLngLiteral | null {
  if (typeof position !== 'object' || position === null) return null
  const value = position as unknown as { lat: number | (() => number); lng: number | (() => number) }
  const lat = typeof value.lat === 'function' ? value.lat() : value.lat
  const lng = typeof value.lng === 'function' ? value.lng() : value.lng
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function positionAtPathRatio(path: google.maps.LatLngLiteral[], ratio: number): google.maps.LatLngLiteral | null {
  if (path.length < 2) return path[0] ?? null
  const lengths = path.slice(1).map((point, index) => {
    const previous = path[index]
    const meanLatitude = (point.lat + previous.lat) / 2 * Math.PI / 180
    return Math.hypot((point.lng - previous.lng) * Math.cos(meanLatitude), point.lat - previous.lat)
  })
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (total === 0) return path[path.length - 1]
  let remaining = Math.max(0, Math.min(1, ratio)) * total
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]
    if (remaining <= length || index === lengths.length - 1) {
      const fraction = length === 0 ? 1 : remaining / length
      return {
        lat: path[index].lat + (path[index + 1].lat - path[index].lat) * fraction,
        lng: path[index].lng + (path[index + 1].lng - path[index].lng) * fraction,
      }
    }
    remaining -= length
  }
  return path[path.length - 1]
}

function splitPathAtRatio(path: google.maps.LatLngLiteral[], ratio: number): [google.maps.LatLngLiteral[], google.maps.LatLngLiteral[]] {
  if (path.length < 2) return [[], path]
  const lengths = path.slice(1).map((point, index) => {
    const previous = path[index]
    const meanLatitude = (point.lat + previous.lat) / 2 * Math.PI / 180
    return Math.hypot((point.lng - previous.lng) * Math.cos(meanLatitude), point.lat - previous.lat)
  })
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (total === 0) return [[], path]
  let remainingDistance = Math.max(0, Math.min(1, ratio)) * total
  const completed: google.maps.LatLngLiteral[] = [path[0]]
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]
    if (remainingDistance >= length) {
      completed.push(path[index + 1])
      remainingDistance -= length
      continue
    }
    const fraction = length === 0 ? 0 : remainingDistance / length
    const split = {
      lat: path[index].lat + (path[index + 1].lat - path[index].lat) * fraction,
      lng: path[index].lng + (path[index + 1].lng - path[index].lng) * fraction,
    }
    completed.push(split)
    return [completed, [split, ...path.slice(index + 1)]]
  }
  return [completed, []]
}

const stationColors = ['#1d4ed8', '#7c3aed', '#0f766e', '#b45309', '#be123c']
const DEFAULT_ROUTE_STATE: RouteState = { status: 'idle' }

export function InteractiveFloodMap({
  routeState,
  routeGeometry,
  trackingPosition,
  trackingProgress,
  followPosition = false,
  onManualPan,
  onFollowChange,
  onMapClick,
  compact = false,
  showRouteStatus = true,
  operationContext,
  roadFixture,
  floodFixture,
  studyAreaFixture,
  simulatedState,
  records,
  draggableRecordIds = [],
  onRecordDragEnd,
  center,
  controlsSlot,
  assignedStationId,
  showRouteControl = false,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null)
  const markersRef = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>())
  const markerCallbacksRef = useRef(new Map<string, { remove: () => void }>())
  const overlaysRef = useRef<google.maps.MVCObject[]>([])
  const routeLineRef = useRef<google.maps.Polyline | null>(null)
  const trackingMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const trackingDisplayPositionRef = useRef<google.maps.LatLngLiteral | null>(null)
  const trackingDisplayProgressRef = useRef<number | null>(null)
  const trackingPopupRef = useRef<google.maps.InfoWindow | null>(null)
  const lastRequestedCenterRef = useRef<[number, number] | undefined>(undefined)
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const mapClickRef = useRef(onMapClick)
  mapClickRef.current = onMapClick
  const recordDragRef = useRef(onRecordDragEnd)
  recordDragRef.current = onRecordDragEnd
  const followChangeRef = useRef(onFollowChange)
  followChangeRef.current = onFollowChange
  const manualPanRef = useRef(onManualPan)
  manualPanRef.current = onManualPan
  const draggableIdsRef = useRef(draggableRecordIds)
  draggableIdsRef.current = draggableRecordIds
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [retry, setRetry] = useState(0)
  const [floodVisible, setFloodVisible] = useState(true)
  const [follow, setFollow] = useState(followPosition)
  const assignedStationIdRef = useRef(assignedStationId)
  assignedStationIdRef.current = operationContext?.stationId ?? assignedStationId
  const uid = useId()
  const { status: layerStatus, errorMessage, dataset, metadata } = useMapLayers({ roadFixture, floodFixture, studyAreaFixture, simulatedState })
  const effectiveRouteState = routeState ?? DEFAULT_ROUTE_STATE
  const routeResult = effectiveRouteState.status === 'route-found' ? effectiveRouteState.result : null
  const routePoints = useMemo(() => {
    if (routeGeometry) return routeGeometry.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }))
    return routeResult?.geometry.coordinates.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude })) ?? []
  }, [routeGeometry, routeResult])

  useEffect(() => {
    let cancelled = false
    const providerFailure = () => setMapError('Google rejected the browser key or Map ID. Check website/API restrictions and reload after changing frontend configuration.')
    providerFailureListeners.add(providerFailure)
    const node = containerRef.current
    if (!node) return
    setMapError(null)
    setMapReady(false)
    void loadGoogleMaps().then(({ MapConstructor, AdvancedMarkerElement }) => {
      if (cancelled || !containerRef.current) return
      const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID!.trim()
      const map = new MapConstructor(containerRef.current, {
        center: center ? { lat: center[0], lng: center[1] } : DEFAULT_MAP_CENTER,
        zoom: 15,
        minZoom: STUDY_AREA_MIN_ZOOM,
        restriction: { latLngBounds: studyBoundsLiteral, strictBounds: true },
        mapId,
        clickableIcons: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: true,
      })
      mapRef.current = map
      lastRequestedCenterRef.current = center
      const initialBounds = new google.maps.LatLngBounds(
        { lat: studyBoundsLiteral.south, lng: studyBoundsLiteral.west },
        { lat: studyBoundsLiteral.north, lng: studyBoundsLiteral.east },
      )
      map.fitBounds(initialBounds, 20)
      markerClassRef.current = AdvancedMarkerElement
      trackingPopupRef.current = new google.maps.InfoWindow()
      dragListenerRef.current = map.addListener('dragstart', () => {
        setFollow(false)
        followChangeRef.current?.(false)
        manualPanRef.current?.()
      })
      clickListenerRef.current = map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) mapClickRef.current?.([event.latLng.lng(), event.latLng.lat()])
      })
      setMapReady(true)
    }).catch((error: unknown) => {
      if (!cancelled) setMapError(error instanceof Error ? error.message : 'Google Maps could not load. Check the browser console and Maps API configuration.')
    })
    return () => {
      cancelled = true
      dragListenerRef.current?.remove()
      clickListenerRef.current?.remove()
      providerFailureListeners.delete(providerFailure)
      markersRef.current.forEach(marker => { marker.map = null })
      markersRef.current.clear()
      markerCallbacksRef.current.forEach(listener => listener.remove())
      markerCallbacksRef.current.clear()
      overlaysRef.current.forEach(overlay => (overlay as google.maps.Polyline | google.maps.Polygon).setMap(null))
      overlaysRef.current = []
      routeLineRef.current?.setMap(null)
      trackingMarkerRef.current && (trackingMarkerRef.current.map = null)
      trackingDisplayPositionRef.current = null
      trackingDisplayProgressRef.current = null
      mapRef.current = null
      markerClassRef.current = null
    }
  // Map and SDK instances are intentionally created once per mounted canvas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry])

  useEffect(() => setFollow(followPosition), [followPosition])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerClassRef.current) return
    const map = mapRef.current
    const AdvancedMarkerElement = markerClassRef.current
    const info = new google.maps.InfoWindow()
    const desired = new Set<string>()
    stationMarkerData(operationContext?.stationId ?? assignedStationId).forEach(({ station, position, assigned }, index) => {
      const key = `station:${station.station_id}`
      desired.add(key)
      let marker = markersRef.current.get(key)
      if (!marker) {
        marker = new AdvancedMarkerElement({ map, position, title: station.name, content: markerContent(station.name, stationColors[index], '⌂') })
        marker.addListener('click', () => {
          info.setContent(textPopup(station.name, [station.address, assignedStationIdRef.current === station.station_id ? 'Assigned to this mission' : 'Headquarters']))
          info.open({ map, anchor: marker })
        })
        markersRef.current.set(key, marker)
      }
      marker.position = position
      marker.title = `${station.name} — ${assigned ? 'Assigned to this mission' : 'Headquarters'}`
      marker.zIndex = assigned ? 100 : 20
      const content = markerContent(station.name, stationColors[index], '⌂')
      if (assigned) content.classList.add('is-assigned')
      marker.content = content
    })
    for (const record of records ?? []) {
      if (!record.coordinates.every(Number.isFinite)) continue
      const key = `record:${record.id}`
      desired.add(key)
      const [longitude, latitude] = record.coordinates
      let marker = markersRef.current.get(key)
      if (!marker) {
        marker = new AdvancedMarkerElement({ map, position: { lat: latitude, lng: longitude }, title: record.label, content: markerContent(record.label, '#ef334f', '●') })
        marker.addListener('click', () => {
          info.setContent(textPopup(record.label, [record.id]))
          info.open({ map, anchor: marker })
        })
        markersRef.current.set(key, marker)
      }
      marker.gmpDraggable = draggableIdsRef.current.includes(record.id)
      if (marker.gmpDraggable && !markerCallbacksRef.current.has(key)) {
        const dragEnd = () => {
          const position = asGoogleLiteral(marker.position)
          if (position) recordDragRef.current?.(record.id, [position.lng, position.lat])
        }
        marker.addEventListener('gmp-dragend', dragEnd)
        markerCallbacksRef.current.set(key, { remove: () => marker.removeEventListener('gmp-dragend', dragEnd) })
      } else if (!marker.gmpDraggable && markerCallbacksRef.current.has(key)) {
        markerCallbacksRef.current.get(key)?.remove()
        markerCallbacksRef.current.delete(key)
      }
      marker.position = { lat: latitude, lng: longitude }
      marker.title = record.label
    }
    for (const [key, marker] of markersRef.current) {
      if (key.startsWith('tracking:')) continue
      if (!desired.has(key)) {
        marker.map = null
        markersRef.current.delete(key)
      }
    }
    return () => info.close()
  }, [mapReady, assignedStationId, operationContext?.stationId, records, draggableRecordIds])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    overlaysRef.current.forEach(overlay => (overlay as google.maps.Polyline | google.maps.Polygon).setMap(null))
    overlaysRef.current = []
    const map = mapRef.current
    if (dataset?.studyArea.mapPolygon.length) {
      const boundary = new google.maps.Polygon({ map, paths: asGooglePath(dataset.studyArea.mapPolygon), strokeColor: '#3b82f6', strokeOpacity: 0.9, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.04, clickable: true })
      boundary.addListener('click', (event: google.maps.MapMouseEvent) => {
        new google.maps.InfoWindow({ content: textPopup(dataset.studyArea.name, ['Approved WGS 84 pilot boundary', `Approved: ${dataset.studyArea.approvedOn}`]), position: event.latLng }).open(map)
      })
      overlaysRef.current.push(boundary)
    }
    if (dataset && layerStatus !== 'error') {
      for (const edge of dataset.edges) {
        const color = edge.passability === 'impassable' ? '#dc2626' : edge.passability === 'restricted' ? '#f59e0b' : '#22c55e'
        const line = new google.maps.Polyline({ map, path: asGooglePath(edge.mapCoordinates), strokeColor: color, strokeOpacity: 0.9, strokeWeight: edge.passability === 'impassable' ? 6 : 4, clickable: true })
        line.addListener('click', (event: google.maps.MapMouseEvent) => {
          const depth = edge.floodDepthCm ? ` · ${edge.floodDepthCm} cm` : ''
          new google.maps.InfoWindow({ content: textPopup(`${edge.edgeId} (${edge.roadClass})`, [`${edge.lengthM} m · ${edge.passability.toUpperCase()}`, `Flood: ${edge.floodLevel}${depth}`, `Source: ${edge.sourceType} · ${edge.observedAt}`]), position: event.latLng }).open(map)
        })
        overlaysRef.current.push(line)
      }
      if (floodVisible) for (const flood of dataset.floodFeatures) {
        if (flood.geometryType !== 'Polygon' || !Array.isArray(flood.mapCoordinates)) continue
        const critical = flood.passability === 'impassable' || flood.floodLevel === 'severe'
        const polygon = new google.maps.Polygon({ map, paths: flood.mapCoordinates, strokeColor: critical ? '#dc2626' : '#f59e0b', strokeWeight: 2, fillColor: critical ? '#ef4444' : '#f59e0b', fillOpacity: critical ? 0.42 : 0.3, clickable: true })
        polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
          new google.maps.InfoWindow({ content: textPopup(critical ? 'Controlled severe flood zone' : 'Controlled flood ponding', [`${flood.floodLevel} · ${flood.floodDepthCm ? `${flood.floodDepthCm} cm depth` : 'Controlled depth'}`, `Passability: ${flood.passability}`]), position: event.latLng }).open(map)
        })
        overlaysRef.current.push(polygon)
      }
    }
    if (routePoints.length >= 2) {
      const [completedPath, remainingPath] = splitPathAtRatio(routePoints, trackingProgress ?? 0)
      if (completedPath.length >= 2) {
        const completedLine = new google.maps.Polyline({ map, path: completedPath, strokeColor: '#64748b', strokeOpacity: 0.7, strokeWeight: 5, clickable: false })
        overlaysRef.current.push(completedLine)
      }
      if (remainingPath.length >= 2) {
        routeLineRef.current = new google.maps.Polyline({ map, path: remainingPath, strokeColor: '#22c55e', strokeOpacity: 0.98, strokeWeight: 7, clickable: true })
        routeLineRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        const routeId = routeResult?.route_id ?? 'Accepted mission route'
        new google.maps.InfoWindow({ content: textPopup('Controlled-scenario route', [routeId, routeResult ? `${Math.round(routeResult.distance_m)} m` : 'Persisted station-to-incident geometry']), position: event.latLng }).open(map)
        })
        overlaysRef.current.push(routeLineRef.current)
      }
    }
    return () => {
      overlaysRef.current.forEach(overlay => (overlay as google.maps.Polyline | google.maps.Polygon).setMap(null))
      overlaysRef.current = []
    }
  }, [mapReady, dataset, layerStatus, floodVisible, routePoints, routeResult, trackingProgress])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerClassRef.current || !trackingPosition) return
    const [longitude, latitude] = trackingPosition.coordinates
    const target = Number.isFinite(trackingProgress) && routePoints.length > 1
      ? positionAtPathRatio(routePoints, trackingProgress!) ?? { lat: latitude, lng: longitude }
      : { lat: latitude, lng: longitude }
    const targetProgress = Number.isFinite(trackingProgress) ? Math.max(0, Math.min(1, trackingProgress!)) : null
    const startProgress = trackingDisplayProgressRef.current ?? targetProgress
    const start = trackingDisplayPositionRef.current ?? target
    if (!trackingMarkerRef.current) {
      const marker = new markerClassRef.current({ map: mapRef.current, position: start, title: 'Simulated rescuer position', content: markerContent('Simulated rescuer position', '#0891b2', '🚤'), zIndex: 200 })
      trackingMarkerRef.current = marker
    } else {
      trackingMarkerRef.current.position = start
    }
    trackingMarkerRef.current.map = mapRef.current
    const marker = trackingMarkerRef.current
    let frame: number | null = null
    const startedAt = performance.now()
    const duration = 2_500
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = progress * (2 - progress)
      const interpolatedProgress = startProgress !== null && targetProgress !== null
        ? startProgress + (targetProgress - startProgress) * eased
        : null
      const position = interpolatedProgress !== null && routePoints.length > 1
        ? positionAtPathRatio(routePoints, interpolatedProgress) ?? target
        : {
            lat: start.lat + (target.lat - start.lat) * eased,
            lng: start.lng + (target.lng - start.lng) * eased,
          }
      marker.position = position
      trackingDisplayPositionRef.current = position
      if (interpolatedProgress !== null) trackingDisplayProgressRef.current = interpolatedProgress
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    if (follow) mapRef.current.panTo(target)
    return () => { if (frame !== null) cancelAnimationFrame(frame) }
  }, [mapReady, trackingPosition, trackingProgress, routePoints, follow])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !center) return
    if (lastRequestedCenterRef.current?.[0] === center[0] && lastRequestedCenterRef.current?.[1] === center[1]) return
    mapRef.current.setCenter({ lat: center[0], lng: center[1] })
    lastRequestedCenterRef.current = center
  }, [mapReady, center])

  const recenter = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (trackingPosition) {
      const [longitude, latitude] = trackingPosition.coordinates
      map.panTo({ lat: latitude, lng: longitude })
    } else if (routePoints.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      routePoints.forEach(point => bounds.extend(point))
      map.fitBounds(bounds, 48)
    } else map.setCenter(center ? { lat: center[0], lng: center[1] } : DEFAULT_MAP_CENTER)
  }, [center, routePoints, trackingPosition])

  const showFullRoute = useCallback(() => {
    const map = mapRef.current
    if (!map || routePoints.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    routePoints.forEach(point => bounds.extend(point))
    map.fitBounds(bounds, 48)
  }, [routePoints])

  const toggleFollow = () => {
    setFollow(value => {
      const next = !value
      onFollowChange?.(next)
      if (next && trackingPosition && mapRef.current) {
        const [longitude, latitude] = trackingPosition.coordinates
        mapRef.current.panTo({ lat: latitude, lng: longitude })
      }
      return next
    })
  }

  return <div className="flood-map-container" role="region" aria-label="Interactive Google Maps rescue map">
    {controlsSlot}
    {(!compact || (showRouteControl && trackingPosition)) && <div className="flood-map-controls">
      {!compact && <div className="flood-map-legend-items">
        <span className="legend-tag legend-safe">● Passable ({metadata.stats.passableCount})</span>
        <span className="legend-tag legend-restricted">▲ Restricted ({metadata.stats.restrictedCount})</span>
        <span className="legend-tag legend-impassable">✕ Impassable ({metadata.stats.impassableCount})</span>
      </div>}
      <div className="flood-map-toggles">
        {!compact && <button type="button" className={`map-toggle-btn ${floodVisible ? 'is-active' : ''}`} onClick={() => setFloodVisible(value => !value)}>Flood scenario: {floodVisible ? 'ON' : 'OFF'}</button>}
        {trackingPosition && <button type="button" className={`map-toggle-btn ${follow ? 'is-active' : ''}`} onClick={toggleFollow}>{follow ? 'Following rescuer' : 'Follow rescuer'}</button>}
        {showRouteControl && routePoints.length > 1 && <button type="button" className="map-toggle-btn" onClick={showFullRoute}>Show full route</button>}
        <button type="button" className="map-toggle-btn" onClick={recenter}>Recenter</button>
      </div>
    </div>}
    {!mapReady && !mapError && <div className="map-state-banner is-loading"><LoadingState layout="compact" label="Loading Google Maps…"/></div>}
    {mapError && <div className="map-state-banner is-error" role="alert"><Icon name="alert" size={16}/><span><strong>Google Maps unavailable:</strong> {mapError} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry map</button></span></div>}
    {layerStatus === 'loading' && <div className="map-state-banner is-loading"><LoadingState layout="compact" label="Loading road network and controlled flood scenario…"/></div>}
    {layerStatus === 'error' && <div className="map-state-banner is-error" role="alert"><Icon name="alert" size={16}/><span><strong>Map layer warning:</strong> {errorMessage || 'Fixture layers could not be loaded.'} Showing Google basemap and stations.</span></div>}
    {showRouteStatus && <RouteOverlay state={effectiveRouteState}/>}
    <div className="google-map-wrapper">
      <div ref={containerRef} className="google-map-canvas" id="google-rescue-map" style={{ width: '100%', height: 'var(--workspace-map-height, 460px)' }}/>
      <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
    {!compact && <div id={`${uid}-map-table`} className="map-accessible-summary">
      <p>{NON_LIVE_DATA_DISCLAIMER}</p>
      <details><summary>Accessible road and controlled flood summary ({metadata.scenarioId}) — {metadata.studyAreaName}</summary>
        {dataset?.edges.length ? <table className="map-text-alt-table"><thead><tr><th>Edge</th><th>Road</th><th>Length</th><th>Passability</th><th>Flood</th><th>Depth</th><th>Observed</th></tr></thead><tbody>{dataset.edges.map(edge => <tr key={edge.edgeId}><td>{edge.edgeId}</td><td>{edge.roadClass}</td><td>{edge.lengthM} m</td><td>{edge.passability}</td><td>{edge.floodLevel}</td><td>{edge.floodDepthCm === undefined ? '—' : `${edge.floodDepthCm} cm`}</td><td>{edge.observedAt}</td></tr>)}</tbody></table> : <p>No road records available to display.</p>}
      </details>
    </div>}
  </div>
}
