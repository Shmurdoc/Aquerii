# FlowOS — API Contracts

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Backend Lead  
**Base URL**: `https://api.flowos.app/api/v1`  
**Versioning**: URL path versioning (`/v1/`). Breaking changes require new version. `/v1/` and `/v2/` run simultaneously during migration window (max 6 months).  
**Auth**: All endpoints require `Authorization: Bearer {access_token}` unless marked `[PUBLIC]`  
**Tenant context**: All endpoints require `X-Workspace-ID: {workspace_id}` header (except auth + workspace creation)  
**Idempotency**: All POST/PUT/PATCH/DELETE require `Idempotency-Key: {uuid}` header. Replayed requests return cached response (24-hour window).

---

## 1. Standard Response Envelopes

### Success

```json
{
  "data": { },
  "meta": {
    "request_id": "req_01j...",
    "timestamp": "2026-05-05T14:23:11.000Z"
  }
}
```

### Paginated List

```json
{
  "data": [ ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 342,
    "last_page": 7,
    "request_id": "req_01j..."
  },
  "links": {
    "first": "https://api.flowos.app/api/v1/items?page=1",
    "next":  "https://api.flowos.app/api/v1/items?page=2",
    "prev":  null,
    "last":  "https://api.flowos.app/api/v1/items?page=7"
  }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "title": ["The title field is required."],
      "due_date": ["The due date must be a future date."]
    }
  },
  "meta": {
    "request_id": "req_01j...",
    "timestamp": "2026-05-05T14:23:11.000Z"
  }
}
```

### Standard Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | Access token expired — refresh required |
| 403 | `FORBIDDEN` | Authenticated but insufficient permission |
| 403 | `WORKSPACE_SUSPENDED` | Workspace billing is suspended |
| 404 | `NOT_FOUND` | Resource does not exist (or RLS-hidden) |
| 409 | `CONFLICT` | Idempotency key reused with different payload |
| 409 | `CONCURRENT_EDIT` | Optimistic lock version mismatch |
| 413 | `PAYLOAD_TOO_LARGE` | File or request body exceeds limit |
| 422 | `UNPROCESSABLE` | Business rule violation (e.g., quota exceeded) |
| 402 | `STORAGE_QUOTA_EXCEEDED` | Workspace storage at 100% |
| 402 | `AUTOMATION_QUOTA_EXCEEDED` | Monthly automation run quota reached |
| 402 | `AI_CREDITS_EXHAUSTED` | AI credit quota reached |
| 402 | `SEAT_LIMIT_REACHED` | Cannot add member — plan seat limit |
| 429 | `RATE_LIMITED` | Too many requests — `Retry-After` header included |
| 500 | `INTERNAL_ERROR` | Unexpected server error — trace_id included |
| 503 | `SERVICE_UNAVAILABLE` | Maintenance mode or dependency down |

---

## 2. Authentication Endpoints

### POST /auth/register `[PUBLIC]`

```
Request:
{
  "name": "string (2-100 chars)",
  "email": "string (valid email)",
  "password": "string (min 12 chars, complexity rules)",
  "timezone": "string (IANA tz, e.g. 'Africa/Johannesburg')",
  "workspace_name": "string (2-100 chars, creates first workspace)"
}

Response 201:
{
  "data": {
    "user": { "id": "usr_01j...", "name": "...", "email": "..." },
    "workspace": { "id": "ws_01j...", "name": "...", "slug": "..." },
    "message": "Verification email sent"
  }
}

Errors: 422 VALIDATION_ERROR | 409 email already registered
```

---

### POST /auth/login `[PUBLIC]`

```
Request:
{
  "email": "string",
  "password": "string",
  "totp_code": "string (6 digits, required if MFA enabled)"
}

Response 200:
{
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": { "id": "...", "name": "...", "email": "...", "mfa_enabled": true },
    "workspaces": [{ "id": "...", "name": "...", "role": "owner" }]
  }
}
// Refresh token set as HttpOnly cookie (not in response body)

Errors: 401 UNAUTHENTICATED | 429 RATE_LIMITED (after 5 failures)
        422 { code: "MFA_REQUIRED" } (if MFA enabled and totp_code not provided)
        422 { code: "MFA_INVALID" } (wrong code)
```

---

### POST /auth/refresh `[PUBLIC]`

```
Request: (no body — reads HttpOnly refresh token cookie)

Response 200:
{
  "data": {
    "access_token": "eyJ...",
    "expires_in": 3600
  }
}
// New refresh token set as HttpOnly cookie (old one invalidated)

Errors: 401 UNAUTHENTICATED (no/invalid/expired refresh token)
```

---

### POST /auth/logout

```
Request: (no body)
Response 204: (no content)
// Blacklists access token + invalidates refresh token cookie
```

---

## 3. Boards

### GET /boards

