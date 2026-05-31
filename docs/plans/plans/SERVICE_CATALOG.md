# SERVICE CATALOG — Mine System Enterprise Platform

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Lead Architect + All Team Leads  

This catalog defines every service in the system: its purpose, source code location, key capabilities, integration points, deployment spec, and agent assignments.

---

## Service 1: InvenTree (Inventory Hero)

**Source**: `E:\Mine System\InvenTree-master\`  
**Domain**: Inventory management  
**Source of Truth For**: Stock quantities, parts, BOMs, purchase orders, build orders, supplier info, QR codes, lifecycle states  
**Port**: 8001  
**Tech Stack**: Python 3.11, Django, PostgreSQL  

### Key Capabilities (Production Features to Enable)
- **QR Code Scanning**: Every part and stock item gets a unique QR code. Warehouse operators scan via mobile to update stock, move items, and record transactions.
- **Bill of Materials (BOM)**: Multi-level BOM with versioning. Each BOM version is immutable once approved. BOM explosion calculates required components for build orders.
- **Lifecycle States**: Part lifecycle: `Active → Deprecated → Retired`. Stock lifecycle: `Available → Reserved → Consumed → Returned`. State transitions trigger events.
- **Supplier Management**: Multiple suppliers per part with pricing tiers, lead times, and minimum order quantities. Preferred supplier drives auto-PO logic.
- **Build Orders**: Kitting and assembly tracking. Build orders consume components, produce assembled parts, decrement stock at each stage.
- **Stocktake**: Scheduled and ad-hoc stock counts. Discrepancies auto-reconciled with audit trail.
- **Machine Integration**: InvenTree `machine/` module for barcode scanners, label printers.
- **Plugin System**: `plugin/` module for custom integrations. Gateway uses InvenTree's built-in plugin API to subscribe to events.

### InvenTree Python SDK Usage
```python
# Example: Auto-reorder check
from inventree.api import InvenTreeAPI
from inventree.part import Part, PartCategory
from inventree.stock import StockItem, StockLocation

api = InvenTreeAPI('http://inventree:8001', token=INVENTREE_TOKEN)

# Get all parts below reorder point
low_stock_parts = Part.list(api, low_stock=True)
for part in low_stock_parts:
    supplier = part.getSupplierParts()[0]  # preferred supplier
    emit_event('inventory.stock.low', {
        'part_id': part.pk,
        'part_name': part.name,
        'current_qty': part.in_stock,
        'reorder_qty': part.minimum_stock,
        'supplier_id': supplier.pk,
        'supplier_sku': supplier.SKU,
    })
```

### InvenTree Events (via EventMixin)
InvenTree's `events.py` in each app (build, order, part, stock) emits signals. The gateway plugin subscribes via `InvenTree/plugin/base/event/` system.

```python
# services/gateway/plugins/inventree_gateway_plugin.py
from plugin import InvenTreePlugin
from plugin.mixins import EventMixin

class GatewayPlugin(InvenTreePlugin, EventMixin):
    NAME = "Gateway Event Bridge"
    
    def process_event(self, event, *args, **kwargs):
        # Forward all InvenTree events to Gateway event bus
        gateway_client.post('/events/ingest', {
            'source_service': 'inventree',
            'event_type': f'inventory.{event}',
            'payload': kwargs
        })
```

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| AureusERP | → | PO creation | stock.low event |
| AureusERP | ← | PO approved | po.approved event |
| Twenty CRM | ← | Stock reservation | deal.won event |
| Gateway | ↔ | All events | EventMixin |
| HuixiangDou | → | Parts catalog | nightly sync |

### Deployment
```yaml
# docker/docker-compose.inventory.yml
services:
  inventree:
    image: inventree/inventree:0.14.x
    ports: ["8001:8000"]
    environment:
      INVENTREE_DB_ENGINE: postgresql
      INVENTREE_DB_NAME: inventree_db
      INVENTREE_DB_USER: ${INVENTREE_DB_USER}
      INVENTREE_DB_PASSWORD: ${INVENTREE_DB_PASS}  # From Vault
      INVENTREE_DB_HOST: postgres-inventree
    volumes:
      - inventree_data:/home/inventree/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks: [mine_frontend, mine_backend]
