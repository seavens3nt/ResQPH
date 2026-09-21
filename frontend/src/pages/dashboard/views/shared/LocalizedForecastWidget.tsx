import { Icon } from '../../../../components/art/Icon'
import './LocalizedForecastWidget.css'

export interface HourlyForecastItem {
  time?: string
  temp?: number | string
  rainMm?: number | string
  pop?: string
  icon?: string
}

export interface WaterStationItem {
  name?: string
  status?: string
  currentLevel?: number | string
}

interface LocalizedForecastWidgetProps {
  hourly?: HourlyForecastItem[]
  waterStations?: WaterStationItem[]
}

export function LocalizedForecastWidget({ hourly = [] }: LocalizedForecastWidgetProps) {
  const currentWeather = {
    location: 'U-Belt Pilot Area',
    subLocation: 'Controlled rainfall scenario · demonstration data',
    temp: 29,
    condition: 'Heavy Rain Scenario',
    high: 31,
    low: 25,
    humidity: '92%',
    wind: '24 km/h SW',
    precipitation: '18 mm/hr',
    warning: 'Controlled Scenario: High tide & heavy rainfall at 2:00 PM',
  }

  const hours = hourly.length > 0 ? hourly : [
    { time: 'Now', temp: '29°', pop: '90%', icon: '🌧️' },
    { time: '12 PM', temp: '29°', pop: '95%', icon: '⛈️' },
    { time: '1 PM', temp: '30°', pop: '85%', icon: '🌧️' },
    { time: '2 PM', temp: '31°', pop: '100%', icon: '⛈️' },
    { time: '3 PM', temp: '30°', pop: '70%', icon: '🌧️' },
    { time: '4 PM', temp: '28°', pop: '60%', icon: '🌦️' },
    { time: '5 PM', temp: '26°', pop: '40%', icon: '☁️' },
    { time: '6 PM', temp: '25°', pop: '20%', icon: '☁️' },
  ]

  return (
    <div className="forecast-widget">
      {/* Flood / Rainfall Warning */}
      <div className="forecast-warning">
        <Icon name="alert" size={16} />
        <span>{currentWeather.warning}</span>
      </div>

      {/* Main Stats Row */}
      <div className="forecast-main">
        <div className="forecast-identity">
          <span className="forecast-location">{currentWeather.location}</span>
          <span className="forecast-sublocation">{currentWeather.subLocation}</span>
          <div className="forecast-temp-line">
            <span className="forecast-degrees">{currentWeather.temp}°</span>
            <div className="forecast-condition-wrap">
              <span className="forecast-condition">{currentWeather.condition}</span>
              <span className="forecast-hilo">H: {currentWeather.high}° · L: {currentWeather.low}°</span>
            </div>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="forecast-metrics">
          <div className="forecast-metric-chip">
            <span className="forecast-metric-label">Rainfall</span>
            <strong className="forecast-metric-val">{currentWeather.precipitation}</strong>
          </div>
          <div className="forecast-metric-chip">
            <span className="forecast-metric-label">Wind</span>
            <strong className="forecast-metric-val">{currentWeather.wind}</strong>
          </div>
          <div className="forecast-metric-chip">
            <span className="forecast-metric-label">Humidity</span>
            <strong className="forecast-metric-val">{currentWeather.humidity}</strong>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="forecast-hourly">
        <div className="forecast-hourly-head">
          <Icon name="clock" size={13} />
          <span>Hourly Intensity</span>
        </div>
        <div className="forecast-hourly-strip">
          {hours.map((item, idx) => (
            <div key={idx} className="hourly-cell">
              <span className="hourly-cell__time">{item.time}</span>
              <span className="hourly-cell__icon">{item.icon || '🌧️'}</span>
              <span className="hourly-cell__temp">{item.temp ?? 28}°</span>
              <span className="hourly-cell__pop">{item.pop || (item.rainMm ? `${item.rainMm}mm` : '80%')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
