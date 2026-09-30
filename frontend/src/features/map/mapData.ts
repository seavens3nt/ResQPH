import { z } from 'zod'

/**
 * U-Belt Pilot Bounding Box (EPSG:4326 / WGS 84)
 * Approved boundary from data/samples/study-area.geojson:
 * [minLng, minLat, maxLng, maxLat] = [120.982, 14.596, 121.004, 14.6175]
 */
export const UBELT_BOUNDS = {
  minLng: 120.982,
  minLat: 14.596,
  maxLng: 121.004,
  maxLat: 14.6175,
} as const

export const NON_LIVE_DATA_DISCLAIMER =
  'Controlled scenario data · Not live PAGASA forecasting or official emergency dispatch'

/**
 * Verify whether a [longitude, latitude] coordinate is within the approved U-Belt pilot area.
 */
export function isWithinUBeltBounds(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= UBELT_BOUNDS.minLng &&
    lng <= UBELT_BOUNDS.maxLng &&
    lat >= UBELT_BOUNDS.minLat &&
    lat <= UBELT_BOUNDS.maxLat
  )
}

/**
 * Converts a GeoJSON [longitude, latitude] coordinate to Leaflet [latitude, longitude] format.
 */
export function geojsonToLeafletLatLng(coord: [number, number]): [number, number] {
  return [coord[1], coord[0]]
}

/**
 * Converts an array of GeoJSON [longitude, latitude] coordinates to Leaflet [latitude, longitude] pairs.
 */
export function geojsonLineToLeaflet(line: [number, number][]): [number, number][] {
  return line.map(geojsonToLeafletLatLng)
}

/**
 * Converts a GeoJSON polygon exterior ring ([longitude, latitude][]) to Leaflet [latitude, longitude] pairs.
 */
export function geojsonPolygonToLeaflet(ring: [number, number][]): [number, number][] {
  return ring.map(geojsonToLeafletLatLng)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Zod Validation Schemas
 * ────────────────────────────────────────────────────────────────────────── */

const coordinatePairSchema = z.tuple([z.number(), z.number()])

export const roadEdgeFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    edge_id: z.string().min(1),
    from_node: z.string().min(1),
    to_node: z.string().min(1),
    length_m: z.number().nonnegative(),
    travel_time_s: z.number().nonnegative().optional(),
    road_class: z.string().default('unclassified'),
    flood_level: z.string().optional().default('none'),
    passability: z.string().optional().default('passable'),
    observed_at: z.string().optional().default(new Date().toISOString()),
    source_type: z.string().optional().default('controlled'),
  }),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(coordinatePairSchema).min(2),
  }),
})

export const roadEdgeCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  name: z.string().optional().default('road_network'),
  fixture_notice: z.string().optional(),
  features: z.array(roadEdgeFeatureSchema),
})

export const floodScenarioFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    scenario_id: z.string().optional().default('scenario-controlled-001'),
    edge_id: z.string().optional(),
    flood_level: z.string().default('none'),
    flood_depth_cm: z.number().nonnegative().optional(),
    passability: z.string().default('passable'),
    source_type: z.string().default('controlled'),
    scenario_timestamp: z.string().default(new Date().toISOString()),
    reason: z.string().optional(),
  }),
  geometry: z.object({
    type: z.enum(['LineString', 'Polygon', 'MultiPolygon']),
    coordinates: z.any(),
  }),
})

export const floodScenarioCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  name: z.string().optional().default('controlled_flood_scenario'),
  fixture_notice: z.string().optional(),
  scenario: z
    .object({
      scenario_id: z.string().default('scenario-controlled-001'),
      scenario_timestamp: z.string().default(new Date().toISOString()),
      source_type: z.string().default('controlled'),
      study_area_id: z.string().default('ubelt-pilot-v1'),
    })
    .optional(),
  features: z.array(floodScenarioFeatureSchema),
})

export const studyAreaFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    study_area_id: z.string(),
    name: z.string(),
    status: z.string().optional(),
    crs: z.string().optional().default('EPSG:4326'),
    approved_on: z.string().optional(),
    live_operational_boundary: z.boolean().optional().default(false),
  }),
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(coordinatePairSchema)).min(1),
  }),
})

export const studyAreaCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  name: z.string().optional(),
  features: z.array(studyAreaFeatureSchema),
})