```

### Agent Assignments
| Task | Agent | Source |
|------|-------|--------|
| InvenTree SDK integration | `engineering-backend-architect.md` | agency-agents-main |
| QR plugin development | RUFLO `architect.md` | RUFLO |
| BOM testing | RUFLO `test-writer.md` | RUFLO |
| Security audit | gstack `security.md` | gstack-main |
| Performance tuning | RUFLO `performance-analyzer.md` | RUFLO |

---

## Service 2: AureusERP (Finance & Operations)

**Source**: `E:\Mine System\aureuserp-master\`  
**Domain**: ERP, Finance, HR  
**Source of Truth For**: Invoices, purchase orders, payments, accounting, employees, payroll  
**Port**: 8002  
**Tech Stack**: PHP 8.2, Laravel 11, Filament 3, PostgreSQL  

### Key Capabilities (Active Plugins)
From `plugins/webkul/`:
- **accounting** — Chart of accounts, journal entries, bank reconciliation
- **accounts** — Accounts payable/receivable
- **analytics** — Business intelligence dashboards
- **contacts** — Customer/vendor contact management
- **employees** — HR records, org chart
- **inventories** — Inventory module (integrates with InvenTree via Gateway)
- **invoices** — Customer invoicing, proforma, recurring
- **payments** — Payment tracking, bank feeds
- **products** — Product catalog (mirrors InvenTree parts)
- **purchases** — Purchase orders, vendor management
- **recruitments** — HR recruitment module
- **sales** — Sales orders, quotations
- **support** — Customer support tickets
- **timesheets** — Time tracking

### AureusERP API Pattern
```php
// AureusERP uses Laravel Sanctum for API auth
// All API calls: Authorization: Bearer {token}
// Base URL: http://aureusrep:8002/api/

// Create Purchase Order
POST /api/purchases/orders
{
  "vendor_id": 123,
  "order_date": "2026-05-04",
  "lines": [
    {"product_id": 456, "qty": 100, "unit_price": 0.50}
  ],
  "reference": "AUTO-PO-BOLT001",  // idempotency via reference
  "notes": "Auto-generated from InvenTree low stock alert"
}
```

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| InvenTree | ← | Low stock alerts | stock.low event |
| InvenTree | → | PO approved | po.approved event |
| Twenty CRM | ← | Deal won → invoice | deal.won event |
| Twenty CRM | → | Payment received | payment.received event |
| Paperless | → | Invoice documents | invoice.created event |
| Gateway | ↔ | All business events | REST API |

### Deployment
```yaml
services:
  aureusrep:
    build:
      context: ../aureuserp-master
      dockerfile: Dockerfile
    ports: ["8002:8000"]
    environment:
      DB_HOST: postgres-erp
      DB_DATABASE: erp_db
      DB_USERNAME: ${ERP_DB_USER}
      DB_PASSWORD: ${ERP_DB_PASS}
      APP_KEY: ${ERP_APP_KEY}
      QUEUE_CONNECTION: redis
      REDIS_HOST: redis
    networks: [mine_frontend, mine_backend, mine_cache]
