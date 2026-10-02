import { useEffect, useId, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '../../components/art/Icon'
import { NON_LIVE_DATA_DISCLAIMER } from './mapData'
import { useMapLayers, type UseMapLayersOptions } from './useMapLayers'
import './map.css'

export interface MapProps extends UseMapLayersOptions {
  activeStage?: 'pending' | 'assigned' | 'en-route' | 'arrived' | 'completed' | 'all' | 'none'
  highlightStreet?: string
  showAlternatives?: boolean
  selectedRoute?: 'primary' | 'alternative' | 'override'
  onSelectRoute?: (route: 'primary' | 'alternative') => void
  showRouteAdvisory?: boolean
  showRouteRationale?: boolean
  routeExplanation?: string
  etaMinutes?: number
  operationContext?: {
    requestId: string
    address: string
    headcount: number
    teamName: string
    status: string
    routeName: string
  }
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

const TILE_PROVIDERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, OpenStreetMap contributors',
    maxZoom: 19,
  },
}

// Sanitized pilot mission route coordinates in U-Belt
const CITIZEN_TARGET: [number, number] = [14.6042, 120.9946]

const SAFE_CORRIDOR_COORDS: [number, number][] = [
  [14.6005, 120.9875], // Simulated dispatch hub
  [14.6018, 120.9892], // Waypoint 1
  [14.6028, 120.9910], // Waypoint 2
  [14.6036, 120.9930], // Approach corridor
  [14.6042, 120.9946], // Sanitized destination
]

const DETOUR_COORDS: [number, number][] = [
  [14.6005, 120.9875],
  [14.6020, 120.9905],
  [14.6050, 120.9930],
  [14.6042, 120.9946],
]