/* ──────────────────────────────────────────────────────────────────────────
 * TypeScript Types
 * ────────────────────────────────────────────────────────────────────────── */

export type RoadEdgeFeature = z.infer<typeof roadEdgeFeatureSchema>
export type RoadEdgeCollection = z.infer<typeof roadEdgeCollectionSchema>
export type FloodScenarioFeature = z.infer<typeof floodScenarioFeatureSchema>
export type FloodScenarioCollection = z.infer<typeof floodScenarioCollectionSchema>
export type StudyAreaCollection = z.infer<typeof studyAreaCollectionSchema>

export interface JoinedMapEdge {
  edgeId: string
  fromNode: string
  toNode: string
  roadClass: string
  lengthM: number
  travelTimeS?: number
  passability: 'passable' | 'restricted' | 'impassable'
  floodLevel: 'none' | 'low' | 'moderate' | 'high' | 'severe' | 'unknown'
  floodDepthCm?: number
  sourceType: 'controlled' | 'historical' | 'verified_report' | string
  observedAt: string
  reason?: string
  geojsonCoordinates: [number, number][]
  leafletCoordinates: [number, number][]
}

export interface MapFloodFeature {
  id: string
  edgeId?: string
  geometryType: 'LineString' | 'Polygon' | 'MultiPolygon'
  floodLevel: string
  floodDepthCm?: number
  passability: string
  sourceType: string
  reason?: string
  leafletCoordinates: any
}

export interface MapLayerDataset {
  scenarioId: string
  scenarioTimestamp: string
  sourceType: 'controlled' | 'historical' | string
  studyAreaId: string
  fixtureNotice: string
  isLive: false
  studyArea: {
    name: string
    approvedOn: string
    bounds: typeof UBELT_BOUNDS
    leafletPolygon: [number, number][]
  }
  edges: JoinedMapEdge[]
  floodFeatures: MapFloodFeature[]
  stats: {
    totalEdges: number
    passableCount: number
    restrictedCount: number
    impassableCount: number
    unmatchedFloodCount: number
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Locked Authoritative Sample Fixtures
 * Matches data/samples/*.geojson
 * ────────────────────────────────────────────────────────────────────────── */

export const LOCKED_ROAD_EDGE_FIXTURE: RoadEdgeCollection = {
  type: 'FeatureCollection',
  name: 'synthetic_resqph_road_edge_fixture',
  fixture_notice: 'Synthetic contract fixture; not validated real-world road or flood data.',
  features: [
    {
      type: 'Feature',
      properties: {
        edge_id: 'edge-demo-001',
        from_node: 'node-demo-a',
        to_node: 'node-demo-b',
        length_m: 125.0,
        travel_time_s: 30.0,
        road_class: 'residential',
        flood_level: 'moderate',
        passability: 'restricted',
        observed_at: '2026-09-21T04:00:00Z',
        source_type: 'controlled',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.9940, 14.6035],
          [120.9946, 14.6042],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        edge_id: 'edge-demo-002',
        from_node: 'node-demo-b',
        to_node: 'node-demo-c',
        length_m: 210.0,
        travel_time_s: 45.0,
        road_class: 'secondary',
        flood_level: 'severe',
        passability: 'impassable',
        observed_at: '2026-09-21T04:00:00Z',
        source_type: 'controlled',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.9946, 14.6042],
          [120.9915, 14.6015],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        edge_id: 'edge-demo-003',
        from_node: 'node-demo-a',
        to_node: 'node-demo-d',
        length_m: 180.0,
        travel_time_s: 35.0,
        road_class: 'tertiary',
        flood_level: 'none',
        passability: 'passable',
        observed_at: '2026-09-21T04:00:00Z',
        source_type: 'controlled',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.9940, 14.6035],
          [120.9892, 14.6018],
        ],
      },
    },
  ],
}

