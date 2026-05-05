"""
conftest.py — shared fixtures for the test suite.

Patches out external dependencies (Redis, OTel, Prometheus) that would
fail or hang in a unit-test environment with no running infrastructure.
"""
import os
import sys
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Environment overrides — must be set before any app module is imported
# ---------------------------------------------------------------------------
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("INTERNAL_SECRET", "test-secret-xyz")
os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")


# ---------------------------------------------------------------------------
# Module-level patches applied before the app is imported in test_routers.py
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def patch_otel():
    """Disable OTel so tests don't require a collector."""
    with patch("app.core.otel.setup_otel", return_value=None):
        yield


@pytest.fixture(scope="session", autouse=True)
def patch_prometheus():
    """Prevent Prometheus Instrumentator from registering on test client."""
    mock_inst = MagicMock()
    mock_inst.instrument.return_value = mock_inst
    mock_inst.expose.return_value = mock_inst
    with patch("app.main.Instrumentator", return_value=mock_inst):
        yield


@pytest.fixture(scope="session", autouse=True)
def patch_aioredis_lifespan():
    """Prevent lifespan from connecting to a real Redis server."""
    mock_redis = AsyncMock()
    mock_redis.aclose = AsyncMock()
    with patch("app.main.aioredis.from_url", return_value=mock_redis):
        yield
