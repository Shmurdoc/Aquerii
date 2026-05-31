# Aquerii — Multi-Industry Contractor Platform

**Target Market:** Small mining contractors in Phalaborwa, South Africa
**Price Point:** R500/month (based on add-ons)
**Timeline:** Full product in 2 months
**Last Updated:** 2026-05-30

---

## Executive Summary

Aquerii is a multi-tenant SaaS platform designed for small contractors in the mining industry of Phalaborwa. Unlike expensive alternatives (Monday.com R150/user/mo, ClickUp R120/user/mo, Sage R500+/mo, ZAR250/user/mo), Aquerii provides enterprise-grade features at an affordable price point starting from R0 (free tier) to R999/month (enterprise).

### Value Proposition

| Competitor | Price | Aquerii | Savings |
|------------|-------|---------|---------|
| Monday.com | R150/user/mo (10 users = R1,500/mo) | R499/mo (15 users) | R1,001/mo |
| ClickUp | R120/user/mo (10 users = R1,200/mo) | R499/mo (15 users) | R701/mo |
| Sage | R500+/mo minimum | R299/mo (5 users) | R201+/mo |
| Zoho | R250/user/mo (10 users = R2,500/mo) | R499/mo (15 users) | R2,001/mo |

---

## Business Model

### Pricing Tiers

| Tier | Price | Users | Jobs | Features |
|------|-------|-------|------|----------|
| **Free** | R0 | 1 | 5/month | Basic invoicing, job cards |
| **Starter** | R299/mo | 5 | Unlimited | Checklists, time tracking, team assignment |
| **Professional** | R499/mo | 15 | Unlimited | Custom fields, reports, client portal |
| **Enterprise** | R999/mo | Unlimited | Unlimited | API, white-label, priority support |

### Add-Ons

| Add-On | Price | Description |
|--------|-------|-------------|
| WhatsApp Notifications | R99/mo | Send job updates via WhatsApp |
| Advanced Reports | R149/mo | Custom dashboards, export, scheduling |
| Multi-Location | R199/mo | Manage multiple job sites |
| API Access | R199/mo | Integrate with other systems |

---

## Target Industries

### Primary Industries

| Industry | Description | Key Needs |
|----------|-------------|-----------|
| **Tire Fitting** | Truck tire services, puncture repair | Tire inspection, balance check, alignment |
| **Truck Maintenance** | Vehicle service, repair, inspection | Pre-trip inspection, oil change, brake check |
| **Electrical** | Installation, repair, compliance | Safety test, circuit check, COC |
| **Plumbing** | Installation, repair, emergency | Pressure test, leak check, COC |

### Secondary Industries

| Industry | Description | Key Needs |
|----------|-------------|-----------|
| **General Contractor** | Various maintenance tasks | Custom job types, custom checklists |
| **HVAC** | Heating, ventilation, air conditioning | System inspection, refrigerant check |
| **Welding** | Structural, pipeline, repair | Weld inspection, NDT testing |
| **Painting** | Surface prep, coating application | Surface inspection, coating thickness |

---

## Core Features

### 1. Job Card System (P0)

**Purpose:** Every job starts with a job card. This is the core of the contractor business.

**Features:**
- Create job card in 3 taps (select type → assign team → start)
- Job status workflow: New → In Progress → Completed → Invoiced
- GPS location capture (where work happened)
- Photo capture (document work done)
- Voice notes (hands-free documentation)
- Digital signature (client sign-off)
- Time tracking (start/stop timer per job)

**User Flow:**
1. Contractor opens app → Taps "New Job"
2. Selects job type (e.g., "Tire Change")
3. Enters basic info (client, location, description)
4. Assigns team member
5. Starts timer
6. Takes photos, adds notes
7. Completes job → Gets client signature
8. Sends invoice → Gets paid

### 2. Checklists (P0)

**Purpose:** Quality and safety verification for every job.

**Features:**
- Industry-specific checklist templates
- Custom checklists per job type
- Photo evidence for each checklist item
- Digital sign-off on completion
- Compliance tracking

**Industry Checklists:**

| Industry | Checklist Items |
|----------|-----------------|
| **Tire Fitting** | Tire inspection, balance check, alignment, torque check, valve check |
| **Truck Maintenance** | Pre-trip inspection, fluid levels, brake check, tire pressure, lights |
| **Electrical** | Safety isolation, circuit test, earth continuity, insulation resistance, COC |
| **Plumbing** | Pressure test, leak check, flow test, COC, waste disposal |

