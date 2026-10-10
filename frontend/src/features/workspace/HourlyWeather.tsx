import type { WeatherHour } from '../../api/weather'
import './hourlyWeather.css'

function HourIcon({hour}:{hour:WeatherHour}) {
  return <svg viewBox="0 0 64 56" fill="none" aria-hidden="true">
    {hour.isDaytime === false ? <path d="M38 5a19 19 0 1 0 15 26A19 19 0 0 1 38 5Z" fill="#a5bce6"/> : <circle cx="38" cy="21" r="17" fill="#ffcb36"/>}
    {hour.kind!=='clear' && <path d="M15 41a11 11 0 1 1 2-22 15 15 0 0 1 28 4 9 9 0 1 1 3 18H15Z" fill="#d3e1eb"/>}
    {hour.kind==='rain' && <path d="m20 46-3 6m15-6-3 6m15-6-3 6" stroke="#6b9bdd" strokeWidth="3" strokeLinecap="round"/>}
  </svg>
}

const hourFormat=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',hour:'numeric'})
const number=(value:number|null,suffix:string)=>value==null ? '—' : `${Number(value.toFixed(1))}${suffix}`

/** Forecast intervals, not historical observations or flood predictions. */
export function HourlyWeather({hours}:{hours:WeatherHour[]}) {
  return <div className="live-hourly-panel">
    <div className="live-hourly-panel-heading"><span>Next {hours.length} hours · PHT</span><span>°C</span></div>
    <div className="live-hourly-scroll" tabIndex={0} role="region" aria-label="Hourly weather forecast">
      <ol className="live-hourly-list">
        {hours.map(hour=><li key={hour.time}>
          <time dateTime={hour.time}>{hourFormat.format(new Date(hour.time))}</time>
          <HourIcon hour={hour}/>
          <span className="live-hourly-condition">{hour.condition}</span>
          <strong>{Math.round(hour.temperature)}°</strong>
          <span title="Forecast precipitation">{hour.rainAmount==null ? '—' : `${Number(hour.rainAmount.toFixed(2))} mm`}</span>
          <span title="Chance of precipitation">Rain {number(hour.rainChance,'%')}</span>
        </li>)}
      </ol>
    </div>
    <span className="google-weather-attribution" translate="no">Google Maps</span>
  </div>
}
