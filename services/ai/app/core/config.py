# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Internal API key (set by Laravel API on each request)
    INTERNAL_API_KEY: str = ""

    # AI Providers
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # PostgreSQL (for credit metering reads)
    DATABASE_URL: str = "postgresql+asyncpg://aquerii_app:secret@postgres:5432/aquerii"

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000

    # OTel
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://otel-collector:4317"
    OTEL_SERVICE_NAME: str = "aquerii-ai"

    # Credit limits (per request type)
    CREDIT_COST_TASK_ASSIST: int = 1
    CREDIT_COST_DOCUMENT:    int = 2
    CREDIT_COST_CRM_SCORE:   int = 3
    CREDIT_COST_CHAT:        int = 1
    CREDIT_COST_RAG:         int = 2


settings = Settings()
