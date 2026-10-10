import { useCallback, useMemo, useState } from 'react'
import {
  buildMapLayerDataset,
  LOCKED_FLOOD_SCENARIO_FIXTURE,
  LOCKED_ROAD_EDGE_FIXTURE,
  LOCKED_STUDY_AREA_FIXTURE,
  UBELT_BOUNDS,
  type MapLayerDataset,
} from './mapData'

export type MapLayerStatus = 'loading' | 'empty' | 'error' | 'success'
export type MapLayerErrorType = 'malformed_geojson' | 'out_of_bounds' | 'unavailable' | 'unknown' | null

export interface UseMapLayersOptions {
  roadFixture?: unknown
  floodFixture?: unknown
  studyAreaFixture?: unknown
  simulatedState?: 'loading' | 'empty' | 'malformed' | 'unavailable' | 'success'
}

export interface LayerVisibilityState {
  roads: boolean
  flood: boolean
  boundary: boolean
  route: boolean
}

export interface UseMapLayersResult {
  status: MapLayerStatus
  errorType: MapLayerErrorType
  errorMessage: string | null
  dataset: MapLayerDataset | null
  metadata: {
    scenarioId: string
    scenarioTimestamp: string
    sourceType: string
    studyAreaId: string
    studyAreaName: string
    fixtureNotice: string
    isLive: false
    stats: {
      totalEdges: number
      passableCount: number
      restrictedCount: number
      impassableCount: number
      unmatchedFloodCount: number
    }
  }
  layerVisibility: LayerVisibilityState
  toggleLayer: (layer: keyof LayerVisibilityState) => void
  setLayerVisible: (layer: keyof LayerVisibilityState, visible: boolean) => void
  reload: () => void
}

export function useMapLayers(options: UseMapLayersOptions = {}): UseMapLayersResult {
  const {
    roadFixture = LOCKED_ROAD_EDGE_FIXTURE,
    floodFixture = LOCKED_FLOOD_SCENARIO_FIXTURE,
    studyAreaFixture = LOCKED_STUDY_AREA_FIXTURE,
    simulatedState,
  } = options

  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>({
    roads: true,
    flood: true,
    boundary: true,
    route: true,
  })

  const { status, errorType, errorMessage, dataset } = useMemo(() => {
    void reloadKey

    if (simulatedState === 'loading') {
      return {
        status: 'loading' as const,
        errorType: null,
        errorMessage: null,
        dataset: null,
      }
    }

    if (simulatedState === 'empty') {
      return {
        status: 'empty' as const,
        errorType: null,
        errorMessage: null,
        dataset: {
          scenarioId: 'scenario-empty',
          scenarioTimestamp: '2026-09-22T00:00:00Z',
          sourceType: 'controlled',
          studyAreaId: 'ubelt-pilot-v1',
          fixtureNotice: 'Empty scenario fixture; no edges loaded.',
          isLive: false as const,
          studyArea: {
            name: 'U-Belt pilot area, City of Manila',
            approvedOn: '2026-09-22',
            bounds: UBELT_BOUNDS,
            mapPolygon: [],
          },
          edges: [],
          floodFeatures: [],
          stats: {
            totalEdges: 0,
            passableCount: 0,
            restrictedCount: 0,
            impassableCount: 0,
            unmatchedFloodCount: 0,
          },
        },
      }
    }

    if (simulatedState === 'malformed') {
      return {
        status: 'error' as const,
        errorType: 'malformed_geojson' as const,
        errorMessage: 'Malformed GeoJSON: Missing coordinates in road network feature collection.',
        dataset: null,
      }
    }

    if (simulatedState === 'unavailable') {
      return {
        status: 'error' as const,
        errorType: 'unavailable' as const,
        errorMessage: 'Geospatial layer data is currently unavailable for this scenario.',
        dataset: null,
      }
    }

    try {
      const parsedDataset = buildMapLayerDataset(roadFixture, floodFixture, studyAreaFixture)
      return {
        status: parsedDataset.edges.length === 0 ? ('empty' as const) : ('success' as const),
        errorType: null,
        errorMessage: null,
        dataset: parsedDataset,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      let errType: MapLayerErrorType = 'unknown'
      if (msg.includes('outside approved U-Belt pilot boundary')) {
        errType = 'out_of_bounds'
      } else if (msg.includes('Malformed')) {
        errType = 'malformed_geojson'
      }
      return {
        status: 'error' as const,
        errorType: errType,
        errorMessage: msg,
        dataset: null,
      }
    }
  }, [roadFixture, floodFixture, studyAreaFixture, simulatedState, reloadKey])

  const toggleLayer = useCallback((layer: keyof LayerVisibilityState) => {
    if (layer === 'roads' || layer === 'boundary') return
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }))
  }, [])

  const setLayerVisible = useCallback((layer: keyof LayerVisibilityState, visible: boolean) => {
    if (layer === 'roads' || layer === 'boundary') return
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: visible,
    }))
  }, [])

  const defaultMetadata = {
    scenarioId: dataset?.scenarioId || 'scenario-controlled-001',
    scenarioTimestamp: dataset?.scenarioTimestamp || '2026-09-22T00:00:00Z',
    sourceType: dataset?.sourceType || 'controlled',
    studyAreaId: dataset?.studyAreaId || 'ubelt-pilot-v1',
    studyAreaName: dataset?.studyArea.name || 'U-Belt pilot area, City of Manila',
    fixtureNotice: dataset?.fixtureNotice || 'Synthetic controlled scenario; not live emergency data.',
    isLive: false as const,
    stats: dataset?.stats || {
      totalEdges: 0,
      passableCount: 0,
      restrictedCount: 0,
      impassableCount: 0,
      unmatchedFloodCount: 0,
    },
  }

  return {
    status,
    errorType,
    errorMessage,
    dataset,
    metadata: defaultMetadata,
    layerVisibility,
    toggleLayer,
    setLayerVisible,
    reload,
  }
}
