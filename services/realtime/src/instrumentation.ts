import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4317',
})

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]:    'aquerii-realtime',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '0.1.0',
  }),
  spanProcessor: new SimpleSpanProcessor(exporter),
})

sdk.start()
console.log('OpenTelemetry SDK started for aquerii-realtime')

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error)
})