```

### Agent Assignments
| Task | Agent | Source |
|------|-------|--------|
| Laravel API setup | `engineering-backend-architect.md` | agency-agents-main |
| Finance module config | `finance-bookkeeper-controller.md` | agency-agents-main |
| Invoice automation | `specialized-accounts-payable.md` | awesome-openclaw-agents |
| Data migration | gstack `data-migration.md` | gstack-main |
| Code refactor | RUFLO `refactoring-expert.md` | RUFLO |

---

## Service 3: Twenty CRM (Customer Relationships)

**Source**: `E:\Mine System\twenty-main\`  
**Domain**: CRM  
**Source of Truth For**: Contacts, companies, deals, pipelines, activities, notes  
**Ports**: 3000 (frontend), 3001 (NestJS API)  
**Tech Stack**: React/TypeScript (frontend), NestJS (backend), PostgreSQL  

### Key Capabilities
- **Custom Objects**: Define custom CRM objects beyond contacts/companies (e.g., Projects, Assets)
- **GraphQL API**: Twenty exposes a rich GraphQL API for all data operations
- **Webhooks**: Twenty sends webhooks on all record create/update/delete events
- **Metadata API**: Schema introspection allows dynamic integration
- **Activity Timeline**: Full activity history per contact/company/deal
- **Pipeline Management**: Kanban boards with custom stages
- **SDK**: `twenty-client-sdk` for programmatic access

### Twenty GraphQL API Usage
```typescript
// Gateway calls Twenty via GraphQL
import { ApolloClient } from '@apollo/client';

const GET_DEAL = gql`
  query GetDeal($id: ID!) {
    deal(id: $id) {
      id
      name
      amount { currencyCode amountMicros }
      stage
      contact { id name email }
      company { id name }
    }
  }
`;
```

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| InvenTree | → | Stock reservation | deal.won event |
| AureusERP | → | Create invoice | deal.won event |
| AureusERP | ← | Update deal payment | payment.received event |
| YetiForce | ↔ | Contact sync | contact.created/updated |
| Gateway | ↔ | CRM events | Webhooks + GraphQL |

---

## Service 4: Paperless-ngx (Document Hub)

**Source**: Docker image `ghcr.io/paperless-ngx/paperless-ngx`  
**Domain**: Document management  
**Source of Truth For**: All scanned/uploaded documents, OCR text, classification tags  
**Port**: 8010  
**Tech Stack**: Python/Django, PostgreSQL, Redis, Celery  

### Key Capabilities
- **OCR Engine**: Tesseract OCR on all uploaded documents (PDF, TIFF, JPEG)
- **Auto-classification**: Tags, document types, correspondents auto-assigned by rules
- **Full-text search**: Every document searchable by OCR content
- **REST API**: Full API for document upload, search, retrieval
- **Webhook support**: Sends events on document creation/update
- **Custom fields**: Extensible metadata

### pdfplumber Integration
```python
# services/gateway/services/pdf_processor.py
import pdfplumber

def extract_tables_from_invoice(pdf_path: str) -> list[dict]:
    """Extract structured data from invoice PDFs using pdfplumber"""
    with pdfplumber.open(pdf_path) as pdf:
        tables = []
        for page in pdf.pages:
            extracted = page.extract_table()
            if extracted:
                tables.append({
                    'page': page.page_number,
                    'data': extracted
                })
    return tables

# Used for: patent analysis via flowchart-ai, invoice data extraction,
# supplier document processing
```

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| HuixiangDou | → | OCR text for indexing | document.ocr.complete |
| AureusERP | ← | Invoice PDFs | invoice.created |
| Gateway | ↔ | Document events | Webhooks |
| Flowchart AI | → | Patent PDFs | manual trigger |

---

## Service 5: YetiForceCRM (Extended CRM & ERP Modules)

**Source**: `E:\Mine System\YetiForceCRM-developer\`  
**Domain**: Extended CRM, Service Management, HR  
**Source of Truth For**: Service contracts, helpdesk tickets, assets, HR data, advanced sales workflows  
**Port**: 8080  
**Tech Stack**: PHP 8.2, MySQL/PostgreSQL, Smarty templates  

### Key Capabilities (from modules/ directory)
- **Service Contracts**: Full contract lifecycle management
- **Helpdesk**: Incident management, SLA tracking
- **Assets**: Fixed asset register, depreciation
- **Financial Modules**: FInvoice, FBookkeeping, SCalculations
- **Inventory Modules**: IStorages, IGRN, IGDN (goods receipt/dispatch notes)
- **HR**: OSSEmployees, time control, CMRS
- **Advanced Permissions**: Multi-company, field-level permissions
- **Webservice API**: RESTful API via `webservice.php`

### YetiForce API Pattern
```php
// Authentication
POST /webservice.php
X-API-KEY: {api_key}
{
  "operation": "Login",
  "username": "api_user",
  "accessKey": "md5_hash"
}

