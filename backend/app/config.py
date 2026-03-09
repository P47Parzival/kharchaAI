"""
KharchaAI Backend Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "KharchaAI"
    debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./kharcha.db"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # Price Cache
    price_cache_ttl_hours: int = 48  # How long cached prices are valid

    # Scraper
    scraper_timeout_seconds: int = 30
    max_sources_per_component: int = 3

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
