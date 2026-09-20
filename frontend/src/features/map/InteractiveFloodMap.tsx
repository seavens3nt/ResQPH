import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '../../components/art/Icon'
import './map.css'

interface MapProps {
  activeStage?: 'pending' | 'assigned' | 'en-route' | 'arrived' | 'completed' | 'all'
  highlightStreet?: string
  showAlternatives?: boolean
  selectedRoute?: 'primary' | 'alternative' | 'override'
  onSelectRoute?: (route: 'primary' | 'alternative') => void
  routeExplanation?: string
  etaMinutes?: number
}

const TILE_PROVIDERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  dark: {
    name: 'Tactical Dark OSM',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; CARTO',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, OpenStreetMap contributors',
    maxZoom: 19,
  },
}

export function InteractiveFloodMap({
  activeStage = 'en-route',
  showAlternatives = true,
  selectedRoute = 'primary',
  onSelectRoute,
  routeExplanation = 'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes "Loyola St.".',
  etaMinutes = 9,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const currentTileLayerRef = useRef<L.TileLayer | null>(null)
  const overlaysLayerGroupRef = useRef<L.LayerGroup | null>(null)

  const [mapLayerMode, setMapLayerMode] = useState<'osm' | 'dark' | 'satellite'>('osm')
  const [showFloodDepthLayer, setShowFloodDepthLayer] = useState(true)

  // Citizen distress target (Brgy. Tumana, Marikina City)
  const citizenTarget: [number, number] = [14.6532, 121.0912]

  // Safe corridor coordinates avoiding flooded lowlands
  const safeCorridorCoords: [number, number][] = [
    [14.6380, 121.0740], // Dispatch Hub
    [14.6425, 121.0785], // High Ground Elevation
    [14.6468, 121.0832], // Waypoint 2
    [14.6502, 121.0875], // Approach Corridor
    [14.6532, 121.0912], // Target Destination
  ]

  // Alternative Detour coordinates
  const detourCoords: [number, number][] = [
    [14.6380, 121.0740],
    [14.6410, 121.0820],
    [14.6480, 121.0930],
    [14.6532, 121.0912],
  ]

  // Impassable Street Segment (Loyola St.)
  const impassableStreetCoords: [number, number][] = [
    [14.6450, 121.0810],
    [14.6485, 121.0865],
    [14.6515, 121.0898],
  ]

  // Flood Inundation polygon zones (NOAH Hydrodynamic Model)
  const severeFloodPolygon: [number, number][] = [
    [14.6565, 121.0875],
    [14.6545, 121.0945],
    [14.6495, 121.0935],
    [14.6475, 121.0860],
    [14.6515, 121.0845],
  ]

  const moderateFloodPolygon: [number, number][] = [
    [14.6460, 121.0790],
    [14.6485, 121.0845],
    [14.6440, 121.0860],
    [14.6420, 121.0805],
  ]

  // Vehicle progress based on active stage
  const progressIdx =
    activeStage === 'pending'
      ? 0
      : activeStage === 'assigned'
        ? 1
        : activeStage === 'en-route'
          ? 2
          : activeStage === 'arrived'
            ? 3
            : 4

  const boatCurrentPos = safeCorridorCoords[progressIdx]

  // Initialize Leaflet Map with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    try {
      // Fix default marker icon issues in Leaflet when bundled with Vite
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapContainerRef.current, {
        center: [14.6485, 121.0860],
        zoom: 14,
        zoomControl: false,
      })

      // Add OpenStreetMap base tile layer
      const defaultProvider = TILE_PROVIDERS.osm
      const initialTile = L.tileLayer(defaultProvider.url, {
        attribution: defaultProvider.attribution,
        maxZoom: defaultProvider.maxZoom,
      }).addTo(map)
      currentTileLayerRef.current = initialTile

      // Add Zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map)

      // Add overlay group
      const overlayGroup = L.layerGroup().addTo(map)
      overlaysLayerGroupRef.current = overlayGroup

      mapInstanceRef.current = map
    } catch (err) {
      console.warn('Leaflet map initialization notice (headless or test environment):', err)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Switch Base Tile Layer when mapLayerMode changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    try {
      if (currentTileLayerRef.current) {
        map.removeLayer(currentTileLayerRef.current)
      }

      const provider = TILE_PROVIDERS[mapLayerMode]
      const newTileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
      }).addTo(map)

      currentTileLayerRef.current = newTileLayer
    } catch (err) {
      console.warn('Failed to switch tile layer:', err)
    }
  }, [mapLayerMode])

  // Update Map Overlays (Markers, Polylines, Flood Polygons)
  useEffect(() => {
    const map = mapInstanceRef.current
    const overlayGroup = overlaysLayerGroupRef.current
    if (!map || !overlayGroup) return

    try {
      overlayGroup.clearLayers()

      // 1. NOAH Hydrodynamic Flood Inundation Zones
      if (showFloodDepthLayer) {
        const severePoly = L.polygon(severeFloodPolygon, {
          color: '#dc2626',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.42,
          dashArray: '4, 4',
        }).bindPopup(`
          <div class="leaflet-popup-flood">
            <strong style="color:#ef4444;">CRITICAL FLOOD ZONE (>1.5m)</strong><br/>
            <span>Marikina River Basin Overflow · Impassable to light vehicles</span>
          </div>
        `)
        overlayGroup.addLayer(severePoly)

        const moderatePoly = L.polygon(moderateFloodPolygon, {
          color: '#f59e0b',
          weight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.32,
        }).bindPopup(`
          <div class="leaflet-popup-flood">
            <strong style="color:#f59e0b;">MODERATE FLOOD PONDING (0.5m - 0.8m)</strong><br/>
            <span>Knee-deep to waist-deep backflow</span>
          </div>
        `)
        overlayGroup.addLayer(moderatePoly)
      }

      // 2. Safe Corridor Polyline (Green glowing line)
      const safeLine = L.polyline(safeCorridorCoords, {
        color: selectedRoute === 'primary' ? '#22c55e' : '#16a34a',
        weight: selectedRoute === 'primary' ? 6 : 4,
        opacity: 0.9,
        dashArray: '8, 6',
      }).bindPopup(`
        <div class="leaflet-popup-route">
          <strong style="color:#22c55e;">RECOMMENDED SAFE ROUTE</strong><br/>
          <span>Jhocson St. Safe Corridor · Avoids Loyola flood barrier</span><br/>
          <span>ETA: ${etaMinutes} minutes</span>
        </div>
      `)
      safeLine.on('click', () => onSelectRoute?.('primary'))
      overlayGroup.addLayer(safeLine)

      // 3. Alternative Detour Polyline (Amber dashed line)
      if (showAlternatives) {
        const detourLine = L.polyline(detourCoords, {
          color: selectedRoute === 'alternative' ? '#f59e0b' : 'rgba(245, 158, 11, 0.55)',
          weight: selectedRoute === 'alternative' ? 6 : 3.5,
          dashArray: '6, 6',
        }).bindPopup(`
          <div class="leaflet-popup-route">
            <strong style="color:#f59e0b;">ALTERNATIVE DETOUR: GERARDO ST.</strong><br/>
            <span>Moderate water ponding (0.4m) · Secondary route</span>
          </div>
        `)
        detourLine.on('click', () => onSelectRoute?.('alternative'))
        overlayGroup.addLayer(detourLine)
      }

      // 4. Impassable Loyola St. Barrier Polyline
      const impassableLine = L.polyline(impassableStreetCoords, {
        color: '#dc2626',
        weight: 8,
        opacity: 0.95,
      }).bindPopup(`
        <div class="leaflet-popup-route">
          <strong style="color:#dc2626;">LOYOLA ST. — IMPASSABLE (1.4m DEPTH)</strong><br/>
          <span>Road blocked by torrential water depth. Automatically avoided.</span>
        </div>
      `)
      overlayGroup.addLayer(impassableLine)

      // 5. Citizen Distress Beacon Marker
      const citizenIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `
          <div class="pin-beacon-wrapper">
            <div class="pin-beacon-pulse"></div>
            <div class="pin-beacon-center red-beacon">
              <span>🚨</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const citizenMarker = L.marker(citizenTarget, { icon: citizenIcon }).bindPopup(`
        <div class="leaflet-popup-citizen">
          <strong style="color:#ef4444;">DISTRESS TARGET (BRGY. TUMANA)</strong><br/>
          <span>Coordinates: 14.6532° N, 121.0912° E</span><br/>
          <span>Headcount: 4 persons · Chest-deep flood</span>
        </div>
      `)
      overlayGroup.addLayer(citizenMarker)

      // 6. Rescue Unit / Boat Marker
      const boatIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `
          <div class="pin-beacon-wrapper">
            <div class="pin-beacon-center boat-beacon">
              <span>🚤</span>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const boatMarker = L.marker(boatCurrentPos, { icon: boatIcon }).bindPopup(`
        <div class="leaflet-popup-rescuer">
          <strong style="color:#38bdf8;">Rescue Team Alpha (Boat Unit)</strong><br/>
          <span>Status: En Route · Safe Corridor</span><br/>
          <span>ETA: ${etaMinutes} minutes</span>
        </div>
      `)
      overlayGroup.addLayer(boatMarker)

      // 7. Evacuation Center Marker (Concepcion / NU Gym)
      const evacIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `
          <div class="pin-beacon-wrapper">
            <div class="pin-beacon-center evac-beacon">
              <span>🏫</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const evacMarker = L.marker([14.6510, 121.0990], { icon: evacIcon }).bindPopup(`
        <div class="leaflet-popup-evac">
          <strong style="color:#22c55e;">Evacuation Center (Concepcion Elementary)</strong><br/>
          <span>Capacity: 70% occupied · Hot meals & medical staff</span>
        </div>
      `)
      overlayGroup.addLayer(evacMarker)
    } catch (err) {
      console.warn('Error rendering Leaflet overlays:', err)
    }
  }, [
    showFloodDepthLayer,
    showAlternatives,
    selectedRoute,
    activeStage,
    etaMinutes,
    onSelectRoute,
  ])

  function handleRecenter() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([14.6485, 121.0860], 14)
    }
  }

  return (
    <div className="flood-map-container" role="region" aria-label="Interactive Realistic Flood-Aware Rescue Map">
      {/* Top Map HUD & Cartography Controls */}
      <div className="flood-map-controls">
        <div className="flood-map-legend-items">
          <span className="legend-tag legend-study">
            🗺️ OpenStreetMap Live GIS · 14.6532° N, 121.0912° E
          </span>
          <span className="legend-tag legend-safe">
            ● Safe Transit (Jhocson Corridor · {etaMinutes}m ETA)
          </span>
          <span className="legend-tag legend-impassable">
            ✕ Loyola St. (Impassable: 1.4m Depth)
          </span>
        </div>

        <div className="flood-map-toggles">
          <button
            type="button"
            className={`map-toggle-btn ${mapLayerMode === 'osm' ? 'is-active' : ''}`}
            onClick={() => setMapLayerMode('osm')}
            title="Standard OpenStreetMap Cartography"
          >
            OpenStreetMap
          </button>
          <button
            type="button"
            className={`map-toggle-btn ${mapLayerMode === 'dark' ? 'is-active' : ''}`}
            onClick={() => setMapLayerMode('dark')}
            title="Tactical Night Response OpenStreetMap"
          >
            Tactical Dark
          </button>
          <button
            type="button"
            className={`map-toggle-btn ${mapLayerMode === 'satellite' ? 'is-active' : ''}`}
            onClick={() => setMapLayerMode('satellite')}
            title="Satellite Aerial Imagery"
          >
            Satellite View
          </button>
          <button
            type="button"
            className={`map-toggle-btn ${showFloodDepthLayer ? 'is-active' : ''}`}
            onClick={() => setShowFloodDepthLayer((v) => !v)}
            title="Toggle UP NOAH Hydrodynamic Inundation Contours"
          >
            NOAH Flood Depth: {showFloodDepthLayer ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="map-toggle-btn"
            onClick={handleRecenter}
            title="Recenter Map on Target"
          >
            Recenter
          </button>
        </div>
      </div>

      {/* Dynamic Real-Time Route Update Banner over the Map */}
      <div className="map-realtime-routing-banner">
        <div className="banner-pulse-icon">
          <Icon name="route" size={18} />
        </div>
        <div className="banner-text">
          <strong>EN ROUTE REAL-TIME TELEMETRY:</strong>{' '}
          <span>{routeExplanation}</span>
        </div>
        <span className="banner-eta-badge font-mono">ETA: {etaMinutes} MINS</span>
      </div>

      {/* OpenStreetMap Live Leaflet Interactive Canvas */}
      <div className="flood-map-leaflet-wrapper">
        <div
          ref={mapContainerRef}
          className={`flood-map-leaflet-canvas ${mapLayerMode === 'dark' ? 'leaflet-theme-dark' : ''}`}
          id="openmap-hazard-map"
          style={{ width: '100%', height: '460px' }}
        />
      </div>

      {/* Map Bottom Rationale Drawer */}
      <div className="flood-map-explanation">
        <div className="explanation-head">
          <div className="explanation-title">
            <Icon name="shield" size={16} />
            <span>Hydrodynamic Flood Routing Engine Rationale</span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--color-brand-hover)' }}>
            LiPAD Hazard & Elevation Matrix Active
          </span>
        </div>
        <div className="explanation-body">
          <div className="explanation-row">
            <span className="exp-badge exp-avoided">AVOIDED SHORTCUT</span>
            <span className="exp-text">
              <strong>Loyola St. Shortcut:</strong> Water depth reaches <strong>1.40 m</strong> (waist/chest current),
              which exceeds the safe rescue craft threshold (<strong>0.30 m</strong>). High probability of engine stall.
            </span>
          </div>
          <div className="explanation-row">
            <span className="exp-badge exp-selected">ACTIVE SAFE ROUTE</span>
            <span className="exp-text">
              <strong>Jhocson St. Corridor:</strong> High elevation (4.2m AMSL). Minimal surface runoff (0.12m).
              Safety Score: <strong>94/100</strong>. Unit ETA: <strong>{etaMinutes} minutes</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
