from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — every value overridable via TWINOPS_* env vars."""

    model_config = SettingsConfigDict(env_prefix="TWINOPS_", env_file=".env", extra="ignore")

    app_name: str = "TwinOps AI"
    env: Literal["local", "ci", "prod"] = "local"
    debug: bool = True

    # comma-separated in env: TWINOPS_CORS_ORIGINS='["http://localhost:3000"]'
    cors_origins: list[str] = ["http://localhost:3000"]

    # auth is flag-gated: OFF by default so the local demo needs no login.
    # Turn on for a public deploy: TWINOPS_AUTH_ENABLED=true (+ set a real password).
    auth_enabled: bool = False
    demo_user: str = "demo"
    demo_password: str = "twinops-demo"


@lru_cache
def get_settings() -> Settings:
    return Settings()
