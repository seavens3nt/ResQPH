import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { LoadingState } from '../../components/ui/LoadingState'
import { WorkspaceCard, WorkspaceFacts, WorkspaceSectionHeading } from './WorkspaceUI'
import { useUbeltWeather, weatherRefreshAllowedAt, useWeatherClock } from './useUbeltWeather'
import { weatherAdvisories, weatherIsStale } from './weatherAdvisories'

export function CitizenAdvisory() {
  const weather = useUbeltWeather()
  const now = useWeatherClock(1000)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine)
    window.addEventListener('online', connection); window.addEventListener('offline', connection)
    return () => { window.removeEventListener('online', connection); window.removeEventListener('offline', connection) }
  }, [])
  const data = weather.data
  const stale = data && (weatherIsStale(data.time, now) || weather.isError || !online)
  const limited = isAxiosError(weather.error) && weather.error.response?.status === 429
  const allowedAt = weatherRefreshAllowedAt(weather)
  const wait = Math.max(0, Math.ceil((allowedAt - now) / 1000))
  const temperatureC = data?.temperatureC ?? data?.temperature
  const tips = data && !stale ? weatherAdvisories({...data, temperatureC}) : []
  const missingRain = data && data.rainChance == null && data.rainAmount == null
  return <div className="workspace-stack citizen-information-page">
    <WorkspaceSectionHeading icon="droplet">Advisory</WorkspaceSectionHeading>
    <WorkspaceCard>
      <h3>Weather · U-Belt pilot area, Manila</h3>
      <p>Practical app suggestions based on Google Weather for the app’s fixed study-area location. These are not official weather alerts or flood advice.</p>
      {!data && weather.isPending && online && weather.fetchStatus !== 'paused' && <LoadingState layout="weather" label="Loading advisory weather…"/>}
      {(!online || weather.fetchStatus === 'paused') && <p role="status">Offline. Weather cannot be refreshed until you reconnect.</p>}
      {limited && <p role="alert">Weather requests are rate-limited. Wait before trying again.</p>}
      {weather.isError && !limited && <p role="alert">Weather unavailable. {data ? 'Keeping the last received conditions.' : 'No weather-based suggestions are available.'}</p>}
      {data && <>
        <p>Provider updated: <time dateTime={data.time}>{new Date(data.time).toLocaleString('en-PH', {timeZone:'Asia/Manila'})} PHT</time></p>
        {stale && <p role="status">Stale cached weather — may be outdated. Refresh when available; current suggestions are paused.</p>}
        <WorkspaceFacts items={[
          {label:'Conditions',value:data.condition}, {label:'Temperature',value:`${temperatureC} °C`},
          {label:'Feels like',value:data.feelsLike == null ? 'Unavailable' : `${data.feelsLike} °C`},
          {label:'Wind',value:data.windSpeed == null ? 'Unavailable' : `${data.windSpeed} km/h`},
          {label:'Rain probability',value:data.rainChance == null ? 'Unavailable' : `${data.rainChance}%`},
          {label:'Precipitation estimate',value:data.rainAmount == null ? 'Unavailable' : `${data.rainAmount} mm`},
        ]}/>
        {missingRain && <p role="status">Precipitation measurements are missing. No rain amount or clear-weather conclusion is inferred.</p>}
        <h3>Practical tips</h3>
        {tips.length ? <ul>{tips.map(tip => <li key={tip}>{tip}</li>)}</ul> : !stale && <p>No special advisory conditions detected in the available measurements.</p>}
      </>}
      <div className="workspace-actions"><button type="button" disabled={!online || weather.isFetching || wait > 0} onClick={() => {
        if (navigator.onLine && !weather.isFetching && Date.now() >= weatherRefreshAllowedAt(weather)) void weather.refetch()
      }}>{weather.isFetching ? 'Refreshing weather…' : 'Refresh weather'}</button>{wait > 0 && <span role="status">Refresh available in {wait}s.</span>}</div>
      <p className="weather-summary-attribution"><span className="google-weather-attribution" translate="no">Google Maps</span></p>
    </WorkspaceCard>
  </div>
}
