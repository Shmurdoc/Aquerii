# Data Flows & Integration Sequences

**Owner**: RUFLO architect + RUFLO workflow-specialist  
**Purpose**: Critical path documentation for integration logic

---

## 1. Low Stock Detection → Purchase Order Creation Flow

### 1.1 Sequence Diagram
```
Warehouse Worker          InvenTree           Gateway API        ERPNext
      │                       │                    │                │
      │── Receive Stock ──────→│                    │                │
      │                       │                    │                │
      │                       │ [Update DB]        │                │
      │                       │                    │                │
      │                       │ [Check: Stock < Reorder Point?]     │
      │                       │                    │                │
      │                       ├── [YES] Emit       │                │
      │                       │ stock.on_hand_    │                │
      │                       │ changed webhook    │                │
      │                       │                    │                │
      │                       │────────────POST────→ /webhooks/     │
      │                       │ {part_id, stock}   │ inventree      │
      │                       │                    │                │
      │                       │                    │ [Validate]     │
      │                       │                    │ [Check PO      │
      │                       │                    │  exists?]      │
      │                       │                    │                │
      │                       │                    ├─ Call ERPNext ─→
      │                       │                    │ Create PO      │
      │                       │                    │ {supplier,     │
      │                       │                    │  part, qty}    │
      │                       │                    │                │
      │                       │                    │ ← PO created  │
      │                       │                    │ {po_number}    │
      │                       │                    │                │
      │                       │← PUT /parts/{id}───│ Update         │
      │                       │  {po_reference}    │ InvenTree      │
      │                       │                    │ with PO link   │
      │                       │ [Update DB]        │                │
      │                       │                    │                │
      │ ← Zulip Alert ────────┤ + Event logged ────→ + Logged      │
      │  "PO-001 Created"     │                    │                │
      │                       │                    │                │
```

### 1.2 Error Scenarios
| Scenario | Trigger | Handling |
|----------|---------|----------|
| Webhook delivery fails | Network timeout | Retry with exponential backoff (max 5 retries) |
| ERPNext API unavailable | HTTP 503 | Queue event; retry in 5 minutes |
| Duplicate PO attempt | Race condition | Use idempotency key (part_id + timestamp) |
| Supplier not found | Data inconsistency | Log error, notify admin via Zulip |

### 1.3 Idempotency Implementation
```python
# Gateway webhook receiver (pseudocode)
def handle_stock_changed_webhook(event):
    idempotency_key = f"{event.part_id}_{event.timestamp}"
    
    # Check if already processed
    if is_processed(idempotency_key):
        return {"status": "idempotent", "message": "Already processed"}
    
    # Check if PO exists for this part
    existing_po = find_po_for_part(event.part_id)
    if existing_po:
        return {"status": "exists", "po_number": existing_po}
    
    # Create PO
    po = create_po_in_erpnext(...)
    mark_as_processed(idempotency_key)
    return {"status": "created", "po_number": po.number}
```

---

## 2. Sale Order → Stock Reservation Flow

### 2.1 Sequence Diagram
```
Sales Rep            Twenty CRM          Gateway API       InvenTree
     │                   │                    │                 │
     │─ Create Deal ────→│                    │                 │
     │                   │                    │                 │
     │                   │ [Persist Deal]     │                 │
     │                   │                    │                 │
     │                   ├─ Event: sale.     │                 │
     │                   │  created emitted  │                 │
     │                   │                    │                 │
     │                   │────POST webhook───→ /webhooks/       │
     │                   │ {deal_id,          │ twenty          │
     │                   │  items: [...]}     │                 │
     │                   │                    │                 │
     │                   │                    │ [Parse items]   │
     │                   │                    │ [For each item] │
     │                   │                    │                 │
     │                   │                    │──POST /reserve──→
     │                   │                    │ {part_id, qty,  │
     │                   │                    │  order_id}      │
     │                   │                    │                 │
     │                   │                    │ ← {reserved:    │
     │                   │                    │    true}        │
     │                   │                    │                 │
     │ ← Stock Reserved ─┤ ← Confirm ────────│                 │
     │   Badge shows     │  {status: OK}     │                 │
     │   "Ready to Ship" │                   │                 │
     │                   │                    │                 │
     │                   │                    │ + Log event     │
     │                   │                    │ "Stock reserved"│
     │                   │                    │                 │
```

