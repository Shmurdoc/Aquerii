# FlowOS — Source Repository Mapping

**Version**: 1.0  
**Purpose**: Documents exactly what each source repository in `E:\Mine System\` contributes to FlowOS — what patterns are adapted, what code is ported, what is used as reference only.

> **Legend**:  
> - **Port**: Code adapted and integrated directly  
> - **Pattern**: Architecture/design pattern studied and reimplemented  
> - **Reference**: Consulted for domain knowledge, not code-reused  

---

## 1. `aureuserp-master/` — Laravel + Filament Foundation

**Contributes to**: `services/api/` (Laravel backend), `services/super-admin/` (Filament panel)

| What | Type | Used In |
|------|------|---------|
| Laravel 11 + PHP 8.3 application structure | Pattern | Entire `services/api/` layout |
| Filament 3 panel setup + resource definitions | Port | `services/super-admin/` |
| Multi-tenant plugin architecture | Pattern | Workspace isolation design |
| Filament table + form component patterns | Port | Super Admin workspace/user resources |
| Laravel Horizon queue configuration | Port | `services/api/config/horizon.php` |
| Spatie Permission package integration | Port | RBAC middleware + role seeder |
| `webkul/accounts/` billing module | Pattern | Subscription state machine design |
| `webkul/projects/` board/task structure | Reference | Board + item data model decisions |
| `webkul/analytics/` ClickHouse event schema | Pattern | `analytics_events` ClickHouse table design |
| Docker + `octane` (Swoole) configuration | Port | `services/api/Dockerfile` |
| `.github/workflows/` CI patterns | Pattern | FlowOS CI pipeline structure |

**Specific files referenced**:
- `aureuserp-master/plugins/webkul/accounts/src/Models/Subscription.php` → state machine for subscription lifecycle
- `aureuserp-master/plugins/webkul/projects/src/Models/Task.php` → item model field structure
- `aureuserp-master/app/Providers/AppServiceProvider.php` → service provider pattern

---

## 2. `twenty-main/` — CRM Engine + BlockNote Editor + UI Patterns

**Contributes to**: `apps/web/` (React frontend), `services/api/` (CRM API design)

| What | Type | Used In |
|------|------|---------|
| BlockNote editor integration (React) | Port | `apps/web/src/components/editor/` |
| BlockNote AI extension (`/ai` slash command) | Port | Document AI writing assistant UI |
| CRM data model: contacts, companies, deals | Pattern | `crm_contacts`, `crm_companies`, `crm_deals` tables |
| Deal pipeline Kanban (drag-and-drop) | Pattern | CRM pipeline view component |
| Activity timeline component | Port (adapted) | CRM deal timeline + item activity feed |
| Server-Sent Events (SSE) pattern | Reference | Replaced with Socket.IO in FlowOS |
| Workspace/member concept | Pattern | Workspace + workspace_members model |
| React component library (UI kit) | Reference | FlowOS uses shadcn/ui, inspired by Twenty's approach |
| `@ui-one/react-hotkeys` keyboard shortcut pattern | Pattern | Global keyboard shortcuts system |
| Metadata-driven field system | Reference | Replaced with `column_values JSONB` approach |
| GraphQL API patterns | Reference | FlowOS uses REST + WS, not GraphQL |

**Specific files referenced**:
- `twenty-main/packages/twenty-front/src/modules/activities/timeline/` → activity timeline component
- `twenty-main/packages/twenty-front/src/modules/object-record/` → record form patterns
- `twenty-main/packages/twenty-server/src/modules/messaging/` → email activity integration pattern

---

## 3. `excalidraw-master/` — Canvas View

**Contributes to**: `apps/web/src/views/canvas/`

| What | Type | Used In |
|------|------|---------|
| Excalidraw React component | Port | Canvas View (6th board view) |
| Excalidraw multiplayer WebSocket pattern | Pattern | Canvas collab via existing Y.js/Socket.IO |
| Excalidraw scene JSON serialization | Port | `items.canvas_data JSONB` storage format |
| Excalidraw → PNG/SVG export | Port | Canvas export action |
| Custom element types (board item cards on canvas) | Pattern | Linked item nodes on canvas |

**Specific files referenced**:
- `excalidraw-master/packages/excalidraw/components/App.tsx` → main component integration
- `excalidraw-master/packages/excalidraw/data/` → scene serialization/deserialization
- `excalidraw-master/excalidraw-app/collab/` → multiplayer architecture (adapted to Socket.IO)

---

## 4. `HuixiangDou-main/` — RAG / Knowledge Base AI

**Contributes to**: `services/ai/` (Python FastAPI AI service)

| What | Type | Used In |
|------|------|---------|
| RAG pipeline architecture (chunk → embed → retrieve → generate) | Pattern | `services/ai/rag/pipeline.py` |
| ChromaDB integration for vector storage | Port (adapted) | Per-workspace ChromaDB collections |
| Document chunking strategy | Pattern | `services/ai/rag/chunker.py` |
| Query preprocessing + intent detection | Pattern | Knowledge base Q&A query handler |
| Hybrid retrieval (dense + sparse) | Reference | FlowOS Phase 2: simple dense-only initially |
| Rejection handling ("I don't know" responses) | Pattern | RAG query response handler |
| Multi-document indexing pipeline | Pattern | Background job: index all workspace docs |

**Specific files referenced**:
- `HuixiangDou-main/huixiangdou/service/retriever.py` → retrieval pipeline design
- `HuixiangDou-main/huixiangdou/service/llm_server_hybrid.py` → dual-model routing pattern
- `HuixiangDou-main/docs/add_your_data_source.md` → data source adapter interface

---

## 5. `agency-agents-main/` — AI Agent Personas

**Contributes to**: `services/ai/agents/`

| What | Type | Used In |
|------|------|---------|
| Agent persona definition structure | Pattern | Project Manager, Sprint Coach, Sales Coach agents |
| Multi-step agent execution loop | Pattern | `services/ai/agents/base_agent.py` |
| Tool-calling pattern (agent uses internal APIs) | Pattern | Agent reads boards/CRM data via internal API |
| Agent memory (context window management) | Pattern | Conversation history trimming strategy |
| Agent output formatting (structured markdown) | Pattern | Retrospective + status report output |

**Specific files referenced**:
- `agency-agents-main/agency_swarm/agents/` → agent class structure
- `agency-agents-main/agency_swarm/tools/` → tool definition pattern (adapted to FlowOS internal API calls)

---

## 6. `awesome-openclaw-agents-main/` — Agent Catalog + Prompts

**Contributes to**: `services/ai/agents/prompts/`

| What | Type | Used In |
|------|------|---------|
| Pre-written system prompts for business agents | Reference | Project Manager, Sales Coach prompt library |
| Agent specialization patterns | Reference | Domain-specific agent persona tuning |
| Prompt engineering best practices | Pattern | All FlowOS prompt templates |

---

## 7. `InvenTree-master/` — Plugin System + Event Architecture

**Contributes to**: `services/api/` (plugin hooks) — *reference architecture only for FlowOS*

| What | Type | Used In |
|------|------|---------|
| Plugin hook system (EventMixin pattern) | Pattern | Automation trigger registration system |
| Event-driven architecture (publish on model change) | Pattern | Laravel model observer → Redis pub/sub |
| Background task queue pattern | Reference | Horizon job design |
| API versioning strategy | Reference | `/api/v1/` prefix strategy |

**Note**: InvenTree code is NOT ported into FlowOS. It is studied as a reference for plugin architecture and event systems.

---

## 8. `flowchart-ai/` — Flowchart Generation

**Contributes to**: `services/ai/flowchart/`

| What | Type | Used In |
|------|------|---------|
| Text → flowchart node extraction | Port | `services/ai/flowchart/generator.py` |
| Mermaid diagram output format | Port | Flowchart stored as Mermaid string, rendered in docs |
| Excalidraw JSON output format | Port | Alternative output: importable to Canvas view |
| PDF → flowchart pipeline | Port | Full pipeline: upload → extract → generate → embed |

**Specific files referenced**:
- `flowchart-ai/GenFlowchart.py` → core generation logic (adapted for FastAPI endpoint)
- `flowchart-ai/prompt_templates/` → flowchart extraction prompts

---

## 9. `Kojit/` + `multiboard-master/` — Dev Plan + Multi-Board Patterns

**Contributes to**: `apps/web/src/products/dev/`

| What | Type | Used In |
|------|------|---------|
| Sprint board UI patterns | Pattern | Dev Plan sprint board view |
| GitHub commit → task link pattern | Pattern | GitHub integration (commit message parsing) |
| Multi-board navigation (sidebar) | Pattern | FlowOS workspace sidebar with multiple boards |
| Board filter/sort persistence | Pattern | Per-view filter state storage in localStorage |
| Velocity chart component | Pattern | Sprint velocity tracking in Dev Plan |

---

## 10. Repositories NOT used

| Repository | Reason Not Used |
|-----------|----------------|
| Any direct ERPNext/Odoo code | AureusERP (Laravel) chosen instead |
| Kafka or RabbitMQ configs | Redis pub/sub sufficient; no Kafka in FlowOS |
| Any Next.js patterns | FlowOS uses React SPA (Vite), not Next.js |
| Any GraphQL schemas | FlowOS uses REST API, not GraphQL |

---

## Dependency Map (repo → FlowOS service)

```
aureuserp-master    →  services/api/          (Laravel patterns)
aureuserp-master    →  services/super-admin/  (Filament patterns)
twenty-main         →  apps/web/              (BlockNote, CRM UI, activity timeline)
twenty-main         →  services/api/          (CRM data model)
excalidraw-master   →  apps/web/              (Canvas View)
HuixiangDou-main    →  services/ai/           (RAG pipeline)
agency-agents-main  →  services/ai/           (agent executor)
awesome-openclaw    →  services/ai/           (prompt library)
flowchart-ai        →  services/ai/           (flowchart generation)
InvenTree-master    →  services/api/          (plugin/event pattern reference)
Kojit + multiboard  →  apps/web/              (Dev Plan UI patterns)
```

---

*Owner: Tech Lead*  
*Cross-reference: MASTER_PLAN.md §6 (repo mapping), ARCHITECTURE.md §1 (service layout)*
