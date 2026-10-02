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
    expect(parsed.features[0].properties.edge_id).toBeTruthy()
    expect(parsed.features[0].geometry.type).toBe('LineString')
  })

  it('parses authoritative locked flood scenario fixture', () => {
    const parsed = parseFloodScenarioFixture(LOCKED_FLOOD_SCENARIO_FIXTURE)
    expect(parsed.type).toBe('FeatureCollection')
    expect(parsed.scenario?.scenario_id).toBeTruthy()
    expect(parsed.features.length).toBeGreaterThan(0)
    expect(parsed.features[0].properties.edge_id).toBeTruthy()
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

  it('rejects duplicate road edge IDs before rendering', () => {
    const fixture = structuredClone(LOCKED_ROAD_EDGE_FIXTURE) as {
      features: unknown[]
    }
    fixture.features.push(structuredClone(fixture.features[0]))
    expect(() => parseRoadEdgeFixture(fixture)).toThrow(/duplicate edge_id/i)
  })

  it('rejects unsupported live source labels instead of presenting them as controlled data', () => {
    const fixture = structuredClone(LOCKED_FLOOD_SCENARIO_FIXTURE) as {
      scenario: { source_type: string }
    }
    fixture.scenario.source_type = 'live'
    expect(() => parseFloodScenarioFixture(fixture)).toThrow(/Malformed flood scenario GeoJSON/i)
  })

  it('rejects duplicate flood edge IDs before joining them to roads', () => {
    const fixture = structuredClone(LOCKED_FLOOD_SCENARIO_FIXTURE) as {
      features: unknown[]
    }
    fixture.features.push(structuredClone(fixture.features[0]))
    expect(() => parseFloodScenarioFixture(fixture)).toThrow(/duplicate edge_id/i)
  })
})

describe('mapData - buildMapLayerDataset Adapter', () => {
  it('joins road and flood attributes by stable edge_id and calculates statistics', () => {
    const dataset = buildMapLayerDataset(
      LOCKED_ROAD_EDGE_FIXTURE,
      LOCKED_FLOOD_SCENARIO_FIXTURE,
      LOCKED_STUDY_AREA_FIXTURE,
    )

    const parsedRoads = parseRoadEdgeFixture(LOCKED_ROAD_EDGE_FIXTURE)
    const parsedFlood = parseFloodScenarioFixture(LOCKED_FLOOD_SCENARIO_FIXTURE)

    expect(dataset.scenarioId).toBe(parsedFlood.scenario?.scenario_id)
    expect(dataset.sourceType).toBe(parsedFlood.scenario?.source_type)
    expect(dataset.isLive).toBe(false)
    expect(dataset.fixtureNotice).toBeTruthy()

    // The assertions deliberately derive from the checked-in fixtures so the
    // same test becomes the compatibility gate when Issue #32 replaces them.
    expect(dataset.edges).toHaveLength(parsedRoads.features.length)
    for (const road of parsedRoads.features) {
      const joined = dataset.edges.find((edge) => edge.edgeId === road.properties.edge_id)
      const flood = parsedFlood.features.find(
        (feature) => feature.properties.edge_id === road.properties.edge_id,
      )
      expect(joined).toBeDefined()
      expect(joined?.geojsonCoordinates).toEqual(road.geometry.coordinates)
      expect(joined?.leafletCoordinates[0]).toEqual([
        road.geometry.coordinates[0][1],
        road.geometry.coordinates[0][0],
      ])
      if (flood) {
        expect(joined?.passability).toBe(flood.properties.passability)
        expect(joined?.floodLevel).toBe(flood.properties.flood_level)
        expect(joined?.floodDepthCm).toBe(flood.properties.flood_depth_cm)
      }
    }

    // Every rendered edge is represented exactly once in the status totals.
    expect(dataset.stats.totalEdges).toBe(parsedRoads.features.length)
    expect(
      dataset.stats.passableCount +
        dataset.stats.restrictedCount +
        dataset.stats.impassableCount,
    ).toBe(dataset.stats.totalEdges)

    // Check study area boundary
    expect(dataset.studyArea.name).toMatch(/U-Belt/i)
    expect(dataset.studyArea.leafletPolygon.length).toBeGreaterThanOrEqual(4)
  })

  it('rejects a flood fixture assigned to a different study area', () => {
    const floodFixture = structuredClone(LOCKED_FLOOD_SCENARIO_FIXTURE) as {
      scenario: { study_area_id: string }
    }
    floodFixture.scenario.study_area_id = 'different-study-area'

    expect(() =>
      buildMapLayerDataset(
        LOCKED_ROAD_EDGE_FIXTURE,
        floodFixture,
        LOCKED_STUDY_AREA_FIXTURE,
      ),
    ).toThrow(/Fixture contract mismatch/i)
  })

  it('exposes non-live disclaimer constant', () => {
    expect(NON_LIVE_DATA_DISCLAIMER).toMatch(/Controlled scenario data/i)
    expect(NON_LIVE_DATA_DISCLAIMER).toMatch(/Not live/i)
  })
})