### 3. Team Assignment (P0)

**Purpose:** Who does what on each job.

**Features:**
- Assign team members to jobs
- Track who's doing what
- Workload balancing
- Skill-based assignment
- Availability calendar

### 4. Time Tracking (P0)

**Purpose:** Bill by the hour, track productivity.

**Features:**
- Start/stop timer per job
- Manual time entry
- Break tracking
- Overtime calculation
- Time reports by team member

### 5. Invoicing (P0)

**Purpose:** Get paid faster.

**Features:**
- Invoice from job card (one-click)
- ZAR currency support
- VAT calculations (15%)
- Payment tracking (paid/unpaid/partial)
- Quote builder (before job)
- Client approval workflow
- PDF generation

### 6. Photo Capture (P0)

**Purpose:** Document work done.

**Features:**
- Camera integration
- Photo annotations
- Before/after comparison
- GPS tagging
- Automatic upload when online

### 7. Industry Templates (P0)

**Purpose:** Pre-built for each industry.

**Template Structure:**
```json
{
  "name": "Tire Fitting",
  "job_types": [
    {
      "name": "Tire Change",
      "checklist": ["Tire inspection", "Balance check", "Torque check"],
      "custom_fields": ["Tire size", "Brand", "Tread depth", "Axle position"]
    }
  ],
  "invoice_template": "tire_fitting_invoice",
  "custom_fields": ["Tire size", "Brand", "Tread depth", "Axle position"]
}
```

### 8. Offline Mode (P0)

**Purpose:** Works without Wi-Fi at mine sites.

**Architecture:**
- Service Worker for asset caching
- IndexedDB for data storage
- Background sync when online
- Conflict resolution for concurrent edits

**Features:**
- Create job cards offline
- Take photos offline
- Track time offline
- Create invoices offline
- Sync when online

### 9. Mobile Responsive (P0)

**Purpose:** Works on phones for field workers.

**Features:**
- Mobile-first design
- Touch-friendly UI
- Responsive breakpoints (375px, 768px, 1024px, 1920px)
- Sidebar collapse on mobile
- Bottom navigation for key actions

### 10. Client Portal (P1)

**Purpose:** Clients see progress.

**Features:**
- Client login
- View job progress
- View invoices
- Approve quotes
- Leave feedback
- Download documents

---

## Industry Templates (Database Seed)

### Tire Fitting Template

```json
{
  "id": "tire-fitting",
  "name": "Tire Fitting",
  "description": "Complete tire services for trucks and heavy vehicles",
  "job_types": [
    {
      "name": "Tire Change",
      "description": "Replace worn or damaged tires",
      "checklist": [
        "Inspect current tire condition",
        "Check wheel nuts and studs",
        "Mount new tire",
        "Balance tire",
        "Torque wheel nuts to spec",
        "Check tire pressure",
        "Road test"
      ],
      "custom_fields": [
        {"name": "Tire Size", "type": "select", "options": ["295/80R22.5", "315/80R22.5", "385/65R22.5", "12.00R20"]},
        {"name": "Tire Brand", "type": "text", "placeholder": "e.g., Bridgestone, Michelin"},
        {"name": "Tread Depth", "type": "number", "unit": "mm"},
        {"name": "Axle Position", "type": "select", "options": ["Front Left", "Front Right", "Rear Left", "Rear Right", "Drive Axle", "Trailer"]}
      ],
      "estimated_hours": 1.5
    },
    {
      "name": "Puncture Repair",
      "description": "Repair punctured tire",
      "checklist": [
        "Remove tire from wheel",
        "Inspect damage",
        "Apply patch",
        "Test repair",
        "Rebalance tire",
        "Refit and torque"
      ],
      "custom_fields": [
        {"name": "Puncture Location", "type": "select", "options": ["Tread", "Sidewall", "Shoulder"]},
        {"name": "Patch Type", "type": "select", "options": ["Mushroom", "Plug", "Patch"]}
      ],
      "estimated_hours": 0.75
    },
    {
      "name": "Wheel Alignment",
      "description": "Check and adjust wheel alignment",
      "checklist": [
        "Mount vehicle on alignment rack",
        "Measure current alignment",
        "Adjust camber",
        "Adjust caster",
        "Adjust toe",
        "Road test"
      ],
      "custom_fields": [
        {"name": "Front Camber", "type": "number", "unit": "degrees"},
        {"name": "Front Toe", "type": "number", "unit": "mm"},
        {"name": "Rear Camber", "type": "number", "unit": "degrees"}
      ],
      "estimated_hours": 1
    }
  ],
  "custom_fields": [
    {"name": "Vehicle Registration", "type": "text", "required": true},
    {"name": "Vehicle Make", "type": "text"},
    {"name": "Fleet Number", "type": "text"}
  ]
}
```

