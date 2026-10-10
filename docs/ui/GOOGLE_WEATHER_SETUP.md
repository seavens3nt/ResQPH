# Google Weather local setup

Citizen Home displays current temperature/conditions, feels-like, wind speed,
rain probability/amount and today's forecast high/low
for the fixed U-Belt point (14.6042, 120.9946). This is informational weather,
not live flood prediction, official dispatch or a routing input. The adjacent
card now shows a live six-hour Google forecast, replacing the controlled hourly
image and fixed metrics. The former controlled warning on Home is removed.
Flood-routing scenarios remain controlled and are not influenced by weather.

1. Follow [Google Weather setup](https://developers.google.com/maps/documentation/weather/get-api-key).
   Google documents a prototype Maps Demo Key option, or a standard API key with
   billing enabled. Confirm eligibility, quota and pricing in your own account.
2. Enable Weather API and restrict the server key to Weather API. Do not reuse a
   browser-restricted Maps JavaScript key for this server-side integration.
3. In the ignored `backend/.env`, set `GOOGLE_WEATHER_API_KEY` locally. Never paste
   its value into chat or commit it. Restart the backend to load the setting.
4. Refresh Home. Confirm a current timestamp in Philippine time and real conditions.
   Missing setup/service failure must display unavailable, never synthetic values.

GET `/api/v1/weather/ubelt` requires the existing demo actor headers. It requests
Google current conditions and daily forecast in parallel (two provider requests
per load), validates Celsius values, returns only normalized fields and sets
`Cache-Control: no-store`. Weather loads on Home mount/reload; there is no refresh
button, interval, window-focus or reconnect refresh. No weather is persisted to
MongoDB or offline storage. Missing optional measurements display an em dash,
not invented values. Units are Celsius, km/h and millimeters.
GET `/api/v1/weather/ubelt/hourly` separately requests six forecast hours (one
additional Google call, `hours=6&pageSize=6`). Both frontend queries start
independently; an hourly failure does not block the current weather card.
Columns show Philippine time, conditions, Celsius temperature and precipitation
amount/probability. Per-hour wind, humidity and pressure are omitted from the UI
to keep both weather cards equally tall; those fields remain in the API. The top rainfall
metric is the amount in the first forecast interval in mm, not observed mm/hr.
Wind and humidity are current-condition measurements. This is forecast, not the
screenshot's historical record. No location search or unit toggle was added.
Same server-only key; no additional environment setting is required.
This role simulation is not production protection for a billable API: review
authentication, rate limits, quota restrictions and public-app terms before hosting.

Google attribution stays visibly inside the weather card and apart from demo
content. No Google weather layer is added to the Leaflet map. Provider policies:
[Weather policies](https://developers.google.com/maps/documentation/weather/policies).
