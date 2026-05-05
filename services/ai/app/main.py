# app/main.py — Aquerii AI Service
from contextlib import asynccontextmanager

import structlog
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.otel import setup_otel
from app.middleware.credit_meter import CreditMeterMiddleware
from app.routers import health, tasks, documents, crm, chat, rag
from app.routers import ai_routes

logger = structlog.get_logger()

_redis_client: aioredis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis_client
    logger.info("AI service starting", env=settings.APP_ENV)
    setup_otel()
    _redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    yield
    logger.info("AI service shutting down")
    if _redis_client:
        await _redis_client.aclose()


app = FastAPI(
    title="Aquerii AI Service",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# CORS — only internal docker network calls expected; API service is sole caller
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://api:8000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Credit metering middleware (Redis client injected after lifespan init)
# Note: middleware is registered before the app starts, so we pass a factory lambda
# that resolves _redis_client at request time.
class _LazyCreditMeter(CreditMeterMiddleware):
    async def dispatch(self, request, call_next):
        if _redis_client is not None:
            self.redis = _redis_client
        return await super().dispatch(request, call_next)

app.add_middleware(_LazyCreditMeter, redis_client=None)  # type: ignore[arg-type]

# Prometheus metrics on /metrics
Instrumentator().instrument(app).expose(app)

# Routers
app.include_router(health.router)
app.include_router(tasks.router,       prefix="/tasks",      tags=["tasks"])
app.include_router(documents.router,   prefix="/documents",  tags=["documents"])
app.include_router(crm.router,         prefix="/crm",        tags=["crm"])
app.include_router(chat.router,        prefix="/chat",        tags=["chat"])
app.include_router(rag.router,         prefix="/rag",         tags=["rag"])
app.include_router(ai_routes.router,                          tags=["ai"])