### Truck Maintenance Template

```json
{
  "id": "truck-maintenance",
  "name": "Truck Maintenance",
  "description": "Vehicle service, repair, and inspection",
  "job_types": [
    {
      "name": "Full Service",
      "description": "Complete vehicle service",
      "checklist": [
        "Engine oil change",
        "Oil filter replacement",
        "Air filter inspection",
        "Fuel filter check",
        "Brake inspection",
        "Tire pressure check",
        "Fluid levels check",
        "Belt inspection",
        "Battery check",
        "Road test"
      ],
      "custom_fields": [
        {"name": "Odometer Reading", "type": "number", "unit": "km"},
        {"name": "Oil Grade", "type": "select", "options": ["10W-40", "15W-40", "20W-50", "5W-30"]},
        {"name": "Oil Quantity", "type": "number", "unit": "liters"}
      ],
      "estimated_hours": 2
    },
    {
      "name": "Brake Service",
      "description": "Brake inspection and repair",
      "checklist": [
        "Inspect brake pads",
        "Inspect brake discs",
        "Check brake fluid",
        "Test brake performance",
        "Road test"
      ],
      "custom_fields": [
        {"name": "Front Pad Thickness", "type": "number", "unit": "mm"},
        {"name": "Rear Pad Thickness", "type": "number", "unit": "mm"},
        {"name": "Brake Fluid Level", "type": "select", "options": ["Full", "Low", "Critical"]}
      ],
      "estimated_hours": 1.5
    },
    {
      "name": "Breakdown Recovery",
      "description": "Emergency breakdown assistance",
      "checklist": [
        "Assess situation",
        "Safety setup (reflectors, cones)",
        "Diagnose fault",
        "Temporary repair or tow",
        "Client notification"
      ],
      "custom_fields": [
        {"name": "Location", "type": "text", "required": true},
        {"name": "Fault Description", "type": "textarea"},
        {"name": "Recovery Method", "type": "select", "options": ["Roadside Repair", "Tow to Workshop", "Mobile Workshop"]}
      ],
      "estimated_hours": 2
    }
  ],
  "custom_fields": [
    {"name": "Vehicle Registration", "type": "text", "required": true},
    {"name": "Vehicle Make/Model", "type": "text"},
    {"name": "Fleet Number", "type": "text"},
    {"name": "Odometer Reading", "type": "number", "unit": "km"}
  ]
}
```

### Electrical Template

```json
{
  "id": "electrical",
  "name": "Electrical Services",
  "description": "Electrical installation, repair, and compliance",
  "job_types": [
    {
      "name": "Installation",
      "description": "New electrical installation",
      "checklist": [
        "Safety isolation verified",
        "Circuit design approved",
        "Cable installation",
        "Connection and termination",
        "Insulation resistance test",
        "Earth continuity test",
        "Circuit labeling",
        "COC issued"
      ],
      "custom_fields": [
        {"name": "Circuit Number", "type": "text"},
        {"name": "Cable Size", "type": "select", "options": ["1.5mm²", "2.5mm²", "4mm²", "6mm²", "10mm²", "16mm²"]},
        {"name": "Breaker Rating", "type": "number", "unit": "A"}
      ],
      "estimated_hours": 4
    },
    {
      "name": "Repair",
      "description": "Electrical fault repair",
      "checklist": [
        "Safety isolation",
        "Fault diagnosis",
        "Repair execution",
        "Testing",
        "Certificate issued"
      ],
      "custom_fields": [
        {"name": "Fault Description", "type": "textarea"},
        {"name": "Fault Location", "type": "text"}
      ],
      "estimated_hours": 2
    },
    {
      "name": "Compliance Inspection",
      "description": "Annual electrical compliance check",
      "checklist": [
        "Visual inspection",
        "Earth continuity test",
        "Insulation resistance test",
        "RCD trip test",
        "Circuit identification",
        "COC issued"
      ],
      "custom_fields": [
        {"name": "COC Number", "type": "text"},
        {"name": "Valid Until", "type": "date"},
        {"name": "Non-Compliances Found", "type": "number"}
      ],
      "estimated_hours": 2
    }
  ],
  "custom_fields": [
    {"name": "Property Address", "type": "text", "required": true},
    {"name": "Client Name", "type": "text"},
    {"name": "Municipality", "type": "text"}
  ]
}
```

