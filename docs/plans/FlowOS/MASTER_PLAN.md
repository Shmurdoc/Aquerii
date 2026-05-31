# FlowOS — Master Plan

**Product**: FlowOS  
**Category**: Work Operating System (Work OS) — SaaS, B2B  
**Comparable to**: Monday.com, ClickUp, Notion, Asana, Linear  
**Owner**: [You — Super Admin / Platform Owner]  
**Version**: 1.0 PRODUCTION-GRADE PLAN  
**Date**: 2026-05-05

---

## Vision Statement

FlowOS is a unified Work Operating System for company owners and their teams — a single platform where projects are planned, work is executed, customers are managed, documents are written, and AI handles the repetitive layer. It sells on subscription tiers that scale by team size, storage, and automation volume. The platform owner (you) has absolute visibility and control over every tenant, transaction, user, and system metric.

---

## What FlowOS Is

FlowOS is **five products in one subscription**:

| Product | Equivalent | Core Value |
|---------|-----------|------------|
| **FlowOS Boards** | Monday WorkOS | Visual task and project management |
| **FlowOS CRM** | Monday CRM | Sales pipeline, deals, contacts |
| **FlowOS Projects** | Monday Projects / ClickUp | Roadmaps, resources, milestones |
| **FlowOS Dev** | Linear / Monday Dev | Agile sprints, GitHub integration |
| **FlowOS Docs** | Notion Docs | Block-based collaborative documents |

All five products live in one workspace. No switching apps. No separate subscriptions.

---

## Core Differentiators vs. Monday.com

| Feature | Monday.com | FlowOS |
|---------|-----------|--------|
| AI provider | OpenAI only | Gemini + Claude (dual AI) |
| Real-time canvas | None | Excalidraw-powered canvas built in |
| GitHub-native dev view | Limited | Full commit→board sync (Kojit-style) |
| Document editor | Basic | Full BlockNote block editor |
| White-labeling | Enterprise only | Pro plan and above |
| Payment (ZA market) | No PayFast | Stripe + PayFast |
| Owner super-admin | None | Full platform God-mode panel |
| Templates | 200+ | 300+ (including AI-generated) |
| Offline support | No | PWA with offline queue |

---

## Business Model

### Revenue Streams
1. **Subscription plans** — monthly/annual per workspace (company)
2. **Storage add-ons** — extra storage blocks (5GB, 20GB, 100GB)
3. **Automation add-ons** — extra automation packs
4. **AI credits add-ons** — extra Gemini/Claude API calls beyond plan limit
5. **Guest seat add-ons** — extra external collaborators
6. **White-label add-on** — custom domain + branding
7. **Enterprise custom contracts** — annual invoice billing

### Pricing Plans (Full detail in PRICING_AND_BILLING.md)

| Plan | Price/seat/month | Storage/workspace | Automations/month | AI credits/month |
|------|-----------------|-----------------|------------------|-----------------|
| Free | $0 | 5 GB | 50 | 100 |
| Basic | $9 | 20 GB | 250 | 500 |
| Standard | $14 | 50 GB | 2,500 | 2,000 |
| Pro | $22 | 200 GB | 25,000 | 10,000 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

---

## Source Repositories Utilized

| Repo | Role in FlowOS |
|------|---------------|
| `twenty-main/` | Foundation: CRM engine, workflow builder, block editor, SSE real-time, dashboards, UI library |
| `aureuserp-master/` | Foundation: Laravel plugin architecture, billing, projects, analytics, HR modules |
| `YetiForceCRM-developer/` | Workflow automation engine, notification system, multi-company logic |
| `excalidraw-master/` | Real-time collaborative canvas (whiteboard view) |
| `InvenTree-master/` | Table view components, plugin system patterns, report generation |
| `HuixiangDou-main/` | AI assistant backend (RAG, knowledge base, message queue) |
| `flowchart-ai-main/` | AI-powered diagram generation from text/docs |
| `pdfplumber-stable/` | PDF import and table extraction for document ingestion |
| `agency-agents-main/` | AI agent personas for project, sales, engineering, support roles |
| `awesome-openclaw-agents-main/` | Additional AI agent definitions for automation workflows |
| `Gemini-Kanban-Pro` | Kanban + Gantt frontend with Gemini AI integration |
| `Kojit` | GitHub-native project intelligence, real-time cursors, commit→roadmap |
| `Multiboard` | GitHub↔Kanban sync, WIP limits, automated board updates |

