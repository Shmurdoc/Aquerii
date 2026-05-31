# Success Metrics (KPIs)

## Phase 1: Infrastructure KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Caddy SSL validity | 100% (no expired certs) | Daily cert check |
| Homarr uptime | 99.9% | SigNoz uptime metric |
| PostgreSQL connections | < 80% pool utilization | Connection pool metrics |
| SigNoz ingestion | < 5s latency | Otel collector metrics |

## Phase 2: Business Systems KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| InvenTree stock query | < 200ms response | Gateway API latency |
| ERPNext invoice creation | < 2s | End-to-end timing |
| Twenty CRM customer load | < 300ms | UI load time |
| Paperless OCR throughput | < 30s per document | Processing time |

## Phase 3: Integration KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Gateway API availability | 99.9% | Health check endpoint |
| Webhook delivery | < 5s (p95) | Event timestamp diff |
| Stock → PO sync | < 10s end-to-end | InvenTree to ERPNext |
| API sync idempotency | 0 duplicate POs | Business validation |

## Phase 4: UX KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Homarr tile load | < 1s | Browser DevTools |
| Zulip message delivery | < 2s | Chat ops timing |
| HuixiangDou query | < 5s response | AI response time |
| Mobile accessibility | 0 critical a11y issues | Lighthouse audit |

## Overall System KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| System uptime | 99.5% | SigNoz overall |
| Mean Time to Recovery | < 15min | Incident response log |
| Failed transaction rate | < 0.1% | Gateway error rate |
| User satisfaction | > 4/5 | Post-launch survey |

## Testing Coverage KPIs
| Component | Target Coverage |
|-----------|----------------|
| Gateway API | 80% unit, 70% integration |
| InvenTree sync logic | 90% unit |
| Webhook handlers | 85% unit + integration |
| Frontend widgets | 70% component tests |