### Plumbing Template

```json
{
  "id": "plumbing",
  "name": "Plumbing Services",
  "description": "Plumbing installation, repair, and compliance",
  "job_types": [
    {
      "name": "Installation",
      "description": "New plumbing installation",
      "checklist": [
        "Site assessment",
        "Material preparation",
        "Pipe installation",
        "Connection and sealing",
        "Pressure test",
        "Flow test",
        "COC issued"
      ],
      "custom_fields": [
        {"name": "Pipe Type", "type": "select", "options": ["PVC", "Copper", "PEX", "Galvanized"]},
        {"name": "Pipe Diameter", "type": "select", "options": ["15mm", "22mm", "28mm", "32mm", "40mm"]},
        {"name": "Pressure Test Result", "type": "number", "unit": "bar"}
      ],
      "estimated_hours": 4
    },
    {
      "name": "Repair",
      "description": "Plumbing fault repair",
      "checklist": [
        "Isolate water supply",
        "Identify leak/fault",
        "Repair execution",
        "Pressure test",
        "Flow test",
        "COC issued"
      ],
      "custom_fields": [
        {"name": "Leak Location", "type": "text"},
        {"name": "Repair Method", "type": "select", "options": ["Patch", "Replace Section", "Full Replace"]}
      ],
      "estimated_hours": 2
    },
    {
      "name": "Emergency Callout",
      "description": "Emergency plumbing response",
      "checklist": [
        "Emergency assessment",
        "Safety measures",
        "Temporary fix",
        "Permanent repair plan",
        "Client notification"
      ],
      "custom_fields": [
        {"name": "Emergency Type", "type": "select", "options": ["Burst Pipe", "Blocked Drain", "Gas Leak", "Flood", "Other"]},
        {"name": "Response Time", "type": "number", "unit": "minutes"}
      ],
      "estimated_hours": 1
    }
  ],
  "custom_fields": [
    {"name": "Property Address", "type": "text", "required": true},
    {"name": "Client Name", "type": "text"},
    {"name": "Water Meter Number", "type": "text"}
  ]
}
```

### General Contractor Template