// Create Contact
POST /webservice.php?module=Contacts&action=Save
{
  "firstname": "John",
  "lastname": "Doe",
  "email1": "john@example.com"
}
```

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| Twenty CRM | ↔ | Contact/company sync | contact.created/updated |
| AureusERP | ↔ | Invoice sync | invoice events |
| Gateway | ↔ | All YetiForce events | Webhooks |
| Zulip | ← | Support alerts | ticket.created |

---

## Service 6: HuixiangDou (AI Knowledge Assistant)

**Source**: `E:\Mine System\HuixiangDou-main\`  
**Domain**: AI knowledge base, document Q&A  
**Port**: 7860  
**Tech Stack**: Python, LLM backend (configurable), Gradio UI  

### Key Capabilities
- **Knowledge Base Indexing**: Index documents, product catalogs, manuals
- **Q&A Interface**: Natural language queries over indexed content
- **Multi-document reasoning**: "What is the reorder policy for BOLT-M6 and who is the preferred supplier?"
- **API integration**: REST API for programmatic queries from Gateway

### Integration Points
| System | Direction | Data | Trigger |
|--------|-----------|------|---------|
| Paperless | ← | Document text | document.ocr.complete |
| InvenTree | ← | Parts catalog | nightly sync |
| AureusERP | ← | Product data | nightly sync |
| Gateway | ↔ | AI query API | On-demand |

---

## Service 7: Excalidraw (Collaborative Whiteboarding)

**Source**: `E:\Mine System\excalidraw-master\`  
**Domain**: Visual collaboration  
**Port**: 3002  
**Tech Stack**: React, TypeScript  

### Key Capabilities
- **Real-time collaboration**: Multiple users drawing simultaneously
- **Architecture diagrams**: System design visualization
- **Integration diagrams**: Data flow visualization (auto-generated by Flowchart AI)
- **Embed support**: Can be embedded in Homarr dashboard

---

## Service 8: Flowchart AI (Visual Intelligence)

**Source**: `E:\Mine System\flowchart-ai-main\`  
**Domain**: AI-driven visual diagram generation  
**Port**: 8020  
**Tech Stack**: Python, GenFlowchart.py  

### Key Capabilities
- **Patent PDF Analysis**: Uses pdfplumber to extract patent flowcharts and tables
- **Process Map Generation**: Auto-generate business process flowcharts from structured data
- **Excalidraw Export**: Output diagrams directly importable into Excalidraw

### Usage Pattern
```python
# services/gateway/services/flowchart_service.py
# Trigger: User uploads patent PDF to Paperless
# Flow:
# 1. pdfplumber extracts tables from patent PDF
# 2. GenFlowchart.py processes extracted data
# 3. Output: Excalidraw JSON or PNG
# 4. Store result in Paperless as related document

import subprocess

def generate_flowchart_from_pdf(pdf_path: str) -> str:
    result = subprocess.run(
        ['python', 'GenFlowchart.py', pdf_path],
        capture_output=True, cwd='E:/Mine System/flowchart-ai-main'
    )
    return result.stdout.decode()
