import { LoadingState } from '../../components/ui/LoadingState'
import { FigmaHomeAsset } from './FigmaHomeAsset'
import { UnfinishedRequestNotice } from './UnfinishedRequestNotice'
import { useMyRescueRequests } from '../requests/hooks'
import { WorkspaceCard, WorkspaceBadge } from './WorkspaceUI'
import { QueryState } from './Records'
import { requestLabel } from './requestLabel'
import { WeatherSummary } from './WeatherSummary'
import { useUbeltWeather, useUbeltHourlyWeather } from './useUbeltWeather'
import { HourlyWeather } from './HourlyWeather'

function WeatherMetric({label,value}: {label:string;value:string}) {
  return <div className="home-weather-metric"><span>{label}</span><strong>{value}</strong></div>
}
export function CitizenHome({hasDraft,onView,onDiscard,onRequest}: {hasDraft:boolean;onView:(id:string)=>void;onDiscard?:()=>void;onRequest:()=>void}) {
  const requests = useMyRescueRequests()
  const weather = useUbeltWeather()
  const hourly = useUbeltHourlyWeather()
  const rainfall = hourly.data?.[0]?.rainAmount
  const wind = weather.data?.windSpeed
  const direction = weather.data?.windDirection?.replaceAll('NORTH','N').replaceAll('SOUTH','S').replaceAll('EAST','E').replaceAll('WEST','W').replaceAll('_','')
  const humidity = weather.data?.humidity
  const activeIndex = requests.data?.items.findIndex(r => !['completed','cancelled'].includes(r.status)) ?? -1
  const active = activeIndex >= 0 ? requests.data?.items[activeIndex] : undefined
  return <div className="screenshot-home">
    {hasDraft && onDiscard && <UnfinishedRequestNotice onResume={onRequest} onDiscard={onDiscard}/>}
    <section aria-labelledby="home-status-title">
      <h2 className="home-section-title" id="home-status-title"><FigmaHomeAsset name="star"/>Status Cards</h2>
      <div className="home-status-grid">
        <WorkspaceCard className="home-rescue-card"><button aria-label="Request rescue" onClick={onRequest}><FigmaHomeAsset name="add"/><span><strong>{hasDraft ? 'Resume rescue request' : 'Request rescue'}</strong><small>Get help from you or someone nearby.</small></span></button></WorkspaceCard>
        <WorkspaceCard className="home-current-card"><h3>Current Request</h3><QueryState query={requests}>{()=> active ? <>
          <div className="home-current-top"><strong className="home-request-label">{requestLabel(active.id,activeIndex)}</strong><WorkspaceBadge status={active.status}>{active.status === 'pending' ? 'Pending assignment' : active.status.replace(/^./,s=>s.toUpperCase())}</WorkspaceBadge></div>
          <p><FigmaHomeAsset name="pin"/>{active.location.address}</p>
          <div className="home-current-bottom"><p><FigmaHomeAsset name="people"/>{active.headcount} {active.headcount===1 ? 'Person' : 'People'}</p><button onClick={()=>onView(active.id)}>View Details <FigmaHomeAsset name="chevron"/></button></div>
        </> : <div className="home-no-request"><strong>No active request</strong><p>Your submitted requests will appear here.</p><button onClick={()=>void requests.refetch()}>Refresh requests</button></div>}</QueryState></WorkspaceCard>
      </div>
    </section>
    <section aria-label="Current weather and hourly forecast">
      <h2 className="home-section-title home-weather-title"><FigmaHomeAsset name="rain"/>Weather &amp; Hourly Forecast</h2>
      <div className="home-weather-grid">
        <WorkspaceCard className="home-scenario-card"><div className="home-live-weather-surface"><span className="home-card-caption">Current Weather · Google Weather</span><h3>U-belt Pilot Area</h3>
          {weather.data ? <WeatherSummary {...weather.data} source={`${weather.isError || weather.fetchStatus==='paused' ? 'Last received weather · may be outdated' : 'Current weather'} · ${new Date(weather.data.time).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} PHT`}/> : !weather.isError && weather.fetchStatus!=='paused' ? <LoadingState layout="weather" label="Loading current weather…"/> : <div className="weather-summary" role="status"><p>{weather.isError ? 'Weather unavailable. Please retry or check the API setup.' : weather.fetchStatus==='paused' ? 'Weather unavailable while offline.' : 'Loading current weather…'}</p></div>}
          <div className="weather-summary-attribution"><span className="google-weather-attribution" translate="no">Google Maps</span></div>
          </div>
        </WorkspaceCard>
        <WorkspaceCard className="home-hourly-card"><span className="home-card-caption">Google Weather · U-Belt</span><h3>Hourly Forecast</h3>
          <div className="home-weather-metrics"><WeatherMetric label="Rainfall · first forecast hour" value={rainfall==null ? '—' : `${Number(rainfall.toFixed(2))} mm`}/><WeatherMetric label="Current wind" value={wind==null ? '—' : `${Math.round(wind)} km/h${direction ? ` ${direction}` : ''}`}/><WeatherMetric label="Current humidity" value={humidity==null ? '—' : `${humidity}%`}/></div>
          {hourly.data ? <><HourlyWeather hours={hourly.data}/>{(hourly.isError || hourly.fetchStatus==='paused') && <p role="status">Last received forecast — may be outdated.</p>}</> : !hourly.isError && hourly.fetchStatus!=='paused' ? <LoadingState layout="forecast" label="Loading hourly forecast…"/> : <p role="status">{hourly.isError ? 'Hourly forecast unavailable. Reload to try again.' : hourly.fetchStatus==='paused' ? 'Hourly forecast unavailable while offline.' : 'Loading hourly forecast…'}</p>}
        </WorkspaceCard>
      </div>
    </section>
  </div>
}
