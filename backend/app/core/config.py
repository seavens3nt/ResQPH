from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResQPH API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017/?replicaSet=rs0"
    mongodb_database: str = "resqph"
    frontend_origins: str = "http://localhost:5173"

    # -----------------------------------------------------------------------
    # ML runtime adapter
    # -----------------------------------------------------------------------
    # When False (default), the /ml/road-risk endpoint always returns the
    # deterministic rule-based fallback. No optional dependency is required
    # and no artifact is loaded.
    #
    # When True, the adapter attempts to load the XGBoost classifier at
    # `ml_artifacts_dir / ml_classifier_filename`. Any load failure falls
    # back cleanly to the rule-based path — it never blocks startup.
    #
    # See docs/ml/ML_FEASIBILITY.md and docs/decisions/DECISION_LOG.md (D-022).
    ml_enabled: bool = False
    ml_artifacts_dir: str = (
        "../ml/external-experiments/ondoy-2009-metro-manila/artifacts"
    )
    ml_classifier_filename: str = "road_flood_classifier.pkl"

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