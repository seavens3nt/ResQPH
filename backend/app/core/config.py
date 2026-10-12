from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_environment: Literal["development", "staging", "production"] = "development"
    release_sha: str = "local"
    database_timeout_ms: int = Field(default=5000, ge=100, le=30000)
    readiness_timeout_seconds: float = Field(default=2.0, gt=0, le=5)
    app_name: str = "ResQPH API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017/?replicaSet=rs0"
    mongodb_database: str = "resqph"
    frontend_origins: str = "http://localhost:5173"
    auth_cookie_name: str = "resqph_session"
    auth_csrf_cookie_name: str = "resqph_csrf"
    auth_cookie_secure: bool = True
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_session_ttl_hours: int = Field(default=12, ge=1, le=168)
    auth_allow_demo_headers: bool = False
    route_snap_max_distance_m: float = 900.0
    station_dispatch_snap_max_distance_m: float = Field(default=75.0, gt=0, le=900)
    simulation_speed_mps: float = 5.0
    report_rate_limit_per_minute: int = 5
    route_rate_limit_per_minute: int = 10
    tracking_rate_limit_per_minute: int = 60
    simulation_control_rate_limit_per_minute: int = 10
    broad_ip_rate_limit_per_minute: int = 180
    google_weather_api_key: SecretStr = SecretStr("")

    # -----------------------------------------------------------------------
    # ML runtime adapter
    # -----------------------------------------------------------------------
    # When False (default), the /ml/road-risk endpoint always returns the
    # deterministic rule-based fallback. No optional dependency is required
    # and no artifact is loaded.
    #
    # Enabling ML is not enough to activate an artifact. The adapter also
    # requires explicit artifact/metadata paths, a pinned SHA-256 digest, and
    # an exact runtime feature/target contract match. Any failure retains the
    # rule-based path and never blocks startup.
    #
    # See docs/ml/ML_FEASIBILITY.md and docs/decisions/DECISION_LOG.md (D-022).
    ml_enabled: bool = False
    ml_artifact_path: str = ""
    ml_metadata_path: str = ""
    ml_artifact_sha256: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    @model_validator(mode="after")
    def validate_hosted_settings(self) -> "Settings":
        if self.app_environment == "development":
            return self
        if not self.auth_cookie_secure or self.auth_allow_demo_headers or self.ml_enabled:
            raise ValueError("Hosted environments require secure cookies, demo headers disabled and ML disabled")
        if self.auth_cookie_samesite not in {"lax", "strict"}:
            raise ValueError("The same-origin API proxy requires SameSite lax or strict")
        if not self.cors_origins:
            raise ValueError("Hosted environments require exact HTTPS frontend origins")
        for origin in self.cors_origins:
            parsed = urlsplit(origin)
            if (parsed.scheme != "https" or not parsed.hostname or parsed.hostname in {"localhost", "127.0.0.1"}
                    or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment
                    or "*" in origin):
                raise ValueError("Hosted frontend origins must be exact HTTPS origins without paths")
        uri = urlsplit(self.mongodb_uri)
        if (uri.scheme != "mongodb+srv" or not uri.hostname or not uri.hostname.endswith(".mongodb.net")
                or not uri.username or not uri.password or "directconnection" in uri.query.lower()
                or "replicaset" in uri.query.lower()):
            raise ValueError("Hosted environments require an authenticated Atlas SRV URI without local topology options")
        expected_database = "resqph_production" if self.app_environment == "production" else "resqph_staging"
        if self.mongodb_database != expected_database:
            raise ValueError(f"Hosted database must be {expected_database}")
        if self.api_prefix != "/api/v1":
            raise ValueError("Hosted API prefix must match the frontend proxy at /api/v1")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
