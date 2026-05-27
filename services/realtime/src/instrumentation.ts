import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318/v1/traces',
})

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name':    'aquerii-realtime',
    'service.version': process.env.npm_package_version ?? '0.1.0',
  }),
  spanProcessor: new BatchSpanProcessor(exporter, {
    maxExportBatchSize:   512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis:  10000,
  }),
})

sdk.start()
console.log('OpenTelemetry SDK started for aquerii-realtime')

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error)
})