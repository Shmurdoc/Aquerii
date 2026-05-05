# app/main.py — Aquerii AI Service
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.otel import setup_otel
from app.routers import health, tasks, documents, crm, chat, rag

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI service starting", env=settings.APP_ENV)
    setup_otel()
    yield
    logger.info("AI service shutting down")


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

# Prometheus metrics on /metrics
Instrumentator().instrument(app).expose(app)

# Routers
app.include_router(health.router)
app.include_router(tasks.router,     prefix="/tasks",     tags=["tasks"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(crm.router,       prefix="/crm",       tags=["crm"])
app.include_router(chat.router,      prefix="/chat",       tags=["chat"])
app.include_router(rag.router,       prefix="/rag",        tags=["rag"])