```
Query params:
  page (int, default 1)
  per_page (int, default 50, max 100)
  archived (bool, default false)

Response 200: paginated list of Board objects

Board object:
{
  "id": "brd_01j...",
  "workspace_id": "ws_01j...",
  "name": "Q3 Product Roadmap",
  "slug": "q3-product-roadmap",
  "description": "...",
  "icon": "🚀",
  "color": "#6366f1",
  "is_archived": false,
  "default_view": "kanban",
  "columns": [ ColumnObject ],
  "created_by": "usr_01j...",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

---

### POST /boards

```
Request:
{
  "name": "string (required, 1-200 chars)",
  "description": "string (optional, max 2000)",
  "icon": "string (optional, single emoji)",
  "color": "string (optional, hex color)",
  "template_id": "string (optional — creates from template)",
  "default_view": "table|kanban|timeline|calendar|workload|canvas (default: kanban)"
}

Response 201: Board object

Errors: 422 VALIDATION_ERROR
```

---

### GET /boards/{board_id}/items

```
Query params:
  page, per_page
  group_id (filter by group)
  assignee_id (filter by assignee)
  status (filter by status column value)
  due_before (ISO date)
  due_after (ISO date)
  search (full-text, proxied to Meilisearch)
  sort_by (column_id or 'created_at'|'updated_at'|'due_date'|'position')
  sort_dir (asc|desc)

Response 200: paginated list of Item objects

Item object:
{
  "id": "itm_01j...",
  "board_id": "brd_01j...",
  "group_id": "grp_01j...",
  "title": "Design new onboarding flow",
  "position": 1024.0,
  "column_values": {
    "col_status": { "value": "In Progress", "color": "#f59e0b" },
    "col_assignee": { "value": ["usr_01j..."] },
    "col_due_date": { "value": "2026-06-01" },
    "col_priority": { "value": "High" },
    "col_numbers": { "value": 42 }
  },
  "assignees": [ UserObject ],
  "dependencies": {
    "blocking": ["itm_..."],
    "blocked_by": ["itm_..."]
  },
  "comment_count": 3,
  "attachment_count": 1,
  "is_archived": false,
  "created_by": "usr_01j...",
  "created_at": "...",
  "updated_at": "..."
}
```

---

### POST /boards/{board_id}/items

```
Request:
{
  "title": "string (required, 1-500 chars)",
  "group_id": "string (required)",
  "position": "float (optional — appended to group if omitted)",
  "column_values": {
    "col_status": { "value": "Not Started" },
    "col_assignee": { "value": ["usr_01j..."] },
    "col_due_date": { "value": "2026-06-01" }
  }
}

Response 201: Item object
Side effects:
  - activity_log entry created
  - realtime event published: item:created
  - automation triggers evaluated

Errors: 422 VALIDATION_ERROR | 404 board or group not found
```

---

### PATCH /items/{item_id}

```
Request (all fields optional — PATCH semantics):
{
  "title": "string",
  "group_id": "string",
  "position": "float",
  "column_values": {
    "col_status": { "value": "Done" }
  }
}

Response 200: Item object (full, updated)
Side effects:
  - activity_log entry per changed field
  - realtime event: item:updated
  - automation triggers evaluated
  - Meilisearch index updated (async job)

Errors: 404 | 403 | 422 | 409 CONCURRENT_EDIT (if version mismatch)
```

---

### DELETE /items/{item_id}

```
Response 204 (no content)
Note: Soft delete (is_deleted = true). Hard purge after 30 days.
Side effects:
  - realtime event: item:deleted
  - Meilisearch record removed

Errors: 404 | 403
```

---

## 4. Documents

### GET /documents

```
Query params: folder_id, page, per_page, search
Response 200: paginated Document objects

Document object:
{
  "id": "doc_01j...",
  "workspace_id": "ws_01j...",
  "folder_id": "fld_01j...",
  "title": "Product Spec Q3",
  "icon": "📄",
  "content_preview": "First 200 chars of plain text...",
  "word_count": 1240,
  "is_public": false,
  "linked_item_id": null,
  "created_by": "usr_01j...",
  "updated_by": "usr_01j...",
  "created_at": "...",
  "updated_at": "..."
}
// Note: full BlockNote JSON content served via /documents/{id}/content
// Y.js state served via WebSocket (realtime service) — not REST
```

---

### GET /documents/{document_id}/content

```
Response 200:
{
  "data": {
    "id": "doc_01j...",
    "content": { } // BlockNote JSON document
  }
}
```

---

## 5. CRM

### GET /crm/deals

```
Query params: pipeline_id, stage_id, owner_id, page, per_page, search