```

---

## Service 9: FastAPI Gateway (Integration Hub)

**Source**: `E:\Mine System\services\gateway\` (to be created in Phase 3)  
**Domain**: Integration, orchestration, event routing  
**Port**: 8000  
**Tech Stack**: Python 3.11, FastAPI 0.111, SQLAlchemy 2.0, Alembic, Redis  

See `MASTER_ARCHITECTURE.md` Section 8 for full Gateway architecture.

---

## Service 10: Homarr Dashboard (Unified UX Portal)

**Source**: Docker image `ghcr.io/ajnart/homarr`  
**Domain**: Unified operations dashboard  
**Port**: 8003  

### Dashboard Tiles Configuration
```json
// configs/homarr/config.json
{
  "tiles": [
    { "name": "Inventory", "url": "http://inventree:8001", "icon": "warehouse" },
    { "name": "ERP/Finance", "url": "http://aureusrep:8002", "icon": "calculator" },
    { "name": "CRM", "url": "http://twenty-front:3000", "icon": "users" },
    { "name": "Documents", "url": "http://paperless:8010", "icon": "folder" },
    { "name": "CRM Pro", "url": "http://yetiforce:8080", "icon": "briefcase" },
    { "name": "AI Assistant", "url": "http://huixiangdou:7860", "icon": "brain" },
    { "name": "Whiteboard", "url": "http://excalidraw:3002", "icon": "pencil" },
    { "name": "Charts", "url": "http://flowchart-ai:8020", "icon": "chart" },
    { "name": "Monitoring", "url": "http://signoz:9000", "icon": "activity" },
    { "name": "Chat", "url": "http://zulip:9300", "icon": "message" }
  ],
  "widgets": [
    { "type": "custom_api", "title": "DLQ Status", "url": "http://gateway:8000/api/admin/dlq/summary" },
    { "type": "custom_api", "title": "Low Stock Alert", "url": "http://gateway:8000/api/inventory/alerts" },
    { "type": "custom_api", "title": "Open POs", "url": "http://gateway:8000/api/erp/pos/open/count" },
    { "type": "custom_api", "title": "Active Deals", "url": "http://gateway:8000/api/crm/deals/active/count" }
  ]
}
```

---

## Agent Repositories: Capability Index

### agency-agents-main (`E:\Mine System\agency-agents-main\`)

Organized by domain. Key agents for this project:

| Agent File | Domain | Use In This Project |
|------------|--------|---------------------|
| `supply-chain/inventory-forecaster/` | Inventory | Demand forecasting for InvenTree |
| `supply-chain/vendor-evaluator/` | Procurement | AureusERP supplier scoring |
| `supply-chain/route-optimizer/` | Logistics | Warehouse routing optimization |
| `finance/invoice-tracker/` | Finance | AureusERP overdue invoice follow-up |
| `finance/financial-forecaster/` | Finance | Cash flow forecast dashboard |
| `finance/fraud-detector/` | Security | Payment anomaly detection |
| `business/erp-admin/` | Operations | Automated ERP admin tasks |
| `devops/incident-responder/` | Operations | SigNoz alert auto-remediation |
| `devops/deploy-guardian/` | DevOps | Deployment safety checks |
| `devops/infra-monitor/` | DevOps | Infrastructure health monitoring |
| `testing/api-tester/` | QA | Automated API endpoint testing |
| `testing/qa-tester/` | QA | Regression testing automation |
| `data/etl-pipeline/` | Integration | Gateway data sync orchestration |
| `data/anomaly-detector/` | Monitoring | Data quality anomaly detection |
| `engineering/code-reviewer/` | Development | Code review automation |
| `strategy/coordination/` | Management | Multi-agent orchestration |

### awesome-openclaw-agents-main (`E:\Mine System\awesome-openclaw-agents-main\`)

| Agent File | Domain | Use In This Project |
|------------|--------|---------------------|
| `agents/supply-chain/inventory-tracker/` | Inventory | Real-time stock tracking |
| `agents/finance/accounts-payable/` | Finance | AP automation |
| `agents/business/erp-admin/` | ERP | ERP workflow automation |
| `agents/security/security-hardener/` | Security | Security baseline enforcement |
| `agents/devops/cost-optimizer/` | Infrastructure | Cloud cost optimization |
| `skills/excalidraw-architecture/` | Architecture | Auto-generate architecture diagrams |
| `integrations/opencode/` | Development | OpenCode agent configs |

---

*Owner: All Team Leads*  
*Review: Update when service versions change or new services added*
