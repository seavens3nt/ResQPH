import { useState } from 'react'
import { useMyRescueRequests, useRescueRequest } from '../requests/hooks'
import { InteractiveFloodMap } from '../map/InteractiveFloodMap'
import { WorkspaceCard } from './WorkspaceUI'
import { QueryState } from './Records'
import { FigmaHomeAsset } from './FigmaHomeAsset'
import { RESCUE_STATIONS, stationIdForTeamId } from '../map/stations'
import { requestLabel } from './requestLabel'
import { formatDuration } from '../routing/presentation/formatDuration'
import { useMissionJourney, journeyRoute } from '../missions/useMissionJourney'
import './citizenMap.css'

export function CitizenMap({selected,onSelect,onCancel,isCancelling=false,cancelError=null}: {selected:string|null;onSelect:(id:string)=>void;onCancel:()=>void;isCancelling?:boolean;cancelError?:string|null}) {
  const query = useMyRescueRequests()
  const detail = useRescueRequest(selected ?? '')
  const [source,setSource] = useState<'demo'|'gps'>('demo')
  const [center,setCenter] = useState<[number,number]>([14.6042,120.9946])
  const [locating,setLocating] = useState(false)
  const [locationError,setLocationError] = useState('')
  const selectedRequest = detail.data ?? query.data?.items.find(r=>r.id===selected)
  const journey = useMissionJourney(selectedRequest?.mission_id)
  const mission = journey.mission.data
  const route = journeyRoute(mission)
  function chooseSource(value:'demo'|'gps') {
    setLocationError('')
    if(value==='demo') {setSource(value);setCenter([14.6042,120.9946]);return}
    if(!navigator.geolocation) {setLocationError('Location access is unavailable. Use demo location.');return}
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position=>{
      setCenter([position.coords.latitude,position.coords.longitude]);setSource('gps');setLocating(false)
    },()=>{setLocationError('Could not get your location. Use demo location or retry.');setLocating(false)}, {timeout:10000,enableHighAccuracy:false})
  }
  const sourceControl = <fieldset className="citizen-map-source" disabled={locating}>
    <legend>Location source</legend>
    <label><input type="radio" name="citizen-map-source" checked={source==='gps'} onChange={()=>chooseSource('gps')}/>Use current location</label>
    <label><input type="radio" name="citizen-map-source" checked={source==='demo'} onChange={()=>chooseSource('demo')}/>Use demo location</label>
  </fieldset>
  return <section className="citizen-map-page" aria-labelledby="citizen-map-title">
    <h2 id="citizen-map-title"><FigmaHomeAsset name="mapTitle"/>Map View</h2>
    <WorkspaceCard className="citizen-map-panel">
      <QueryState query={query} layout="map" label="Loading request locations…">{data=><div className="citizen-map-inset citizen-map-layout">
        <div className="citizen-map-viewport">
        <InteractiveFloodMap activeStage="none" showRouteStatus={false} center={center} controlsSlot={sourceControl} assignedStationId={mission?.station_id ?? selectedRequest?.assigned_station_id ?? stationIdForTeamId(selectedRequest?.assigned_team_id)} routeGeometry={route} trackingPosition={journey.tracking.data?.position ?? null} followPosition records={data.items.filter(r=>r.location.point).map(r=>({id:r.id,label:`${r.location.address} · ${r.status}`,coordinates:r.location.point!.coordinates}))}/>
        {locating && <p role="status">Getting your location…</p>}
        {locationError && <p role="alert">{locationError}</p>}
        </div>
        <aside className="citizen-map-details" aria-label="Request details panel">
        <label className="citizen-map-selector">Request details
          <select value={selected??''} onChange={event=>onSelect(event.target.value)}>
            <option value="">Select request</option>
            {data.items.map((r,index)=><option key={r.id} value={r.id}>{requestLabel(r.id,index)} · {r.location.address} · {r.status}</option>)}
          </select>
        </label>
        {!selected ? <div className="citizen-map-empty" aria-live="polite">Select request details to view here.</div> : <QueryState query={detail}>{request=><section className="citizen-map-summary" aria-labelledby="map-request-status-title">
          <header><h4 id="map-request-status-title">Request status</h4><span className={`citizen-map-status state-${request.status}`} role="status">{request.status.replace(/^./,s=>s.toUpperCase())}</span></header>
          <dl>{[
            ['People needing help',String(request.headcount)],
            ['Reported severity',(request.reported_severity ?? 'moderate').replace(/^./,s=>s.toUpperCase())],
            ['Observed flood level',request.reported_flood_level.replace(/^./,s=>s.toUpperCase())],
            ['Situation summary',request.situation_summary || 'None reported'],
            ['Accessibility needs',request.vulnerabilities.join(', ') || 'None reported'],
            ['Medical needs',request.medical_needs ? request.medical_details || 'Medical assistance requested' : 'None reported'],
          ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {request.status === 'pending' && <p className="citizen-map-assignment" role="status">Your request is queued for automatic station matching. No dispatcher action is required.</p>}
          {mission && <div className="citizen-map-journey" aria-live="polite">
            <h5>Station response</h5>
            <p>Assigned station: {RESCUE_STATIONS.find(station => station.station_id === mission.station_id)?.name ?? mission.team_id}</p>
            <p>Mission status: {mission.status.replace('-', ' ')}</p>
            {mission.latest_route_result && typeof mission.latest_route_result.estimated_time_s === 'number' && <p>Route ETA: {formatDuration(mission.latest_route_result.estimated_time_s)}</p>}
            {journey.tracking.data && <p>Simulated rescuer: {journey.tracking.data.simulation_status} · {formatDuration(journey.tracking.data.estimated_remaining_time_s)} remaining</p>}
            {journey.tracking.isError && <p role="status">Latest tracking is unavailable. The last server position remains shown.</p>}
          </div>}
          {journey.mission.isError && <p role="status">Mission details are temporarily unavailable; request status remains available.</p>}
        </section>}</QueryState>}
        {selectedRequest?.status==='cancelled' && <p className="citizen-map-cancelled-update" role="status">Request cancelled</p>}
        {!data.items.length && <p className="citizen-map-no-requests">No rescue requests found.</p>}
      <div className="citizen-map-actions">
        <button disabled={query.isFetching || detail.isFetching} onClick={()=>{void query.refetch();if(selected) void detail.refetch()}}>Refresh</button>
        <button className="citizen-map-cancel" disabled={selectedRequest?.status!=='pending' || isCancelling} aria-busy={isCancelling} onClick={onCancel}>{isCancelling?'Cancelling…':'Cancel Request'}</button>
      </div>
      {cancelError && <p role="alert">{cancelError}</p>}
        </aside>
      </div>}</QueryState>
    </WorkspaceCard>
  </section>
}
