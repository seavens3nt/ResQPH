"""Informational Google Weather data, isolated from flood routing."""
import asyncio
import math
import time
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, Response
from pydantic import AwareDatetime, BaseModel, Field, FiniteFloat, ValidationError

from app.api.dependencies.demo_role import get_demo_actor
from app.core.config import settings
from app.core.rate_limit import RateLimitExceeded
from app.schemas.common import DemoActor, ServiceError

router = APIRouter(tags=["weather"])

# Process-local failure cooldown only; weather values are never persisted here.
_quota_cooldowns: dict[str, tuple[float, bool]] = {}


class WeatherQuotaExceeded(RateLimitExceeded):
    def __init__(self, retry_after: int, daily: bool) -> None:
        super().__init__(retry_after)
        self.code = "weather_quota_exceeded"
        self.message = (
            "Google Weather daily quota exhausted. Wait for the quota to reset "
            "or ask the project administrator to review Google Cloud Weather API quotas."
            if daily else "Google Weather rate limit reached. Wait before refreshing."
        )


async def google_weather_request(
    client: httpx.AsyncClient, path: str, params: dict[str, str], key: str
) -> httpx.Response:
    deadline, daily = _quota_cooldowns.get(path, (0.0, False))
    remaining = math.ceil(deadline - time.monotonic())
    if remaining > 0:
        raise WeatherQuotaExceeded(remaining, daily)
    upstream = await client.get(
        f"https://weather.googleapis.com/v1/{path}", params=params,
        headers={"X-Goog-Api-Key": key},
    )
    if upstream.status_code == 429:
        # Inspect only quota identifiers; never forward provider messages/project IDs.
        try:
            details = upstream.json().get("error", {}).get("details", [])
            daily = any("perday" in str(detail.get("metadata", {}).get("quota_limit", "")).lower()
                        for detail in details if isinstance(detail, dict))
        except (ValueError, AttributeError, TypeError):
            daily = False
        delay = 3600 if daily else 60
        raw_delay = upstream.headers.get("Retry-After", "")
        if raw_delay.isdigit():
            delay = max(delay, min(int(raw_delay), 86400))
        _quota_cooldowns[path] = (time.monotonic() + delay, daily)
        raise WeatherQuotaExceeded(delay, daily)
    if upstream.status_code in (401, 403):
        raise ServiceError(503, "weather_configuration_error",
                           "Google Weather access denied. Check the server API key, "
                           "Weather API enablement, key restrictions and project billing.")
    upstream.raise_for_status()
    return upstream


class Temperature(BaseModel):
    degrees: FiniteFloat
    unit: Literal["CELSIUS"]


class Description(BaseModel):
    text: str = Field(min_length=1)


class Condition(BaseModel):
    description: Description
    type: str


class Current(BaseModel):
    currentTime: AwareDatetime
    temperature: Temperature
    weatherCondition: Condition
    feelsLikeTemperature: Temperature | None = None
    wind: "Wind | None" = None
    precipitation: "Precipitation | None" = None
    relativeHumidity: int | None = Field(default=None, ge=0, le=100)


class Speed(BaseModel):
    value: FiniteFloat = Field(ge=0)
    unit: Literal["KILOMETERS_PER_HOUR"]


class Wind(BaseModel):
    speed: Speed
    direction: "Direction | None" = None


class Direction(BaseModel):
    cardinal: str


class Probability(BaseModel):
    percent: int = Field(ge=0, le=100)


class RainAmount(BaseModel):
    quantity: FiniteFloat = Field(ge=0)
    unit: Literal["MILLIMETERS"]


class Precipitation(BaseModel):
    probability: Probability | None = None
    qpf: RainAmount | None = None


class Day(BaseModel):
    maxTemperature: Temperature
    minTemperature: Temperature


class Forecast(BaseModel):
    forecastDays: list[Day] = Field(min_length=1)


class WeatherSummary(BaseModel):
    temperature: float
    high: float
    low: float
    condition: str
    kind: Literal["clear", "cloud", "rain"]
    time: AwareDatetime
    feelsLike: float | None = None
    windSpeed: float | None = None
    rainChance: int | None = None
    rainAmount: float | None = None
    humidity: int | None = None
    windDirection: str | None = None


class Interval(BaseModel):
    startTime: AwareDatetime
    endTime: AwareDatetime


class Pressure(BaseModel):
    meanSeaLevelMillibars: FiniteFloat = Field(gt=0)


class ForecastHour(BaseModel):
    interval: Interval
    temperature: Temperature
    weatherCondition: Condition
    wind: Wind | None = None
    precipitation: Precipitation | None = None
    relativeHumidity: int | None = Field(default=None, ge=0, le=100)
    airPressure: Pressure | None = None
    isDaytime: bool | None = None


