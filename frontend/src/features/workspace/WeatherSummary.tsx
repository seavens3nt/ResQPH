import './weatherSummary.css'

/** Weather presentation only; never used as a flood-risk or routing input. */
export function WeatherSummary({temperature, high, low, condition,feelsLike,windSpeed,rainChance,rainAmount,source='Demonstration Data',kind='rain'}: {
  temperature:number; high:number; low:number; condition:string; source?:string; kind?:'clear'|'cloud'|'rain';
  feelsLike?:number|null; windSpeed?:number|null; rainChance?:number|null; rainAmount?:number|null;
}) {
  return <div className="weather-summary" aria-label="Weather summary">
    <div className="weather-summary-main">
      <strong className="weather-summary-temperature">{temperature}°</strong>
      <span className="weather-summary-condition">{condition}</span>
      <svg className="weather-summary-art" viewBox="0 0 104 100" fill="none" aria-hidden="true">
        <circle cx="64" cy="33" r="30" fill="#ffcb36"/>
        {kind!=='clear' && <g>
        <ellipse cx="64" cy="61" rx="28" ry="21" fill="#e4e8e7" fillOpacity=".88"/>
        <path d="M26 82c0-12 9-21 21-21s21 9 21 21H26Z" fill="#f1f3f2"/>
        </g>}
        {kind==='rain' && <path d="m31 76-5 10m26-10-5 10m26-10-5 10" stroke="#567eaa" strokeWidth="5" strokeLinecap="round"/>}
      </svg>
    </div>
    <div className="weather-summary-range"><span>feels like: <b>{feelsLike == null ? '—' : `${Math.round(feelsLike)}°`}</b></span><span>low: <b>{low}°</b></span><span>high: <b>{high}°</b></span></div>
    <div className="weather-summary-details">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/></svg>{windSpeed == null ? '—' : `${Math.round(windSpeed)} km/h`}</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4 4 0 1 1 1 9H6ZM7 17v4m5-4v4m5-4v4"/></svg>{rainChance == null ? '—' : `${rainChance}%`} ({rainAmount == null ? '—' : `${Number(rainAmount.toFixed(2))} mm`})</span>
    </div>
    <p className="weather-summary-source">{source}</p>
  </div>
}
