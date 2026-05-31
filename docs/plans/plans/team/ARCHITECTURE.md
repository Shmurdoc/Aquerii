# Clean Architecture Reference

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Homarr   │  │  Zulip   │  │Excalidraw│  │  Web Browser │   │
│  │Dashboard│  │  ChatOps │  │ Whiteboard│  │    (Apps)    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
└───────┼─────────────┼─────────────┼──────────────┼─────────────┘
        │             │             │              │
        ▼             ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
│                   FastAPI API Gateway                            │
│         ┌─────────────┬─────────────┬──────────────┐            │
│         │ Auth Service│Webhooks     │ Service     │            │
│         │ (RBAC)      │ Event Queue  │ Endpoints   │            │
│         └──────┬──────┴──────┬──────┴──────┬───────┘            │
└────────────────┼──────────────┼──────────────┼────────────────────┘
                 │              │             │
                 ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   ERPNext   │  │Twenty CRM   │  │  InvenTree  │              │
│  │  (Finance)  │  │ (Customer) │  │ (Inventory)│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │Paperless-ngx │  │MS Agent     │  │  SigNoz     │              │
│  │ (Documents) │  │ Framework   │  │ (Monitoring)│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────���───────────────────────────────────────────────────────────┐
│                       DATA LAYER                                   │
│  ┌──────────────────────┐  ┌───────────────────────────┐       │
│  │   PostgreSQL         │  │   File Storage            │       │
│  │  - inventree_db     │  │  - /data/inventree        │       │
│  │  - erpnext_db       │  │  - /data/documents       │       │
│  │  - twenty_db       │  │  - /data/media         │       │
│  └──────────────────────┘  └───────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Clean Architecture Boundaries

### 1. User Interface (Homarr, Zulip, Excalidraw)
- **Purpose**: User interaction points
- **Owned by**: Team Delta

### 2. API Gateway (FastAPI)
- **Purpose**: Single entry point, auth, routing
- **Owned by**: Team Gamma
- **Location**: `services/gateway/`

### 3. Business Logic (ERPNext, Twenty, InvenTree)
- **Purpose**: Core functionality
- **Owned by**: Team Beta
- **Location**: `services/apps/`

### 4. Data Layer (PostgreSQL, File Storage)
- **Purpose**: Persistence
- **Owned by**: Team Alpha

---

## Service Communication

| Service | Protocol | Port | Purpose |
|---------|----------|------|---------|
| Caddy | HTTPS | 443 | Reverse proxy |
| Homarr | HTTP | 3000 | Dashboard |
| ERPNext | HTTP | 8000 | ERP |
| Twenty | HTTP | 3000 | CRM |
| InvenTree | HTTP | 8000 | Inventory |
| Paperless | HTTP | 8000 | Documents |
| FastAPI | HTTP | 8000 | Gateway |
| PostgreSQL | TCP | 5432 | Database |
| SigNoz | HTTP | 3300 | Monitoring |

---

## Data Flow Patterns

### CRUD Operations
```
User → Gateway → Service → Database
```

### Event-Driven
```
InvenTree (event) → Webhook → Gateway → ERPNext (action)
```

### Query
```
User → Homarr → Gateway → Service → Database → Response
```

---

## Technology Stack

| Layer | Technology |
|-------|-------------|
| Proxy | Caddy |
| Gateway | FastAPI |
| Auth | JWT + RBAC |
| Database | PostgreSQL |
| Storage | Local/Cloud |
| Container | Docker, Docker Compose |
| Monitoring | SigNoz |
| Chat | Zulip |
| AI | HuixiangDou, MS Agent |
| Documents | Paperless-ngx + Docling |

---

*Created: 2026-05-03* | *Status: Planning Phase Only*