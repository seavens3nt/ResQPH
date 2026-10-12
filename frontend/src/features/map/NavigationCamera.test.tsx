import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationOptions } from './LocationOptions'
import { RESCUE_STATIONS } from './stations'
import { InteractiveFloodMap } from './InteractiveFloodMap'

const sdk = vi.hoisted(() => ({ maps: [] as FakeMap[], markers: [] as FakeMarker[], rendering: 'VECTOR', overlays: [] as Overlay[], infos: [] as Info[] }))
class FakeMap {
  heading = 0
  zoom = 16
  listeners = new Map<string, (event?: {latLng?: {lng:()=>number;lat:()=>number}}) => void>()
  moveCamera = vi.fn((options: { heading?: number; zoom?: number }) => {
    if (options.heading !== undefined) { this.heading = options.heading; this.listeners.get('heading_changed')?.() }
    if (options.zoom !== undefined) this.zoom = options.zoom
  })
  fitBounds = vi.fn()
  setCenter = vi.fn()
  setOptions = vi.fn()
  getHeading = () => this.heading
  getZoom = () => this.zoom
  getRenderingType = () => sdk.rendering
  addListener = (event: string, callback: (event?: {latLng?: {lng:()=>number;lat:()=>number}}) => void) => {
    this.listeners.set(event, callback)
    return { remove: () => this.listeners.delete(event) }
  }
  constructor() { sdk.maps.push(this) }
}
class FakeMarker {
  position: unknown
  content: HTMLElement
  map: unknown
  title: string
  constructor(options: { position: unknown; content: HTMLElement; map: unknown; title: string }) {
    this.position = options.position; this.content = options.content; this.map = options.map; this.title = options.title
    sdk.markers.push(this)
  }
  listeners = new Map<string, () => void>()
  addListener(event:string, callback:()=>void) { this.listeners.set(event,callback); return { remove:()=>this.listeners.delete(event) } }
}
class Overlay {
  options: { map: unknown; strokeColor?: string; strokeWeight?: number; paths?: unknown }
  listeners = new Map<string, (event: {latLng:null}) => void>()
  setMap = vi.fn((map:unknown) => { this.options.map = map })
  constructor(options: Overlay['options']) { this.options = options; sdk.overlays.push(this) }
  addListener(event:string, callback:(event:{latLng:null})=>void) { this.listeners.set(event,callback); return { remove:()=>this.listeners.delete(event) } }
}
class Bounds { extend() {} }
class Info {
  opened = false
  setOptions = vi.fn()
  close = vi.fn(() => { this.opened = false })
  open = vi.fn(() => { this.opened = true })
  constructor() { sdk.infos.push(this) }
}
vi.mock('@googlemaps/js-api-loader', () => ({ setOptions: vi.fn(), importLibrary: async (name: string) => name === 'maps' ? { Map: FakeMap } : { AdvancedMarkerElement: FakeMarker } }))
const route: [number, number][] = [[120.994, 14.604], [120.995, 14.604], [120.995, 14.605]]
const point = { type: 'Point' as const, coordinates: route[0] }
const props = { navigation: true, trackingPosition: point, routeGeometry: route, trackingProgress: 0, followPosition: true, showRouteControl: true, showRouteStatus: false }
async function mount(extra = {}) {
  const view = render(<InteractiveFloodMap {...props} {...extra} />)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  act(() => vi.advanceTimersByTime(32))
  return view
}
const vehicle = () => sdk.markers.find(marker => marker.title === 'Simulated rescuer position')!
beforeEach(() => {
  vi.useFakeTimers(); sdk.maps = []; sdk.markers = []; sdk.overlays = []; sdk.infos = []; sdk.rendering = 'VECTOR'
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'synthetic-test-key'); vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', 'synthetic-map-id')
  vi.stubGlobal('google', { maps: { MapTypeControlStyle: { DROPDOWN_MENU: 2, HORIZONTAL_BAR: 1 }, ControlPosition: { TOP_RIGHT: 3 }, RenderingType: { VECTOR: 'VECTOR' }, LatLngBounds: Bounds, InfoWindow: Info, Polyline: Overlay, Polygon: Overlay } })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('navigation camera with the Google SDK contract mocked', () => {
  it('opens and dismisses location options without recreating the map or placing a pin', async () => {
    const pin = vi.fn(), choose = vi.fn()
    await mount({onMapClick:pin, controlsSlot:<LocationOptions source="demo" disabled={false} onChooseSource={choose}/>})
    const trigger = screen.getByRole('button',{name:'Location options'})
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('radio',{name:'Use my location'}))
    expect(choose).toHaveBeenCalledWith('gps')
    fireEvent.keyDown(trigger,{key:'Escape'})
    expect(trigger).toHaveFocus()
    expect(sdk.maps).toHaveLength(1)
    expect(pin).not.toHaveBeenCalled()
  })

  it('uses the same interpolated position for camera and vehicle, leaving headquarters fixed', async () => {
    const view = await mount()
    for (const station of RESCUE_STATIONS) {
      const marker = sdk.markers.find(item => item.content.getAttribute('aria-label') === station.name)
      expect(marker?.content.querySelector('img')).toHaveAttribute('src','/assets/rescue-station.svg')
    }
    const headquarters = sdk.markers.filter(marker => marker !== vehicle()).map(marker => marker.position)
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={0.5} />)
    act(() => vi.advanceTimersByTime(1200))
    const camera = sdk.maps[0].moveCamera.mock.lastCall?.[0] as { center: unknown; heading: number }
    expect(camera.center).toEqual(vehicle().position)
    expect(camera.heading).toBeCloseTo(90, 0)
    expect(vehicle().content.style.transform).toBe('rotate(0deg)')
    expect(sdk.markers.filter(marker => marker !== vehicle()).map(marker => marker.position)).toEqual(headquarters)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('suspends follow on manual input and full-route, restores it on recenter, and supports north-up', async () => {
    await mount()
    fireEvent.wheel(document.getElementById('google-rescue-map')!)
    expect(screen.getByRole('button', { name: 'Follow rescuer' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Recenter' }))
    expect(screen.getByRole('button', { name: 'Following rescuer' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show full route' }))
    expect(screen.getByRole('button', { name: 'Follow rescuer' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Heading-up · use north-up' }))
    expect(sdk.maps[0].getHeading()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Follow rescuer' }))
    act(() => vi.advanceTimersByTime(32))
    expect(sdk.maps[0].moveCamera.mock.lastCall?.[0]).toMatchObject({ heading: 0, tilt: 0 })
  })
  it.each([false, true])('keeps citizen or unsupported rendering north-up (raster=%s)', async raster => {
    if (raster) sdk.rendering = 'RASTER'
    await mount({ navigation: raster })
    expect(sdk.maps[0].moveCamera.mock.lastCall?.[0]).toMatchObject({ heading: 0, tilt: 0 })
    if (raster) expect(screen.getByRole('button', { name: 'North-up · use heading-up' })).toBeDisabled()
  })
  it('freezes on failed updates and cleans animation up on unmount', async () => {
    const view = await mount()
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={0.8} />)
    act(() => vi.advanceTimersByTime(500))
    const before = vehicle().position
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={0.8} trackingFrozen />)
    act(() => vi.advanceTimersByTime(5000))
    expect(vehicle().position).toEqual(before)
    view.unmount()
    const calls = sdk.maps[0].moveCamera.mock.calls.length
    act(() => vi.advanceTimersByTime(5000))
    expect(sdk.maps[0].moveCamera).toHaveBeenCalledTimes(calls)
    expect(vehicle().map).toBeNull()
  })
  it('freezes when hidden, offline or stale, without advancing backend progress', async () => {
    const view = await mount({ trackingTimestamp: new Date().toISOString() })
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={0.8} trackingTimestamp={new Date().toISOString()} />)
    act(() => vi.advanceTimersByTime(400))
    const before = vehicle().position
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    fireEvent(document, new Event('visibilitychange'))
    act(() => vi.advanceTimersByTime(3000))
    expect(vehicle().position).toEqual(before)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    fireEvent(document, new Event('visibilitychange'))
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    fireEvent(window, new Event('offline'))
    act(() => vi.advanceTimersByTime(3000))
    expect(vehicle().position).toEqual(before)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    fireEvent(window, new Event('online'))
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={0.8} trackingTimestamp={new Date(Date.now() - 20_000).toISOString()} />)
    act(() => vi.advanceTimersByTime(3000))
    expect(vehicle().position).toEqual(before)
    expect(screen.getByText(/Tracking paused/)).toBeInTheDocument()
  })
  it('always displays road condition classes alongside the route and operational markers', async () => {
    await mount({ records: [{id:'incident',label:'Incident',coordinates:route[2]}] })
    const roads = () => sdk.overlays.filter(layer => layer.options.map && [4,6].includes(layer.options.strokeWeight ?? 0))
    const routeLayer = sdk.overlays.find(layer => layer.options.strokeWeight === 7)!
    const initial = roads().length
    expect(initial).toBeGreaterThan(0)
    expect(new Set(roads().map(layer => layer.options.strokeColor))).toEqual(new Set(['#22c55e','#f59e0b','#dc2626']))
    expect(screen.queryByRole('button', {name:/Road conditions:/})).not.toBeInTheDocument()
    expect(routeLayer.options.map).toBe(sdk.maps[0])
    expect(sdk.markers.every(marker => marker.map === sdk.maps[0])).toBe(true)
    expect(screen.getByText(/Passable/)).toBeInTheDocument()
    expect(sdk.maps).toHaveLength(1)
    expect(screen.getByRole('button', {name:'Recenter'})).toHaveAttribute('title','Recenter map')
    expect(screen.getByRole('button', {name:'Recenter'})).not.toHaveTextContent('Recenter')
  })
  it('reuses one popup for roads and markers, dismisses on empty clicks, and removes old listeners', async () => {
    const pin = vi.fn()
    const view = await mount({onMapClick:pin})
    const roads = sdk.overlays.filter(layer => [4,6].includes(layer.options.strokeWeight ?? 0))
    roads[0].listeners.get('click')?.({latLng:null})
    expect(sdk.infos.filter(info => info.opened)).toHaveLength(1)
    roads[1].listeners.get('click')?.({latLng:null})
    expect(sdk.infos).toHaveLength(1)
    expect(sdk.infos[0].open).toHaveBeenCalledTimes(2)
    sdk.markers[0].listeners.get('click')?.()
    expect(sdk.infos[0].open).toHaveBeenCalledTimes(3)
    act(() => sdk.maps[0].listeners.get('click')?.({latLng:{lng:()=>120.994,lat:()=>14.604}}))
    expect(sdk.infos[0].opened).toBe(false)
    expect(pin).toHaveBeenCalledWith([120.994,14.604])
    roads[0].listeners.get('click')?.({latLng:null})
    view.unmount()
    expect(sdk.infos[0].opened).toBe(false)
    expect(roads.every(road => road.listeners.size === 0)).toBe(true)
    expect(sdk.markers.every(marker => marker.listeners.size === 0)).toBe(true)
    expect(sdk.maps[0].listeners.size).toBe(0)
  })
  it('settles immediately for reduced motion and arrival', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const view = await mount()
    view.rerender(<InteractiveFloodMap {...props} trackingProgress={1} trackingStopped />)
    act(() => vi.advanceTimersByTime(32))
    expect(vehicle().position).toEqual({ lat: 14.605, lng: 120.995 })
    expect(sdk.maps[0].moveCamera.mock.lastCall?.[0]).toMatchObject({ tilt: 0 })
  })
})
