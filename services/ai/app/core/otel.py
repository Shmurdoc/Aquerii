"""OpenTelemetry setup for the AI service."""
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

logger = logging.getLogger(__name__)


def setup_otel(app=None, service_name: str = "aquerii-ai", service_version: str = "0.1.0") -> None:
    """Initialise OTel tracing and instrument FastAPI + httpx."""
    resource = Resource.create({
        SERVICE_NAME:    service_name,
        SERVICE_VERSION: service_version,
    })

    exporter = OTLPSpanExporter()   # reads OTEL_EXPORTER_OTLP_ENDPOINT from env

    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    HTTPXClientInstrumentor().instrument()

    if app is not None:
        FastAPIInstrumentor.instrument_app(app)

    logger.info("OpenTelemetry tracing initialised for %s", service_name)
