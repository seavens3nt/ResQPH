"""Informational Google Weather data, isolated from flood routing."""
import asyncio
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, Response
from pydantic import AwareDatetime, BaseModel, Field, FiniteFloat, ValidationError

from app.api.dependencies.demo_role import get_demo_actor
from app.core.config import settings
from app.schemas.common import DemoActor, ServiceError

router = APIRouter(tags=["weather"])


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
            upstream = await client.get(
                "https://weather.googleapis.com/v1/forecast/hours:lookup",
                params={"location.latitude": "14.6042", "location.longitude": "120.9946",
                        "unitsSystem": "METRIC", "languageCode": "en", "hours": "6", "pageSize": "6"},
                headers={"X-Goog-Api-Key": key},
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
                client.get("https://weather.googleapis.com/v1/currentConditions:lookup",
                           params=params, headers={"X-Goog-Api-Key": key}),
                client.get("https://weather.googleapis.com/v1/forecast/days:lookup",
                           params={**params, "days": "1"}, headers={"X-Goog-Api-Key": key}),
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