class HourlyForecast(BaseModel):
    forecastHours: list[ForecastHour] = Field(min_length=1, max_length=6)


class HourSummary(BaseModel):
    time: AwareDatetime
    endTime: AwareDatetime
    temperature: float
    condition: str
    kind: Literal["clear", "cloud", "rain"]
    isDaytime: bool | None
    rainChance: int | None
    rainAmount: float | None
    windSpeed: float | None
    humidity: int | None
    pressure: float | None


def condition_kind(value: str) -> Literal["clear", "cloud", "rain"]:
    if value == "CLEAR":
        return "clear"
    return "rain" if any(term in value for term in ("RAIN", "DRIZZLE", "THUNDER")) else "cloud"


@router.get("/weather/ubelt/hourly", response_model=list[HourSummary])
async def ubelt_hourly_weather(
    response: Response, _actor: Annotated[DemoActor, Depends(get_demo_actor)]
) -> list[HourSummary]:
    response.headers["Cache-Control"] = "no-store"
    key = settings.google_weather_api_key.get_secret_value()
    if not key:
        raise ServiceError(503, "weather_not_configured", "Google Weather API is not configured.")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            upstream = await google_weather_request(
                client, "forecast/hours:lookup",
                params={"location.latitude": "14.6042", "location.longitude": "120.9946",
                        "unitsSystem": "METRIC", "languageCode": "en", "hours": "6", "pageSize": "6"},
                key=key,
            )
        upstream.raise_for_status()
        forecast = HourlyForecast.model_validate(upstream.json())
        if any(hour.interval.endTime <= hour.interval.startTime for hour in forecast.forecastHours):
            raise ValueError("Invalid forecast interval")
    except (httpx.HTTPError, ValidationError, ValueError):
        raise ServiceError(503, "weather_unavailable", "Google hourly weather is unavailable. Try again.") from None
    return [HourSummary(
        time=hour.interval.startTime, endTime=hour.interval.endTime,
        temperature=hour.temperature.degrees, condition=hour.weatherCondition.description.text,
        kind=condition_kind(hour.weatherCondition.type), isDaytime=hour.isDaytime,
        rainChance=hour.precipitation.probability.percent if hour.precipitation and hour.precipitation.probability else None,
        rainAmount=hour.precipitation.qpf.quantity if hour.precipitation and hour.precipitation.qpf else None,
        windSpeed=hour.wind.speed.value if hour.wind else None, humidity=hour.relativeHumidity,
        pressure=hour.airPressure.meanSeaLevelMillibars if hour.airPressure else None,
    ) for hour in forecast.forecastHours]


@router.get("/weather/ubelt", response_model=WeatherSummary)
async def ubelt_weather(
    response: Response, _actor: Annotated[DemoActor, Depends(get_demo_actor)]
) -> WeatherSummary:
    response.headers["Cache-Control"] = "no-store"
    key = settings.google_weather_api_key.get_secret_value()
    if not key:
        raise ServiceError(503, "weather_not_configured", "Google Weather API is not configured.")
    params = {"location.latitude": "14.6042", "location.longitude": "120.9946",
              "unitsSystem": "METRIC", "languageCode": "en"}
    try:
        # Header auth prevents the secret appearing in request URLs/logs.
        async with httpx.AsyncClient(timeout=8.0) as client:
            current_response, daily_response = await asyncio.gather(
                google_weather_request(client, "currentConditions:lookup", params, key),
                google_weather_request(client, "forecast/days:lookup", {**params, "days": "1"}, key),
            )
        current_response.raise_for_status()
        daily_response.raise_for_status()
        current = Current.model_validate(current_response.json())
        day = Forecast.model_validate(daily_response.json()).forecastDays[0]
    except (httpx.HTTPError, ValidationError, ValueError):
        raise ServiceError(503, "weather_unavailable", "Google Weather is unavailable. Try again.") from None
    condition = current.weatherCondition
    kind = condition_kind(condition.type)
    return WeatherSummary(temperature=current.temperature.degrees,
                          high=day.maxTemperature.degrees, low=day.minTemperature.degrees,
                          condition=condition.description.text, kind=kind, time=current.currentTime,
                          feelsLike=current.feelsLikeTemperature.degrees if current.feelsLikeTemperature else None,
                          windSpeed=current.wind.speed.value if current.wind else None,
                          rainChance=current.precipitation.probability.percent if current.precipitation and current.precipitation.probability else None,
                          rainAmount=current.precipitation.qpf.quantity if current.precipitation and current.precipitation.qpf else None,
                          humidity=current.relativeHumidity,
                          windDirection=current.wind.direction.cardinal if current.wind and current.wind.direction else None)
