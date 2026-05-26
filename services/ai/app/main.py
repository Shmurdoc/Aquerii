# app/main.py — Aquerii AI Service
from contextlib import asynccontextmanager

import structlog
import redis.asyncio as aioredis
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi.responses import Response

from app.core.config import settings
from app.core.otel import setup_otel
# NOTE: Credit metering is performed at the Laravel API gateway (single-source of truth).
# The AI service is protected by an internal token and will not run its own credit
# accounting middleware by default to avoid double-charging.
from app.routers import health, tasks, documents, crm, chat, rag_routes, email
from app.routers import ai_routes
from app.security.auth import verify_internal_token

logger = structlog.get_logger()

_redis_client: aioredis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis_client
    logger.info("AI service starting", env=settings.APP_ENV)
    setup_otel()
    if settings.APP_ENV != "test":
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

# Intentionally not registering CreditMeterMiddleware here. If you want
# AI-service-level metering in the future, re-enable the middleware and
# ensure configuration matches billing expectations.

# Prometheus metrics on /metrics (disabled in test env)
if settings.APP_ENV != "test":
    Instrumentator().instrument(app)

@app.get("/metrics")
async def metrics(dep=Depends(verify_internal_token)):
    from prometheus_client import generate_latest, REGISTRY
    return Response(content=generate_latest(REGISTRY).decode("utf-8"), media_type="text/plain")

# Routers
app.include_router(health.router)
app.include_router(tasks.router,       prefix="/tasks",      tags=["tasks"])
app.include_router(documents.router,   prefix="/documents",  tags=["documents"])
app.include_router(crm.router,         prefix="/crm",        tags=["crm"])
app.include_router(chat.router,        prefix="/chat",        tags=["chat"])
app.include_router(rag_routes.router,  prefix="/rag",        tags=["rag"])
app.include_router(email.router,       prefix="/email",      tags=["email"])
app.include_router(ai_routes.router,                         tags=["ai"])