### 2.2 Reservation Rules
| Rule | Description |
|------|-------------|
| **Soft Reserve** | Mark stock as reserved but don't physically move |
| **Reservation TTL** | Hold for 24 hours; release if deal not confirmed |
| **Overbooking Check** | Prevent reserve if insufficient stock |
| **Release on Cancel** | Auto-release if deal cancelled |

### 2.3 Conflict Resolution: Concurrent Reservations
```python
# Scenario: Two sales reps try to reserve same stock simultaneously

# Attempt 1 (Sales Rep A)
reserved_qty_1 = reserve_stock(part_id, qty=50)  # SUCCESS

# Attempt 2 (Sales Rep B) - happens before rep A confirms
reserved_qty_2 = reserve_stock(part_id, qty=50)  # FAIL: insufficient

# Result:
# Rep A: 50 reserved
# Rep B: ERROR "Only 0 units available"
# 
# Rep B must either:
# - Accept partial (negotiate qty)
# - Backorder (create PO in gateway)
# - Cancel deal
```

---

## 3. Document Upload → OCR → BOM Update Flow

### 3.1 Sequence Diagram
```
Purchasing           Paperless-ngx        Gateway        InvenTree
     │                    │                   │               │
     │─ Upload Invoice ───→│                   │               │
     │  (PDF)             │                   │               │
     │                    │                   │               │
     │                    │ [Receive file]    │               │
     │                    │                   │               │
     │                    │ [Docling OCR]     │               │
     │                    │ Extract text      │               │
     │                    │                   │               │
     │                    ├─ Webhook: ───────→ /webhooks/    │
     │                    │ document.uploaded  │ paperless   │
     │                    │ {doc_id,           │ {text}      │
     │                    │  extracted_text}   │             │
     │                    │                    │             │
     │                    │                    │ [Parse]     │
     │                    │                    │ "Part: X    │
     │                    │                    │  Qty: 100   │
     │                    │                    │  Price: $5" │
     │                    │                    │             │
     │                    │                    │─POST /parts─→
     │                    │                    │ {part_id,   │
     │                    │                    │  qty,       │
     │                    │                    │  supplier}  │
     │                    │                    │             │
     │                    │                    │ ← Update BOM│
     │                    │                    │ supplier    │
     │                    │                    │ cost        │
     │                    │                    │             │
     │ ← Document ────────┤ ← Indexed ────────│             │
     │   Indexed          │ + searchable      │             │
     │                    │                   │             │
```

### 3.2 OCR Confidence & Manual Review
```
High Confidence (>95%)
  └─ Auto-update InvenTree

Medium Confidence (70-95%)
  └─ Queue for manual review
     └─ Admin approves/rejects via Homarr dashboard

Low Confidence (<70%)
  └─ Flag error
     └─ Admin reviews original document
     └─ Manual entry or re-scan
```

---

## 4. Event Loop Prevention

### 4.1 Problem: Infinite Loop
```
Scenario: Stock update triggers PO creation, 
          which triggers stock update, 
          which triggers PO creation... (infinite)

Timeline:
T1: Stock updated → Webhook fired → PO created
T2: Gateway updates InvenTree with PO ref → Webhook fired (AGAIN)
T3: PO marked complete → Stock updated → Webhook fired (AGAIN)
...
```

### 4.2 Prevention Mechanisms

**Mechanism 1: Event Deduplication**
```python
# Gateway: Track processed events
processed_events = {}

def handle_webhook(event):
    event_id = f"{event.type}_{event.part_id}_{event.timestamp_ms}"
    
    if event_id in processed_events:
        # Already handled
        return {"status": "duplicate"}
    
    processed_events[event_id] = True
    # Process once
    return process_event(event)
```