export const LOCKED_FLOOD_SCENARIO_FIXTURE: FloodScenarioCollection = {
  type: 'FeatureCollection',
  name: 'resqph-controlled-flood-scenario-v1',
  fixture_notice: 'Synthetic academic scenario; not live or historical flood evidence.',
  scenario: {
    scenario_id: 'scenario-controlled-001',
    scenario_timestamp: '2026-09-22T00:00:00Z',
    source_type: 'controlled',
    study_area_id: 'ubelt-pilot-v1',
  },
  features: [
    {
      type: 'Feature',
      properties: {
        scenario_id: 'scenario-controlled-001',
        edge_id: 'edge-demo-001',
        flood_level: 'moderate',
        flood_depth_cm: 30,
        passability: 'restricted',
        source_type: 'controlled',
        scenario_timestamp: '2026-09-22T00:00:00Z',
        reason: 'Synthetic contract example for stable edge joining.',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.9940, 14.6035],
          [120.9946, 14.6042],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        scenario_id: 'scenario-controlled-001',
        edge_id: 'edge-demo-002',
        flood_level: 'severe',
        flood_depth_cm: 140,
        passability: 'impassable',
        source_type: 'controlled',
        scenario_timestamp: '2026-09-22T00:00:00Z',
        reason: 'Loyola corridor deep ponding barrier (>1.2m).',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.9946, 14.6042],
          [120.9915, 14.6015],
        ],
      },
    },
  ],
}

export const LOCKED_STUDY_AREA_FIXTURE: StudyAreaCollection = {
  type: 'FeatureCollection',
  name: 'resqph-ubelt-pilot-boundary',
  features: [
    {
      type: 'Feature',
      properties: {
        study_area_id: 'ubelt-pilot-v1',
        name: 'U-Belt pilot area, City of Manila',
        status: 'project-defined academic prototype boundary',
        crs: 'EPSG:4326',
        approved_on: '2026-09-22',
        live_operational_boundary: false,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [120.982, 14.596],
            [121.004, 14.596],
            [121.004, 14.6175],
            [120.982, 14.6175],
            [120.982, 14.596],
          ],
        ],
      },
    },
  ],
}

/* ──────────────────────────────────────────────────────────────────────────
 * Parser and Adapter Functions
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Validate and parse a raw road edge collection fixture.
 */
export function parseRoadEdgeFixture(raw: unknown): RoadEdgeCollection {
  const result = roadEdgeCollectionSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Malformed road edge GeoJSON fixture: ${result.error.message}`)
  }

  // Verify all coordinates fall within the U-Belt boundary
  for (const feature of result.data.features) {
    for (const [lng, lat] of feature.geometry.coordinates) {
      if (!isWithinUBeltBounds(lng, lat)) {
        throw new Error(
          `Road edge ${feature.properties.edge_id} coordinate [${lng}, ${lat}] is outside approved U-Belt pilot boundary.`,
        )
      }
    }
  }

  return result.data
}

/**
 * Validate and parse a raw flood scenario collection fixture.
 */
export function parseFloodScenarioFixture(raw: unknown): FloodScenarioCollection {
  const result = floodScenarioCollectionSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Malformed flood scenario GeoJSON fixture: ${result.error.message}`)
  }
  return result.data
}

/**
 * Validate and parse a raw study area boundary collection fixture.
 */
