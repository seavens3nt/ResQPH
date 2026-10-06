from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResQPH API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017/?replicaSet=rs0"
    mongodb_database: str = "resqph"
    frontend_origins: str = "http://localhost:5173"
    route_snap_max_distance_m: float = 900.0
    simulation_speed_mps: float = 5.0
    report_rate_limit_per_minute: int = 5
    route_rate_limit_per_minute: int = 10
    tracking_rate_limit_per_minute: int = 60
    simulation_control_rate_limit_per_minute: int = 10
    broad_ip_rate_limit_per_minute: int = 180

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
    )

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
