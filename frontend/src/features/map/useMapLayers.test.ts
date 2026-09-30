import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapLayers } from './useMapLayers'

describe('useMapLayers Hook', () => {
  it('loads and parses locked sample fixtures successfully by default', () => {
    const { result } = renderHook(() => useMapLayers())

    expect(result.current.status).toBe('success')
    expect(result.current.dataset).not.toBeNull()
    expect(result.current.dataset?.edges.length).toBeGreaterThan(0)
    expect(result.current.metadata.scenarioId).toBe('scenario-controlled-001')
    expect(result.current.metadata.sourceType).toBe('controlled')
    expect(result.current.metadata.isLive).toBe(false)
    expect(result.current.metadata.stats.totalEdges).toBeGreaterThan(0)
  })

  it('handles simulated loading state', () => {
    const { result } = renderHook(() => useMapLayers({ simulatedState: 'loading' }))
    expect(result.current.status).toBe('loading')
    expect(result.current.dataset).toBeNull()
  })

  it('handles simulated empty state', () => {
    const { result } = renderHook(() => useMapLayers({ simulatedState: 'empty' }))
    expect(result.current.status).toBe('empty')
    expect(result.current.dataset?.edges.length).toBe(0)
    expect(result.current.metadata.stats.totalEdges).toBe(0)
  })

  it('handles simulated malformed error state', () => {
    const { result } = renderHook(() => useMapLayers({ simulatedState: 'malformed' }))
    expect(result.current.status).toBe('error')
    expect(result.current.errorType).toBe('malformed_geojson')
    expect(result.current.errorMessage).toMatch(/Malformed GeoJSON/i)
  })

  it('handles simulated unavailable state', () => {
    const { result } = renderHook(() => useMapLayers({ simulatedState: 'unavailable' }))
    expect(result.current.status).toBe('error')
    expect(result.current.errorType).toBe('unavailable')
    expect(result.current.errorMessage).toMatch(/unavailable/i)
  })

  it('handles actual out-of-bounds error on invalid road fixture', () => {
    const invalidFixture = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            edge_id: 'edge-bad-coord',
            from_node: 'n1',
            to_node: 'n2',
            length_m: 50,
            road_class: 'residential',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [121.5, 14.9], // Far outside U-Belt
              [121.51, 14.91],
            ],
          },
        },
      ],
    }

    const { result } = renderHook(() => useMapLayers({ roadFixture: invalidFixture }))
    expect(result.current.status).toBe('error')
    expect(result.current.errorType).toBe('out_of_bounds')
  })

  it('toggles layer visibility correctly', () => {
    const { result } = renderHook(() => useMapLayers())

    expect(result.current.layerVisibility.roads).toBe(true)
    expect(result.current.layerVisibility.flood).toBe(true)
    expect(result.current.layerVisibility.boundary).toBe(true)

    act(() => {
      result.current.toggleLayer('roads')
    })
    expect(result.current.layerVisibility.roads).toBe(false)

    act(() => {
      result.current.setLayerVisible('roads', true)
    })
    expect(result.current.layerVisibility.roads).toBe(true)
  })
})