```json
{
  "id": "general-contractor",
  "name": "General Contractor",
  "description": "Versatile contractor template for various services",
  "job_types": [
    {
      "name": "Maintenance",
      "description": "General maintenance task",
      "checklist": [
        "Task assessment",
        "Material check",
        "Execution",
        "Quality check",
        "Client sign-off"
      ],
      "custom_fields": [
        {"name": "Task Type", "type": "select", "options": ["Repair", "Installation", "Inspection", "Other"]},
        {"name": "Materials Used", "type": "textarea"}
      ],
      "estimated_hours": 2
    },
    {
      "name": "Inspection",
      "description": "Site or equipment inspection",
      "checklist": [
        "Safety briefing",
        "Visual inspection",
        "Detailed assessment",
        "Report generation",
        "Client review"
      ],
      "custom_fields": [
        {"name": "Inspection Type", "type": "select", "options": ["Safety", "Quality", "Compliance", "Condition"]},
        {"name": "Findings", "type": "textarea"}
      ],
      "estimated_hours": 1
    }
  ],
  "custom_fields": [
    {"name": "Site Location", "type": "text", "required": true},
    {"name": "Client Name", "type": "text"},
    {"name": "Contact Person", "type": "text"},
    {"name": "Contact Phone", "type": "text"}
  ]
}
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Tailwind CSS                        │
│  • Mobile-first responsive design                            │
│  • Offline-first with Service Worker + IndexedDB              │
│  • Real-time updates via Socket.IO                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Laravel 11 + PostgreSQL 15 + Redis 7                        │
│  • Multi-tenant with workspace isolation                     │
│  • REST API with proper auth (Sanctum)                       │
│  • Feature flags per plan                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REALTIME & OFFLINE                         │
│  • Socket.IO for live updates                                │
│  • Service Worker for asset caching                          │
│  • IndexedDB for offline data storage                        │
│  • Background sync when online                               │
│  • Conflict resolution for concurrent edits                  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Key Tables)

```sql
-- Job Cards
CREATE TABLE job_cards (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    job_type_id UUID NOT NULL,
    client_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'normal',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    invoiced_at TIMESTAMP,
    gps_lat DECIMAL(10,8),
    gps_lng DECIMAL(11,8),
    location_name VARCHAR(255),
    created_by UUID NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job Checklists
CREATE TABLE job_checklists (
    id UUID PRIMARY KEY,
    job_card_id UUID NOT NULL REFERENCES job_cards(id),
    checklist_item_id UUID NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_by UUID,
    completed_at TIMESTAMP,
    notes TEXT,
    photo_urls JSONB DEFAULT '[]'
);

-- Time Tracking
CREATE TABLE time_entries (
    id UUID PRIMARY KEY,
    job_card_id UUID NOT NULL REFERENCES job_cards(id),
    user_id UUID NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    notes TEXT,
    is_break BOOLEAN DEFAULT FALSE
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    job_card_id UUID REFERENCES job_cards(id),
    client_id UUID,
    status VARCHAR(50) DEFAULT 'draft',
    currency VARCHAR(3) DEFAULT 'ZAR',
    subtotal DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    total DECIMAL(15,2) NOT NULL,
    paid_at TIMESTAMP,
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Industry Templates
CREATE TABLE industry_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    job_types JSONB NOT NULL,
    custom_fields JSONB DEFAULT '[]',
    invoice_template VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2-Month Implementation Timeline

### Month 1: Core Contractor Operations

#### Week 1: Job Card Foundation
- [ ] Job card creation (simple form)
- [ ] Job card list (kanban view)
- [ ] Job card status workflow (new → in progress → completed)
- [ ] Basic checklist templates
- [ ] Photo capture integration
- [ ] Time tracking (start/stop timer)

#### Week 2: Team & Industry Templates
- [ ] Team assignment (who does what)
- [ ] Industry template system
- [ ] Custom fields per industry
- [ ] Custom checklists per industry
- [ ] Template marketplace

#### Week 3: Invoicing & Payments
- [ ] Invoice from job card (one-click)
- [ ] ZAR currency support
- [ ] VAT calculations (15%)
- [ ] Payment tracking
- [ ] Quote builder
- [ ] Client approval workflow

#### Week 4: Offline & Mobile
- [ ] Offline-first architecture (Service Worker + IndexedDB)
- [ ] Sync when online
- [ ] Mobile responsive design
- [ ] Touch-friendly UI
- [ ] GPS location capture

### Month 2: Polish & Launch

#### Week 5: Client Portal
- [ ] Client login
- [ ] View job progress
- [ ] View invoices
- [ ] Approve quotes
- [ ] Leave feedback

#### Week 6: Notifications & Integrations
- [ ] Email notifications
- [ ] SMS fallback
- [ ] Google Calendar sync
- [ ] Basic reporting (simple dashboard)

#### Week 7: Testing & Security
- [ ] Security audit
- [ ] Load testing
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Performance optimization

#### Week 8: Launch Prep
- [ ] Documentation
- [ ] Onboarding flow
- [ ] Support system
- [ ] Marketing materials
- [ ] Beta launch

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Test pass rate | 100% | 100% (96/96) |
| Mobile responsive | 100% pages | 0% |
| Offline support | Core features | 0% |
| Industry templates | 5 templates | 0 |
| Time to first job card | < 2 minutes | N/A |
| Invoice generation | < 30 seconds | N/A |
| Page load time | < 3 seconds | N/A |
| Uptime | 99.9% | N/A |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Wi-Fi reliability at mines** | Offline-first architecture with background sync |
| **Low-bandwidth environments** | Optimized assets, lazy loading, compression |
| **Non-technical users** | Simple 3-tap job card creation |
| **Multiple industries** | Configurable template system |
| **South African compliance** | ZAR, VAT, POPIA built-in |
| **Competitor pricing** | R500/mo vs R1,500+/mo |

---

*Document generated by Aquerii development team — 2026-05-30*
