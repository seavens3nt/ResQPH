from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.routes import weather
from app.main import app

client = TestClient(app)
headers = {"X-Demo-Role": "citizen", "X-Demo-User-Id": "synthetic-citizen"}


def test_weather_requires_actor():
    assert client.get("/api/v1/weather/ubelt").status_code == 401


def test_weather_without_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr(""))
    response = client.get("/api/v1/weather/ubelt", headers=headers)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "weather_not_configured"


def test_weather_normalizes_google_data_and_keeps_secret_server_side(monkeypatch):
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr("synthetic-test-key"))
    def temp(value):
        return {"degrees": value, "unit": "CELSIUS"}
    current = {"currentTime": "2026-10-10T04:00:00Z", "temperature": temp(29),
               "feelsLikeTemperature": temp(33.5),
               "wind": {"speed": {"value": 8.2, "unit": "KILOMETERS_PER_HOUR"}, "direction": {"cardinal": "SOUTHWEST"}},
               "relativeHumidity": 80,
               "precipitation": {"probability": {"percent": 10}, "qpf": {"quantity": 0.3, "unit": "MILLIMETERS"}},
               "weatherCondition": {"type": "RAIN", "description": {"text": "Rain"}}}
    daily = {"forecastDays": [{"maxTemperature": temp(31), "minTemperature": temp(25)}]}
    async def get(url, **kwargs):
        assert kwargs["headers"] == {"X-Goog-Api-Key": "synthetic-test-key"}
        assert kwargs["params"]["location.latitude"] == "14.6042"
        assert "key" not in kwargs["params"]
        return httpx.Response(200, json=current if "currentConditions" in url else daily,
                              request=httpx.Request("GET", url))
    with patch.object(weather.httpx, "AsyncClient") as factory:
        factory.return_value.__aenter__.return_value.get = AsyncMock(side_effect=get)
        response = client.get("/api/v1/weather/ubelt", headers=headers)
    assert response.status_code == 200
    assert response.json()["temperature"] == 29
    assert response.json()["kind"] == "rain"
    assert response.json()["feelsLike"] == 33.5
    assert response.json()["windSpeed"] == 8.2
    assert response.json()["rainChance"] == 10
    assert response.json()["rainAmount"] == 0.3
    assert response.json()["humidity"] == 80
    assert response.json()["windDirection"] == "SOUTHWEST"
    assert response.headers["cache-control"] == "no-store"
    assert "synthetic-test-key" not in response.text


def test_upstream_error_is_sanitized(monkeypatch):
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr("synthetic-test-key"))
    with patch.object(weather.httpx, "AsyncClient") as factory:
        factory.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.TimeoutException("secret upstream details"))
        response = client.get("/api/v1/weather/ubelt", headers=headers)
    assert response.status_code == 503
    assert "secret upstream details" not in response.text


def test_hourly_requires_actor_and_configuration(monkeypatch):
    assert client.get("/api/v1/weather/ubelt/hourly").status_code == 401
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr(""))
    assert client.get("/api/v1/weather/ubelt/hourly", headers=headers).json()["error"]["code"] == "weather_not_configured"


def forecast_hour():
    return {"interval": {"startTime": "2026-10-10T04:00:00Z", "endTime": "2026-10-10T05:00:00Z"},
            "temperature": {"degrees": 29, "unit": "CELSIUS"},
            "weatherCondition": {"type": "RAIN", "description": {"text": "Light rain"}},
            "precipitation": {"probability": {"percent": 40}, "qpf": {"quantity": 0.3, "unit": "MILLIMETERS"}},
            "relativeHumidity": 80, "airPressure": {"meanSeaLevelMillibars": 1010}, "isDaytime": True}


@pytest.mark.parametrize("optional", [True, False])
def test_hourly_normalizes_forecast_with_nullable_measurements(monkeypatch, optional):
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr("synthetic-test-key"))
    hour = forecast_hour()
    if not optional:
        for key in ("precipitation", "relativeHumidity", "airPressure", "isDaytime"):
            hour.pop(key)
    async def get(url, **kwargs):
        assert url.endswith("forecast/hours:lookup")
        assert kwargs["params"]["hours"] == "6"
        assert kwargs["params"]["pageSize"] == "6"
        assert kwargs["headers"]["X-Goog-Api-Key"] == "synthetic-test-key"
        assert "key" not in kwargs["params"]
        return httpx.Response(200, json={"forecastHours": [hour]}, request=httpx.Request("GET", url))
    with patch.object(weather.httpx, "AsyncClient") as factory:
        factory.return_value.__aenter__.return_value.get = AsyncMock(side_effect=get)
        response = client.get("/api/v1/weather/ubelt/hourly", headers=headers)
    assert response.status_code == 200
    data = response.json()[0]
    assert data["temperature"] == 29
    assert data["rainAmount"] == (0.3 if optional else None)
    assert data["humidity"] == (80 if optional else None)
    assert data["windSpeed"] is None
    assert response.headers["cache-control"] == "no-store"
    assert "synthetic-test-key" not in response.text


@pytest.mark.parametrize("payload", [{"forecastHours": []}, {"forecastHours": [{"temperature": None}]}])
def test_hourly_rejects_malformed_forecast(monkeypatch, payload):
    monkeypatch.setattr(weather.settings, "google_weather_api_key", SecretStr("synthetic-test-key"))
    with patch.object(weather.httpx, "AsyncClient") as factory:
        factory.return_value.__aenter__.return_value.get = AsyncMock(return_value=httpx.Response(
            200, json=payload, request=httpx.Request("GET", "https://weather.googleapis.com")))
        response = client.get("/api/v1/weather/ubelt/hourly", headers=headers)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "weather_unavailable"
