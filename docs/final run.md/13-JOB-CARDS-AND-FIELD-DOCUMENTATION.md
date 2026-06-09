# Job Cards and Field Documentation

Date: 2026-05-30

## What it is

A first-class feature for capturing, digitizing, managing, and auditing job cards and other field or workshop documents that are traditionally handwritten.

This covers any operational document that originates on paper or offline and needs to live inside the system for traceability, reporting, and compliance.

---

## Brutal truth about handwritten docs

If your operation still produces handwritten job cards, site reports, inspection sheets, safety forms, or shift logs — a SaaS platform that ignores that reality is useless to you.

This feature bridges the physical-to-digital gap without forcing a total process change upfront.

---

## Document types covered

| Document | Origin | Use case |
|---|---|---|
| Job card | Workshop / field | Task-level work record for technician or operator |
| Shift handover | Operations | Outgoing shift logs issues and status for incoming |
| Inspection sheet | Safety / maintenance | Checklist-based sign-off for equipment or site |
| Site report | Field operations | Daily or incident activity from a remote site |
| Material requisition | Stores / procurement | Hand-requested stock items |
| Non-conformance report (NCR) | QA / safety | Deviation or defect captured in field |
| Permit to work | Safety | Signed authorisation before hazardous task begins |
| Equipment log | Maintenance | Running log of hours, faults, and servicing |
| Incident report | Safety / HR | Event captured immediately after occurrence |

---

## Capture methods

### Method 1: Structured digital form

User fills in a form on screen or mobile.
Fields match the paper format exactly so there is zero retraining cost.
Works offline and syncs on reconnect.

### Method 2: Mobile photo capture + AI extraction

User photographs a handwritten job card.
AI service extracts key fields (job number, description, assignee, date, materials used, sign-off name).
User reviews and confirms or corrects extracted values.
Original image is stored as source-of-truth attachment.

### Method 3: Manual digitization

User transcribes the handwritten document into a structured form.
Original scanned document attached for audit trail.

### Method 4: Scan to PDF with form overlay

Physical document scanned.
System overlays editable fields on the PDF.
User fills digital fields; physical scan retained.

---

## Job card data model

| Field | Type | Description |
|---|---|---|
| id | UUID | System identifier |
| workspace_id | UUID | Tenant scope |
| job_number | string | Sequential, human-readable reference |
| job_type | enum | repair, service, inspection, installation, other |
| title | string | Short description of work |
| description | text | Full work description |
| location | string | Site, bay, or asset location |
| asset_id | UUID nullable | Linked equipment or asset record |
| assigned_to | UUID | Technician or operator |
| supervisor_id | UUID nullable | Signing supervisor |
| status | enum | draft, open, in_progress, pending_parts, completed, signed_off, closed |
| priority | enum | routine, urgent, critical |
| started_at | timestamp | When work began |
| completed_at | timestamp | When work finished |
| signed_off_at | timestamp | When supervisor accepted |
| materials_used | JSON | Array of item, qty, unit |
| labour_hours | decimal | Time spent |
| safety_checks | JSON | Array of checklist items with pass/fail |
| root_cause | text | Nullable. For repair and NCR types |
| source_image_ids | UUID[] | Attached handwritten originals |
| created_by | UUID | Who entered it |
| created_at | timestamp | Record creation time |

---

## Digital form builder

Workspace admin can define custom job card templates per document type:
- drag-and-drop field configuration
- required vs optional field rules
- field types: text, number, date, dropdown, checklist, signature, photo
- default values and conditional logic (field shows only if prior field matches condition)

---

## Offline support

Critical for mine and field environments with no network:
- Forms work fully offline on mobile.
- Data queued locally with conflict-free merge on reconnect.
- No data loss on reconnect after multi-hour outage.

---

## Signature capture

Physical sign-off is a legal requirement on many job cards:
- In-app finger/stylus signature capture on mobile.
- Printed name + timestamp + role stored alongside signature image.
- Signature lock: once signed, record is immutable except by designated supervisor override (with audit event).

---

## AI-assisted field extraction

When a photo of a handwritten document is uploaded:
1. AI runs OCR on the image.
2. Extracted text is parsed against the expected form schema.
3. Confidence scores per field shown to user.
4. Low-confidence fields highlighted for review.
5. User confirms, corrects, and saves.
6. Original image permanently attached.

Supported recognition targets:
- job numbers and reference codes
- dates and times
- names and signatures
- material descriptions and quantities
- checkbox marks and tick patterns

---

## Linking to other system records

Job cards connect to:
- Board tasks (a job card can generate or close a task).
- Asset/equipment records.
- Inventory (materials used depletes stock automatically on sign-off).
- Purchase orders (materials not in stock trigger procurement request).
- Support tickets (if job card raises a fault that needs further investigation).
- Invoice line items (labour and materials billable to a project or client).

---

## Approval and sign-off flow

```
Technician completes job card
        |
        v
Supervisor review queue
        |
        +-- approved -> status: signed_off -> inventory/invoice sync
        +-- rejected with comment -> back to in_progress with required corrections
        +-- escalated -> sent to senior manager
```

---

## Reporting

- Job cards by type, location, and asset.
- Open vs completed vs overdue by technician.
- Labour hours by site and period.
- Materials consumed by job type.
- Recurring fault detection (same asset, same fault pattern).
- Safety check failure rates and trends.

---

## Audit and compliance

- Every status change logged with actor and timestamp.
- Signature events stored with biometric metadata.
- Source images are immutable once attached.
- Job cards cannot be deleted after sign-off; only archived.
- Export pack available per audit request (PDF bundle + raw data).

---

## API endpoints

```
POST   /workspaces/{workspace}/job-cards
GET    /workspaces/{workspace}/job-cards
GET    /workspaces/{workspace}/job-cards/{id}
PATCH  /workspaces/{workspace}/job-cards/{id}
POST   /workspaces/{workspace}/job-cards/{id}/sign-off
POST   /workspaces/{workspace}/job-cards/{id}/reject
POST   /workspaces/{workspace}/job-cards/{id}/attachments
POST   /workspaces/{workspace}/job-cards/{id}/extract   -- AI extraction from image
GET    /workspaces/{workspace}/job-cards/templates
POST   /workspaces/{workspace}/job-cards/templates
```

---

## Mobile-first UX requirements

- Single-thumb operation for common actions.
- Camera trigger integrated into form flow.
- Offline indicator visible at all times.
- Large tap targets for gloved or dirty hands.
- Dark mode for low-light environments.

---

## Acceptance criteria

- Job card can be created fully offline and syncs without data loss.
- Handwritten image can be photographed, extracted, and confirmed in under 60 seconds.
- Signature capture stores image + name + timestamp and locks record.
- Signed-off job card triggers inventory deduction and optional invoice line creation.
- Recurring fault on same asset surfaces in reporting within same day.
- Export bundle (PDF + data) is available for any closed job card on demand.
- Every sign-off, rejection, and escalation has a corresponding audit event.
