import { describe, expect, it } from 'vitest'
import {
  UBELT_BOUNDS,
  NON_LIVE_DATA_DISCLAIMER,
  isWithinUBeltBounds,
  geojsonToLeafletLatLng,
  geojsonLineToLeaflet,
  geojsonPolygonToLeaflet,
  parseRoadEdgeFixture,
  parseFloodScenarioFixture,
  parseStudyAreaFixture,
  buildMapLayerDataset,
  LOCKED_ROAD_EDGE_FIXTURE,
  LOCKED_FLOOD_SCENARIO_FIXTURE,
  LOCKED_STUDY_AREA_FIXTURE,
} from './mapData'

describe('mapData - Geospatial Coordinate & Boundary Helpers', () => {
  it('correctly validates coordinates within U-Belt pilot boundary', () => {
    // Center of U-Belt pilot (120.9946, 14.6042)
    expect(isWithinUBeltBounds(120.9946, 14.6042)).toBe(true)
    // Boundary edge corners
    expect(isWithinUBeltBounds(UBELT_BOUNDS.minLng, UBELT_BOUNDS.minLat)).toBe(true)
    expect(isWithinUBeltBounds(UBELT_BOUNDS.maxLng, UBELT_BOUNDS.maxLat)).toBe(true)

    // Outside U-Belt (Quezon City or Marikina)
    expect(isWithinUBeltBounds(121.086, 14.6485)).toBe(false)
    // Invalid/non-finite
    expect(isWithinUBeltBounds(NaN, 14.6042)).toBe(false)
  })

  it('converts GeoJSON [lng, lat] order to Leaflet [lat, lng] order', () => {
    const geojsonPoint: [number, number] = [120.9946, 14.6042]
    const leafletPoint = geojsonToLeafletLatLng(geojsonPoint)
    expect(leafletPoint).toEqual([14.6042, 120.9946])
  })

  it('converts GeoJSON LineString coordinates to Leaflet lat/lng array', () => {
    const line: [number, number][] = [
      [120.994, 14.6035],
      [120.9946, 14.6042],
    ]
    const leafletLine = geojsonLineToLeaflet(line)
    expect(leafletLine).toEqual([
      [14.6035, 120.994],
      [14.6042, 120.9946],
    ])
  })

  it('converts GeoJSON Polygon ring to Leaflet coordinates', () => {
    const ring: [number, number][] = [
      [120.982, 14.596],
      [121.004, 14.596],
      [121.004, 14.6175],
    ]
    const leafletRing = geojsonPolygonToLeaflet(ring)
    expect(leafletRing).toEqual([
      [14.596, 120.982],
      [14.596, 121.004],
      [14.6175, 121.004],
    ])
  })
})

describe('mapData - Fixture Parsing & Validation', () => {
  it('parses authoritative locked road edge fixture', () => {
    const parsed = parseRoadEdgeFixture(LOCKED_ROAD_EDGE_FIXTURE)
    expect(parsed.type).toBe('FeatureCollection')
    expect(parsed.features.length).toBeGreaterThan(0)
    expect(parsed.features[0].properties.edge_id).toBe('edge-demo-001')
    expect(parsed.features[0].geometry.type).toBe('LineString')
  })

  it('parses authoritative locked flood scenario fixture', () => {
    const parsed = parseFloodScenarioFixture(LOCKED_FLOOD_SCENARIO_FIXTURE)
    expect(parsed.type).toBe('FeatureCollection')
    expect(parsed.scenario?.scenario_id).toBe('scenario-controlled-001')
    expect(parsed.features.length).toBeGreaterThan(0)
    expect(parsed.features[0].properties.edge_id).toBe('edge-demo-001')
  })

  it('parses authoritative locked study area fixture', () => {
    const parsed = parseStudyAreaFixture(LOCKED_STUDY_AREA_FIXTURE)
    expect(parsed.type).toBe('FeatureCollection')
    expect(parsed.features[0].properties.study_area_id).toBe('ubelt-pilot-v1')
    expect(parsed.features[0].properties.live_operational_boundary).toBe(false)
  })

  it('throws descriptive error on malformed road GeoJSON (missing coordinates)', () => {
    const malformed = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { edge_id: 'bad-edge' },
          geometry: { type: 'LineString', coordinates: [] }, // too short
        },
      ],
    }
    expect(() => parseRoadEdgeFixture(malformed)).toThrow(/Malformed road edge GeoJSON/)
  })

  it('throws descriptive error when road edge coordinate is outside approved U-Belt boundary', () => {
    const outsideBoundary = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            edge_id: 'edge-out-of-bounds',
            from_node: 'n1',
            to_node: 'n2',
            length_m: 100,
            road_class: 'primary',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [121.086, 14.6485], // Outside U-Belt
              [121.088, 14.649],
            ],
          },
        },
      ],
    }
    expect(() => parseRoadEdgeFixture(outsideBoundary)).toThrow(/outside approved U-Belt pilot boundary/)
  })
})

describe('mapData - buildMapLayerDataset Adapter', () => {
  it('joins road and flood attributes by stable edge_id and calculates statistics', () => {
    const dataset = buildMapLayerDataset(
      LOCKED_ROAD_EDGE_FIXTURE,
      LOCKED_FLOOD_SCENARIO_FIXTURE,
      LOCKED_STUDY_AREA_FIXTURE,
    )

    expect(dataset.scenarioId).toBe('scenario-controlled-001')
    expect(dataset.sourceType).toBe('controlled')
    expect(dataset.isLive).toBe(false)
    expect(dataset.fixtureNotice).toMatch(/Synthetic|controlled/i)

    // Check edge joining
    expect(dataset.edges.length).toBe(1)
    const joinedEdge1 = dataset.edges.find((e) => e.edgeId === 'edge-demo-001')
    expect(joinedEdge1).toBeDefined()
    expect(joinedEdge1?.passability).toBe('restricted')
    expect(joinedEdge1?.floodLevel).toBe('moderate')
    expect(joinedEdge1?.floodDepthCm).toBe(30)
    expect(joinedEdge1?.leafletCoordinates[0]).toEqual([14.6035, 120.994])

    // Check statistics
    expect(dataset.stats.totalEdges).toBe(1)
    expect(dataset.stats.passableCount).toBe(0)
    expect(dataset.stats.restrictedCount).toBe(1)
    expect(dataset.stats.impassableCount).toBe(0)

    // Check study area boundary
    expect(dataset.studyArea.name).toMatch(/U-Belt/i)
    expect(dataset.studyArea.leafletPolygon.length).toBeGreaterThanOrEqual(4)
  })

  it('exposes non-live disclaimer constant', () => {
    expect(NON_LIVE_DATA_DISCLAIMER).toMatch(/Controlled scenario data/i)
    expect(NON_LIVE_DATA_DISCLAIMER).toMatch(/Not live/i)
  })
})
