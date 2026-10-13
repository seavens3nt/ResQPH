import { Icon } from '../../components/art/Icon'
import { weatherErrorMessage } from '../../api/weather'
import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { LoadingState } from '../../components/ui/LoadingState'
import { WorkspaceCard } from './WorkspaceUI'
import { useUbeltWeather, weatherRefreshAllowedAt, useWeatherClock } from './useUbeltWeather'
import { weatherAdviceDetails, weatherIsStale } from './weatherAdvisories'

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
  const tips = data && !stale ? weatherAdviceDetails({...data, temperatureC}) : []
  const missingRain = data && data.rainChance == null && data.rainAmount == null
  return <div className="workspace-stack citizen-information-page">
    <h2>Weather advisory</h2>
    <p>Google Weather at the fixed U-Belt study-area location. Practical app suggestions, not official alerts or flood advice.</p>
    <div className="advisory-grid">
    <WorkspaceCard className="weather-reference-card" aria-labelledby="advisory-current-weather-title">
      <h3 id="advisory-current-weather-title">Current weather</h3>
      <p>U-Belt pilot area, Manila</p>
      {data && <>
        <p className="advisory-temperature">{temperatureC == null ? 'Unavailable' : `${temperatureC} °C`}</p>
        <p>Provider updated: <time dateTime={data.time}>{new Date(data.time).toLocaleString('en-PH', {timeZone:'Asia/Manila'})} PHT</time></p>
        {stale && <p role="status">Stale cached weather — may be outdated. Refresh when available; current suggestions are paused.</p>}
        <dl className="advisory-weather-metrics">{[
          {label:'Conditions',value:data.condition},
          {label:'Feels like',value:data.feelsLike == null ? 'Unavailable' : `${data.feelsLike} °C`},
          {label:'Wind',value:data.windSpeed == null ? 'Unavailable' : `${data.windSpeed} km/h`},
          {label:'Rain probability',value:data.rainChance == null ? 'Unavailable' : `${data.rainChance}%`},
          {label:'Precipitation estimate',value:data.rainAmount == null ? 'Unavailable' : `${data.rainAmount} mm`},
        ].map(item => <div className="weather-reference-inset" key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </>}
      <div className="workspace-actions advisory-current-actions"><button type="button" disabled={!online || weather.isFetching || wait > 0} onClick={() => {
        if (navigator.onLine && !weather.isFetching && Date.now() >= weatherRefreshAllowedAt(weather)) void weather.refetch()
      }}>{weather.isFetching ? 'Refreshing weather…' : 'Refresh weather'}</button></div>
    </WorkspaceCard>
    <WorkspaceCard className="weather-reference-card" aria-labelledby="advisory-practical-tips-title">
      <h3 id="advisory-practical-tips-title">Practical tips</h3>
      {tips.length ? <ul className="advisory-advice-list" aria-label="Current weather suggestions">{tips.map(tip =>
        <li className="weather-reference-inset" key={tip.id}><Icon name={tip.id === 'heat' ? 'droplet' : 'waves'} size={22}/><div><h4>{tip.title}</h4><p>{tip.text}</p><p className="advisory-tip-reason"><strong>Why this appears:</strong> {tip.why}</p></div></li>
      )}</ul> : data && !stale && <p>No special advisory conditions detected in the available measurements.</p>}
      {(!data || stale) && <p>Weather-based tips are paused until current measurements are available.</p>}
      <section className="advisory-preparation weather-reference-inset" aria-labelledby="advisory-preparation-title">
        <h4 id="advisory-preparation-title">Before heading out</h4>
        <p>General preparation reminders — independent of current weather.</p>
        <ul>
          <li>Check the latest weather update time before leaving.</li>
          <li>Keep your phone charged and essential contacts available.</li>
          {!tips.some(tip => tip.id === 'heat') && <li>Bring drinking water for your outing.</li>}
        </ul>
      </section>
    <section className="advisory-weather-footer" aria-label="Weather update information">
      {data && <p>Last updated: <time dateTime={data.time}>{new Date(data.time).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} PHT</time>{stale ? ' · Stale cached measurements' : ''}</p>}
      {!data && weather.isPending && online && weather.fetchStatus !== 'paused' && <LoadingState layout="weather" label="Loading advisory weather…"/>}
      {(!online || weather.fetchStatus === 'paused') && <p role="status">Offline. Weather cannot be refreshed until you reconnect.</p>}
      {limited && <p role="alert">{weatherErrorMessage(weather.error)}</p>}
      {weather.isError && !limited && <p role="alert">{weatherErrorMessage(weather.error)} {data ? 'Keeping the last received conditions.' : 'No weather-based suggestions are available.'}</p>}
      {missingRain && <p role="status">Precipitation measurements are missing. No rain amount or clear-weather conclusion is inferred.</p>}
      <p className="weather-summary-attribution"><span className="google-weather-attribution" translate="no">Google Maps</span></p>
    </section>
    </WorkspaceCard>
    </div>
  </div>
}