Deal object:
{
  "id": "deal_01j...",
  "title": "Acme Corp — Enterprise Plan",
  "value": 12000.00,
  "currency": "USD",
  "stage_id": "stage_01j...",
  "stage_name": "Proposal Sent",
  "contact_id": "con_01j...",
  "company_id": "com_01j...",
  "owner_id": "usr_01j...",
  "expected_close_date": "2026-07-01",
  "ai_score": 72,
  "ai_score_reasoning": ["...", "...", "..."],
  "probability": 0.65,
  "last_activity_at": "2026-05-01T09:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 6. Automations

### POST /automations

```
Request:
{
  "name": "string (required)",
  "trigger": {
    "type": "status_changed",
    "config": { "board_id": "...", "to": "Done" }
  },
  "filters": [
    { "field": "col_priority", "operator": "equals", "value": "High" }
  ],
  "actions": [
    {
      "type": "send_notification",
      "config": { "to": "{{item.assignees}}", "message": "Item {{item.title}} is done" }
    }
  ],
  "is_active": true
}

Response 201: Automation object
Errors: 422 (invalid trigger type, invalid action config, quota exceeded)
```

---

### POST /automations/generate (AI)

```
Request:
{
  "description": "When a task is marked Done, notify the assigned person and move it to Archive"
}

Response 200:
{
  "data": {
    "automation": { /* full automation JSON, ready to POST to /automations */ },
    "confidence": 0.94,
    "credits_used": 10
  }
}

Errors: 402 AI_CREDITS_EXHAUSTED | 422 (description too vague — explanation in error.message)
```

---

## 7. Files

### POST /files (upload)

```
Request: multipart/form-data
  file: binary
  entity_type: "item"|"document"|"comment"
  entity_id: string

Response 201:
{
  "data": {
    "id": "fil_01j...",
    "filename": "design-spec.pdf",
    "content_type": "application/pdf",
    "size_bytes": 2048000,
    "url": "https://storage.flowos.app/workspaces/{ws_id}/{uuid}.pdf",
    "url_expires_at": "2026-05-06T14:23:11Z",  // Pre-signed URL, 1-hour TTL
    "created_at": "..."
  }
}

Errors: 413 PAYLOAD_TOO_LARGE (> 100MB) | 402 STORAGE_QUOTA_EXCEEDED
        422 (file type not allowed)
```

---

## 8. AI Endpoints

### POST /ai/task/generate-description

```
Request:
{
  "title": "string (required)",
  "board_context": "string (optional)"
}

Response 200:
{
  "data": {
    "description": "string",
    "credits_used": 2,
    "credits_remaining": 498
  }
}

Errors: 402 AI_CREDITS_EXHAUSTED
```

---

### POST /ai/document/generate

```
Request:
{
  "action": "continue"|"fix_grammar"|"make_shorter"|"make_longer"|"change_tone"|"summarize"|"translate",
  "selected_text": "string (required)",
  "context": "string (surrounding document context, max 2000 chars)",
  "options": {
    "tone": "professional|casual|technical|friendly",  // for change_tone
    "language": "es|fr|de|..."                          // for translate
  }
}

Response 200:
{
  "data": {
    "content": "string",
    "credits_used": 15,
    "credits_remaining": 483
  }
}
```

---

## 9. Webhooks (Inbound)

### POST /webhooks/stripe `[PUBLIC — signature verified]`

```
Headers required: Stripe-Signature
Body: Stripe event payload

Supported events:
  customer.subscription.created    → activate workspace plan
  customer.subscription.updated    → update plan/seats
  customer.subscription.deleted    → downgrade to free (grace period)
  invoice.payment_succeeded        → record payment, reset any suspension
  invoice.payment_failed           → mark payment failed, send warning
  customer.subscription.trial_will_end → send upgrade prompt

Response 200: { "received": true }
Response 400: signature invalid
```

---

### POST /webhooks/payfast `[PUBLIC — ITN signature verified]`

```
Body: PayFast ITN parameters (form-encoded)
Signature verification: MD5 of sorted parameters + passphrase

payment_status = COMPLETE  → activate subscription
payment_status = FAILED    → grace period (7 days)
payment_status = CANCELLED → downgrade (30-day grace)

Response 200: "OK"
```

---

## 10. Contract Testing Requirements

Every endpoint must have a **Pact consumer contract**:

```typescript
// tests/contracts/items.pact.ts
describe('Items API contract', () => {
  it('returns correct shape for PATCH /items/{id}', async () => {
    await provider.addInteraction({
      state: 'item exists in workspace',
      uponReceiving: 'a request to update item title',
      withRequest: {
        method: 'PATCH',
        path: '/api/v1/items/itm_01j',
        headers: { Authorization: like('Bearer token'), 'X-Workspace-ID': like('ws_01j') },
        body: { title: like('Updated title') },
      },
      willRespondWith: {
        status: 200,
        body: {
          data: {
            id: like('itm_01j'),
            title: like('Updated title'),
            updated_at: like('2026-01-01T00:00:00Z'),
          },
        },
      },
    })
  })
})
```

Provider verification runs in CI against the Pact broker on every API service PR.

---

*Owner: Backend Lead*  
*Cross-reference: QA_STRATEGY.md §3 (contract testing), SECURITY.md §4 (input validation), DATABASE_SCHEMA.md*