**Mechanism 2: State Transition Guards**
```python
# InvenTree: Only emit webhook if state changes
def update_stock(part_id, new_qty):
    old_qty = get_current_stock(part_id)
    
    if old_qty == new_qty:
        # No change, don't emit webhook
        return
    
    # Update and emit
    persist_stock(part_id, new_qty)
    emit_webhook("stock.on_hand_changed", {
        "part_id": part_id,
        "old_qty": old_qty,
        "new_qty": new_qty
    })
```

**Mechanism 3: Max Retry Count**
```python
# Gateway: Limit retries per event
MAX_RETRIES_PER_EVENT = 3

def retry_webhook_processing(event):
    retry_count = get_retry_count(event.id)
    
    if retry_count >= MAX_RETRIES_PER_EVENT:
        # Send to dead-letter queue
        send_to_dlq(event)
        notify_admin("Event max retries exceeded", event)
        return
    
    # Retry with backoff
    wait_time = exponential_backoff(retry_count)
    schedule_retry(event, wait_time)
```

---

## 5. Error Scenarios & Recovery

### 5.1 Webhook Delivery Failure

| Scenario | Cause | Recovery |
|----------|-------|----------|
| Network timeout | Gateway unreachable | Retry with exponential backoff (1s, 2s, 4s, 8s, 16s) |
| HTTP 500 | Server error | Retry; if persists > 5min, escalate to admin |
| HTTP 400 | Bad payload | Fix & resend (human intervention) |
| HTTP 401 | Unauthorized | Check API key rotation; reset if needed |

### 5.2 Sync Conflict: Stock vs. PO Mismatch

| Scenario | Resolution |
|----------|------------|
| InvenTree says 100, ERPNext says 80 | **InvenTree wins** (source of truth) |
| PO received but stock not updated | Gateway verifies receipt; updates stock |
| Stock location wrong | Admin corrects in InvenTree; no auto-sync |

### 5.3 Dead-Letter Queue (DLQ)

**Events that fail after max retries**:
1. Log to DLQ table in PostgreSQL
2. Send alert to Zulip (#errors channel)
3. Admin can manually replay from DLQ UI

```python
# DLQ structure
class DeadLetterEvent:
    event_id: str
    event_type: str  # "stock.on_hand_changed", etc.
    payload: dict
    error_message: str
    retry_count: int
    created_at: datetime
    status: str  # "pending_review", "replayed", "ignored"
```

---

## 6. Monitoring & Alerting

### 6.1 SigNoz Metrics to Track
| Metric | Target | Alert |
|--------|--------|-------|
| Webhook latency (p95) | < 5s | > 10s |
| Failed webhooks (per hour) | 0 | > 1 |
| Stock update lag | < 2s | > 5s |
| PO creation lag | < 10s | > 30s |
| Gateway uptime | 99.9% | < 99% |

### 6.2 Zulip Alerts
```
Channel: #alerts

[ERROR] Webhook failed: stock.on_hand_changed
Part ID: BOLT-001, Retries: 3/5
Next retry: 2026-05-03 14:32:45 UTC

[WARNING] PO creation slow: 15s for BOLT-001
Supplier: ABC Corp, Qty: 100

[INFO] DLQ event created: event_12345
Human review required in admin dashboard
```

---

## 7. Dashboard: Real-Time Data Flow View

**Homarr Widget (T4.1 + T4.2)**:
```
InvenTree Stock Status:
  ├─ Parts Watched: 45
  ├─ Low Stock: 3
  │   ├─ BOLT-001 (Current: 5, Reorder: 50)
  │   ├─ NUT-002 (Current: 2, Reorder: 20)
  │   └─ WASHER-003 (Current: 10, Reorder: 50)
  ├─ POs Created Today: 2
  ├─ Stock Reserved: 150 units
  └─ Last Sync: 2 seconds ago

ERPNext Integration:
  ├─ POs Pending: 5
  ├─ POs Received: 2
  └─ Total Value: $12,500

Twenty CRM:
  ├─ Active Deals: 8
  ├─ Stock Reserved: 150 units
  └─ Fulfillment Status: 75% ready
```

---

*Owner: RUFLO architect + RUFLO workflow-specialist*  
*Next: ERROR_HANDLING.md for detailed retry/DLQ strategies*