export function InteractiveFloodMap({
  activeStage = 'en-route',
  showAlternatives = true,
  selectedRoute = 'primary',
  onSelectRoute,
  showRouteAdvisory = false,
  routeExplanation = 'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and team is using Jhocson St.',
  etaMinutes = 9,
  operationContext,
  roadFixture,
  floodFixture,
  studyAreaFixture,
  simulatedState,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const currentTileLayerRef = useRef<L.TileLayer | null>(null)
  const overlaysLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const uid = useId()

  const [mapLayerMode, setMapLayerMode] = useState<'osm' | 'satellite'>('osm')
  const [showTextAlt, setShowTextAlt] = useState(false)

  // Fixture-driven layer state hook
  const {
    status: layerStatus,
    errorMessage,
    dataset,
    metadata,
    layerVisibility,
    toggleLayer,
  } = useMapLayers({
    roadFixture,
    floodFixture,
    studyAreaFixture,
    simulatedState,
  })

  // Vehicle progress based on active stage
  const progressIdx =
    activeStage === 'none'
      ? -1
      : activeStage === 'pending'
      ? 0
      : activeStage === 'assigned'
        ? 1
        : activeStage === 'en-route'
          ? 2
          : activeStage === 'arrived'
            ? 3
            : 4

  const boatCurrentPos = SAFE_CORRIDOR_COORDS[progressIdx]

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapContainerRef.current, {
        center: [14.6040, 120.9940],
        zoom: 15,
        zoomControl: false,
      })

      const defaultProvider = TILE_PROVIDERS.osm
      const initialTile = L.tileLayer(defaultProvider.url, {
        attribution: defaultProvider.attribution,
        maxZoom: defaultProvider.maxZoom,
      }).addTo(map)
      currentTileLayerRef.current = initialTile

      L.control.zoom({ position: 'topright' }).addTo(map)

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

  // Switch Tile Layer
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

  // Update Dynamic Map Overlays from Adapter Dataset
  useEffect(() => {
    const map = mapInstanceRef.current
    const overlayGroup = overlaysLayerGroupRef.current
    if (!map || !overlayGroup) return

    try {
      overlayGroup.clearLayers()

      // 1. Study Area Pilot Boundary Polygon
      if (layerVisibility.boundary && dataset?.studyArea.leafletPolygon.length) {
        const boundaryPoly = L.polygon(dataset.studyArea.leafletPolygon, {
          color: '#3b82f6',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.04,
          dashArray: '6, 6',
        }).bindPopup(`
          <div class="leaflet-popup-edge">
            <strong style="color:#60a5fa;">${escapeHtml(dataset.studyArea.name)}</strong><br/>
            <span>Approved WGS 84 Pilot Boundary (EPSG:4326)</span><br/>
            <span>Approved: ${escapeHtml(dataset.studyArea.approvedOn)}</span>
          </div>
        `)
        overlayGroup.addLayer(boundaryPoly)
      }

      // 2. Fixture-driven Road Network Edges
      if (layerVisibility.roads && dataset?.edges.length) {
        for (const edge of dataset.edges) {
          const isImpassable = edge.passability === 'impassable'
          const isRestricted = edge.passability === 'restricted'

          const edgeColor = isImpassable ? '#dc2626' : isRestricted ? '#f59e0b' : '#22c55e'
          const edgeWeight = isImpassable ? 6 : isRestricted ? 5 : 4
          const dashArray = isRestricted ? '6, 4' : undefined

          const polyline = L.polyline(edge.leafletCoordinates, {
            color: edgeColor,
            weight: edgeWeight,
            opacity: 0.9,
            dashArray,
          }).bindPopup(`
            <div class="leaflet-popup-edge">
              <strong style="color:${edgeColor};">${escapeHtml(edge.edgeId)} (${escapeHtml(edge.roadClass)})</strong><br/>
              <span>Length: ${edge.lengthM}m · Nodes: ${escapeHtml(edge.fromNode)} &rarr; ${escapeHtml(edge.toNode)}</span><br/>
              <span>Passability: <strong>${edge.passability.toUpperCase()}</strong></span><br/>
              <span>Flood: ${escapeHtml(edge.floodLevel)}${edge.floodDepthCm ? ` (${edge.floodDepthCm}cm depth)` : ''}</span><br/>
              <span>Source: ${escapeHtml(edge.sourceType)} · ${escapeHtml(edge.observedAt)}</span>
              ${edge.reason ? `<br/><em>${escapeHtml(edge.reason)}</em>` : ''}
            </div>
          `)
          overlayGroup.addLayer(polyline)
        }
      }

      // 3. Controlled-Scenario Flood Polygons / Flood Lines
      if (layerVisibility.flood && dataset?.floodFeatures.length) {
        for (const flood of dataset.floodFeatures) {
          if (flood.geometryType === 'Polygon' && Array.isArray(flood.leafletCoordinates)) {
            const isCritical = flood.passability === 'impassable' || flood.floodLevel === 'severe'
            const poly = L.polygon(flood.leafletCoordinates, {
              color: isCritical ? '#dc2626' : '#f59e0b',
              weight: 2,
              fillColor: isCritical ? '#ef4444' : '#f59e0b',
              fillOpacity: isCritical ? 0.42 : 0.3,
              dashArray: isCritical ? '4, 4' : undefined,
            }).bindPopup(`
              <div class="leaflet-popup-flood">
                <strong style="color:${isCritical ? '#ef4444' : '#f59e0b'};">
                  ${isCritical ? 'CRITICAL FLOOD ZONE' : 'MODERATE FLOOD PONDING'}
                </strong><br/>
                <span>${escapeHtml(flood.floodLevel)} · ${flood.floodDepthCm ? `${flood.floodDepthCm} cm depth` : 'Controlled depth'}</span><br/>
                <span>Passability: ${escapeHtml(flood.passability)}</span>
                ${flood.reason ? `<br/><span>${escapeHtml(flood.reason)}</span>` : ''}
              </div>
            `)
            overlayGroup.addLayer(poly)
          }
        }
      }

      // 4. Mission Route & Vehicle Overlay
      if (layerVisibility.route) {
        // Safe Recommended Route Line
        const safeLine = L.polyline(SAFE_CORRIDOR_COORDS, {
          color: selectedRoute === 'primary' ? '#22c55e' : '#16a34a',
          weight: selectedRoute === 'primary' ? 6 : 4,
          opacity: 0.9,
          dashArray: '8, 6',
        }).bindPopup(`
          <div class="leaflet-popup-route">
            <strong style="color:#22c55e;">RECOMMENDED ROUTE</strong><br/>
            <span>Jhocson St. corridor · Avoids an impassable controlled-scenario edge</span><br/>
            <span>ETA: ${etaMinutes} minutes</span>
          </div>
        `)
        safeLine.on('click', () => onSelectRoute?.('primary'))
        overlayGroup.addLayer(safeLine)

        // Alternative Detour Line
        if (showAlternatives) {
          const detourLine = L.polyline(DETOUR_COORDS, {
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

        // Citizen Distress Beacon Marker
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

        const citizenMarker = L.marker(CITIZEN_TARGET, { icon: citizenIcon }).bindPopup(`
          <div class="leaflet-popup-citizen">
            <strong style="color:#ef4444;">${operationContext ? `RESCUE TARGET · ${escapeHtml(operationContext.requestId)}` : 'SANITIZED U-BELT STUDY TARGET'}</strong><br/>
            <span>${operationContext ? escapeHtml(operationContext.address) : 'Controlled U-Belt pilot location'}</span><br/>
            <span>${operationContext ? `${operationContext.headcount} people · ${escapeHtml(operationContext.status.replace('-', ' '))}` : 'Sanitized demonstration target'}</span>
          </div>
        `)
        overlayGroup.addLayer(citizenMarker)

        // Rescue Boat Marker
        if (boatCurrentPos) {
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
              <strong style="color:#38bdf8;">${operationContext ? escapeHtml(operationContext.teamName) : 'Simulated Rescue Unit'}</strong><br/>
              <span>${operationContext ? `Status: ${escapeHtml(operationContext.status.replace('-', ' '))} · Assigned route` : 'Status: Controlled scenario only'}</span><br/>
              <span>ETA: ${etaMinutes} minutes</span>
            </div>
          `)
          overlayGroup.addLayer(boatMarker)
        }

        // Evacuation Center Marker
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

        const evacMarker = L.marker([14.6050, 120.9930], { icon: evacIcon }).bindPopup(`
          <div class="leaflet-popup-evac">
            <strong style="color:#22c55e;">Evacuation Center (Sanitized U-Belt Pilot)</strong><br/>
            <span>Capacity: 70% occupied · Hot meals & medical staff</span>
          </div>
        `)
        overlayGroup.addLayer(evacMarker)
      }
    } catch (err) {
      console.warn('Error rendering Leaflet overlays:', err)
    }
  }, [
    dataset,
    layerVisibility,
    showAlternatives,
    selectedRoute,
    activeStage,
    etaMinutes,
    operationContext,
    onSelectRoute,
    boatCurrentPos,
  ])

  function handleRecenter() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([14.6042, 120.9946], 15)
    }
  }

  return (
    <div className="flood-map-container" role="region" aria-label="Interactive Realistic Flood-Aware Rescue Map">
      {/* Top Map HUD & Cartography Controls */}
      <div className="flood-map-controls">
        <div className="flood-map-controls__summary">
          <div className="flood-map-location">
            <span className="flood-map-location__eyebrow">CONTROLLED STUDY AREA</span>
            <strong>U-Belt Pilot · 14.6042° N, 120.9946° E</strong>
          </div>
          <div className="flood-map-legend-items" aria-label="Road passability legend">
            <span className="legend-tag legend-study">🗺️ OpenStreetMap · U-Belt controlled scenario</span>
            <span className="legend-tag legend-safe">● Passable ({metadata.stats.passableCount})</span>
            <span className="legend-tag legend-restricted">▲ Restricted ({metadata.stats.restrictedCount})</span>
            <span className="legend-tag legend-impassable">✕ Impassable ({metadata.stats.impassableCount})</span>
          </div>
        </div>

        <div className="map-control-row">
          <div className="map-base-layers" role="group" aria-label="Map style">
            <button
              type="button"
              className={`map-mode-btn ${mapLayerMode === 'osm' ? 'is-active' : ''}`}
              aria-pressed={mapLayerMode === 'osm'}
              onClick={() => setMapLayerMode('osm')}
              title="Standard OpenStreetMap Cartography"
            >
              OpenStreetMap
            </button>
            <button
              type="button"
              className={`map-mode-btn ${mapLayerMode === 'satellite' ? 'is-active' : ''}`}
              aria-pressed={mapLayerMode === 'satellite'}
              onClick={() => setMapLayerMode('satellite')}
              title="Satellite Aerial Imagery"
            >
              Satellite View
            </button>
          </div>

          <div className="flood-map-toggles" role="group" aria-label="Map overlays and view controls">
            <button
              type="button"
              className={`map-toggle-btn ${layerVisibility.roads ? 'is-active' : ''}`}
              aria-pressed={layerVisibility.roads}
              onClick={() => toggleLayer('roads')}
              title="Toggle Road Network Layer"
            >
              Roads: {layerVisibility.roads ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`map-toggle-btn ${layerVisibility.flood ? 'is-active' : ''}`}
              aria-pressed={layerVisibility.flood}
              onClick={() => toggleLayer('flood')}
              title="Toggle Flood Scenario Layer"
            >
              Flood Hazard: {layerVisibility.flood ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`map-toggle-btn ${layerVisibility.boundary ? 'is-active' : ''}`}
              aria-pressed={layerVisibility.boundary}
              onClick={() => toggleLayer('boundary')}
              title="Toggle U-Belt Pilot Boundary"
            >
              Boundary: {layerVisibility.boundary ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className="map-toggle-btn map-recenter-btn"
              aria-label="Recenter map on study area"
              onClick={handleRecenter}
              title="Recenter Map on Target"
            >
              Recenter
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Metadata & Non-live Disclaimer Sub-bar */}
      <div className="map-metadata-bar">
        <div className="map-metadata-left">
          <span className="map-meta-item">
            <span>Scenario:</span>
            <strong className="map-meta-tag">{metadata.scenarioId}</strong>
          </span>
          <span className="map-meta-item">
            <span>Source:</span>
            <strong className="map-meta-tag">{metadata.sourceType.toUpperCase()}</strong>
          </span>
          <span className="map-meta-item">
            <span>Timestamp:</span>
            <strong className="map-meta-tag">{metadata.scenarioTimestamp}</strong>
          </span>
        </div>
        <div className="map-metadata-right">
          <span className="map-disclaimer-notice">
            <Icon name="alert" size={14} />
            <span>{NON_LIVE_DATA_DISCLAIMER}</span>
          </span>
          <button
            type="button"
            className={`map-toggle-btn ${showTextAlt ? 'is-active' : ''}`}
            onClick={() => setShowTextAlt((v) => !v)}
            aria-expanded={showTextAlt}
            aria-controls={`${uid}-map-table`}
          >
            {showTextAlt ? 'Hide Text Alternative' : 'View Text Alternative'}
          </button>
        </div>
      </div>

      {/* State Banners (Loading, Empty, Error) */}
      {layerStatus === 'loading' && (
        <div className="map-state-banner is-loading" role="status">
          <Icon name="clock" size={16} />
          <span>Loading road network and flood scenario map layers…</span>
        </div>
      )}

      {layerStatus === 'empty' && (
        <div className="map-state-banner is-empty" role="status">
          <Icon name="alert" size={16} />
          <span>No road edges or flood scenario records found in this fixture. Showing base cartography.</span>
        </div>
      )}

      {layerStatus === 'error' && (
        <div className="map-state-banner is-error" role="alert">
          <Icon name="alert" size={16} />
          <span>
            <strong>Map Layer Warning:</strong> {errorMessage || 'Failed to load geospatial layers.'} Showing base map.
          </span>
        </div>
      )}

      {/* OpenStreetMap Leaflet Canvas */}
      <div className="flood-map-leaflet-wrapper">
        <div
          ref={mapContainerRef}
          className="flood-map-leaflet-canvas"
          id="openmap-hazard-map"
          style={{ width: '100%', height: '460px' }}
        />
      </div>

      {/* Accessible Text / Table Alternative for Essential Geospatial Data */}
      {showTextAlt && (
        <div id={`${uid}-map-table`} className="map-text-alternative" aria-label="Accessible Road Network Data Table">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.84rem', color: '#f4f4f5' }}>
              Accessible Road Network & Flood Passability Summary ({metadata.scenarioId})
            </strong>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
              Study Area: {metadata.studyAreaName}
            </span>
          </div>
          {dataset?.edges.length ? (
            <table className="map-text-alt-table">
              <thead>
                <tr>
                  <th>Edge ID</th>
                  <th>Road Class</th>
                  <th>Length</th>
                  <th>Passability</th>
                  <th>Flood Level</th>
                  <th>Depth</th>
                  <th>Observed Time</th>
                </tr>
              </thead>
              <tbody>
                {dataset.edges.map((edge) => (
                  <tr key={edge.edgeId}>
                    <td className="font-mono">{edge.edgeId}</td>
                    <td>{edge.roadClass}</td>
                    <td>{edge.lengthM}m</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            edge.passability === 'impassable'
                              ? '#f87171'
                              : edge.passability === 'restricted'
                                ? '#fbbf24'
                                : '#4ade80',
                        }}
                      >
                        {edge.passability.toUpperCase()}
                      </span>
                    </td>
                    <td>{edge.floodLevel}</td>
                    <td>{edge.floodDepthCm !== undefined ? `${edge.floodDepthCm} cm` : '—'}</td>
                    <td className="font-mono">{edge.observedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '0.78rem', color: '#a1a1aa', margin: '8px 0 0' }}>
              No road records available to display.
            </p>
          )}
        </div>
      )}

    </div>
  )
}