---

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + CSS variables (theme engine)
- **State**: Recoil (Twenty's state system) + Zustand for local UI state
- **Real-time**: Socket.IO + SSE (Server-Sent Events)
- **Editor**: BlockNote (block-based doc editor, Notion-like)
- **Canvas**: Excalidraw (collaborative whiteboard)
- **Charts**: Recharts + D3.js (Gantt, timeline, burndown)
- **PWA**: Vite PWA plugin + service worker
- **Mobile**: React Native (Expo) — Phase 4

### Backend
- **API Server**: Laravel 11 (PHP 8.3) — primary REST + GraphQL
- **Real-time Server**: Node.js + Socket.IO (WebSocket gateway)
- **Queue**: Laravel Horizon + Redis
- **Search**: Meilisearch (fast full-text across boards, docs, tasks)
- **AI Orchestration**: Python FastAPI microservice (Gemini + Claude calls)
- **File Storage**: MinIO (S3-compatible) or AWS S3 in production
- **Email**: Laravel Mail + Mailgun / Amazon SES

### Data
- **Primary DB**: PostgreSQL 15 (multi-tenant, row-level security)
- **Cache**: Redis 7
- **Search Index**: Meilisearch
- **Analytics**: ClickHouse (event tracking, usage metrics)
- **File Storage**: MinIO

### Infrastructure
- **Containers**: Docker + Docker Compose (dev/staging) → Kubernetes (production)
- **Reverse Proxy**: Caddy (TLS, routing)
- **Secrets**: HashiCorp Vault
- **Observability**: SigNoz (traces, metrics, logs)
- **CI/CD**: GitHub Actions
- **CDN**: Cloudflare

### Payments
- **Stripe**: Primary (international, card, recurring)
- **PayFast**: ZA market (EFT, Instant EFT, card, SnapScan)

### AI
- **Google Gemini 1.5 Pro/Flash**: Real-time task suggestions, subtask generation, board summaries, workflow recommendations
- **Anthropic Claude 3.5 Sonnet**: Long-context document analysis, complex automation generation, CRM intelligence
- **RAG layer**: HuixiangDou-backed knowledge base per workspace

---

## Platform Structure (Microservices)

```
FlowOS Platform
├── flowos-web/              # React frontend (SPA + PWA)
├── flowos-mobile/           # React Native (Expo)
├── services/
│   ├── api/                 # Laravel 11 — primary API (REST + GraphQL)
│   ├── realtime/            # Node.js + Socket.IO — WebSocket server
│   ├── ai/                  # Python FastAPI — Gemini + Claude orchestration
│   ├── worker/              # Laravel Horizon — queue workers
│   ├── search/              # Meilisearch — full-text search
│   ├── storage/             # MinIO — file/blob storage
│   ├── notification/        # Notification dispatch (push, email, in-app)
│   ├── billing/             # Stripe + PayFast webhook handler
│   ├── analytics/           # ClickHouse writer + query API
│   └── gateway/             # Caddy reverse proxy
├── superadmin/              # Laravel + Filament — platform owner panel
└── infra/                   # Docker Compose, K8s manifests, Vault, SigNoz
```

---

## Index of All FlowOS Plan Documents

```
E:\Mine System\FlowOS\
├── MASTER_PLAN.md           # This file — overview + navigation
├── ARCHITECTURE.md          # Microservices, data flow, network topology
├── FEATURES.md              # Complete feature specification (all 5 products)
├── PRICING_AND_BILLING.md   # Plans, storage tiers, add-ons, Stripe+PayFast
├── DATABASE_SCHEMA.md       # Multi-tenant schema, RLS, all core tables
├── AI_STRATEGY.md           # Gemini + Claude integration, agents, RAG
├── SUPER_ADMIN.md           # Platform owner God-mode panel specification
├── QA_STRATEGY.md           # Brutal QA process, test pyramid, chaos tests
├── PHASE_PLAN.md            # 5-phase execution roadmap (Weeks 1-32)
├── REPO_SOURCES.md          # How each source repo is used in FlowOS
├── API_CONTRACTS.md         # All API endpoints, request/response schemas
├── SECURITY.md              # Auth, RBAC, tenant isolation, OWASP
├── REALTIME.md              # WebSocket architecture, presence, live cursors
└── NOTIFICATIONS.md         # Push, email, in-app, Slack/Zulip webhooks
```

---

*Owner: Platform Owner (Super Admin)*  
*Status: PLANNING — Phase 0*