export function parseStudyAreaFixture(raw: unknown): StudyAreaCollection {
  const result = studyAreaCollectionSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Malformed study area GeoJSON fixture: ${result.error.message}`)
  }
  return result.data
}

/**
 * Join road network edges with flood scenario attributes by `edge_id`.
 * Translates GeoJSON coordinates [lng, lat] into Leaflet-ready [lat, lng].
 */
export function buildMapLayerDataset(
  roadFixtureInput: unknown = LOCKED_ROAD_EDGE_FIXTURE,
  floodFixtureInput: unknown = LOCKED_FLOOD_SCENARIO_FIXTURE,
  studyAreaInput: unknown = LOCKED_STUDY_AREA_FIXTURE,
): MapLayerDataset {
  const roads = parseRoadEdgeFixture(roadFixtureInput)
  const flood = parseFloodScenarioFixture(floodFixtureInput)
  const studyArea = parseStudyAreaFixture(studyAreaInput)

  const studyAreaFeature = studyArea.features[0]
  const leafletStudyAreaPolygon = studyAreaFeature
    ? geojsonPolygonToLeaflet(studyAreaFeature.geometry.coordinates[0] as [number, number][])
    : []

  // Create flood attribute lookup table by edge_id
  const floodMap = new Map<string, FloodScenarioFeature>()
  let unmatchedFloodCount = 0

  const parsedFloodFeatures: MapFloodFeature[] = []

  for (const f of flood.features) {
    if (f.properties.edge_id) {
      floodMap.set(f.properties.edge_id, f)
    }

    let leafletCoords: any
    if (f.geometry.type === 'LineString') {
      leafletCoords = geojsonLineToLeaflet(f.geometry.coordinates as [number, number][])
    } else if (f.geometry.type === 'Polygon') {
      leafletCoords = (f.geometry.coordinates as [number, number][][]).map(geojsonPolygonToLeaflet)
    }

    parsedFloodFeatures.push({
      id: f.properties.edge_id || f.properties.scenario_id || `flood-${Math.random().toString(36).slice(2, 7)}`,
      edgeId: f.properties.edge_id,
      geometryType: f.geometry.type,
      floodLevel: f.properties.flood_level,
      floodDepthCm: f.properties.flood_depth_cm,
      passability: f.properties.passability,
      sourceType: f.properties.source_type,
      reason: f.properties.reason,
      leafletCoordinates: leafletCoords,
    })
  }

  let passableCount = 0
  let restrictedCount = 0
  let impassableCount = 0

  const joinedEdges: JoinedMapEdge[] = roads.features.map((road) => {
    const edgeId = road.properties.edge_id
    const floodInfo = floodMap.get(edgeId)

    // Flood attributes take precedence for current scenario passability/flood_level
    const passabilityRaw = (floodInfo?.properties.passability || road.properties.passability || 'passable').toLowerCase()
    const passability: 'passable' | 'restricted' | 'impassable' =
      passabilityRaw === 'impassable' ? 'impassable' : passabilityRaw === 'restricted' ? 'restricted' : 'passable'

    const floodLevelRaw = (floodInfo?.properties.flood_level || road.properties.flood_level || 'none').toLowerCase()
    const floodLevel: 'none' | 'low' | 'moderate' | 'high' | 'severe' | 'unknown' =
      floodLevelRaw === 'severe'
        ? 'severe'
        : floodLevelRaw === 'high'
          ? 'high'
          : floodLevelRaw === 'moderate'
            ? 'moderate'
            : floodLevelRaw === 'low'
              ? 'low'
              : floodLevelRaw === 'none'
                ? 'none'
                : 'unknown'

    if (passability === 'impassable') impassableCount++
    else if (passability === 'restricted') restrictedCount++
    else passableCount++

    return {
      edgeId,
      fromNode: road.properties.from_node,
      toNode: road.properties.to_node,
      roadClass: road.properties.road_class,
      lengthM: road.properties.length_m,
      travelTimeS: road.properties.travel_time_s,
      passability,
      floodLevel,
      floodDepthCm: floodInfo?.properties.flood_depth_cm,
      sourceType: floodInfo?.properties.source_type || road.properties.source_type || 'controlled',
      observedAt: floodInfo?.properties.scenario_timestamp || road.properties.observed_at || new Date().toISOString(),
      reason: floodInfo?.properties.reason,
      geojsonCoordinates: road.geometry.coordinates as [number, number][],
      leafletCoordinates: geojsonLineToLeaflet(road.geometry.coordinates as [number, number][]),
    }
  })

  // Count unmatched flood records
  for (const f of flood.features) {
    if (f.properties.edge_id && !roads.features.some((r) => r.properties.edge_id === f.properties.edge_id)) {
      unmatchedFloodCount++
    }
  }

  const scenarioMeta = flood.scenario || {
    scenario_id: 'scenario-controlled-001',
    scenario_timestamp: '2026-09-22T00:00:00Z',
    source_type: 'controlled',
    study_area_id: 'ubelt-pilot-v1',
  }

  return {
    scenarioId: scenarioMeta.scenario_id,
    scenarioTimestamp: scenarioMeta.scenario_timestamp,
    sourceType: scenarioMeta.source_type,
    studyAreaId: scenarioMeta.study_area_id,
    fixtureNotice:
      flood.fixture_notice ||
      roads.fixture_notice ||
      'Synthetic controlled scenario; not live emergency navigation or flood forecast.',
    isLive: false,
    studyArea: {
      name: studyAreaFeature?.properties.name || 'U-Belt pilot area, City of Manila',
      approvedOn: studyAreaFeature?.properties.approved_on || '2026-09-22',
      bounds: UBELT_BOUNDS,
      leafletPolygon: leafletStudyAreaPolygon,
    },
    edges: joinedEdges,
    floodFeatures: parsedFloodFeatures,
    stats: {
      totalEdges: joinedEdges.length,
      passableCount,
      restrictedCount,
      impassableCount,
      unmatchedFloodCount,
    },
  }
}
