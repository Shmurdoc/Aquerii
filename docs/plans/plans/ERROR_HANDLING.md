# Error Handling & Resilience Strategies

**Owner**: RUFLO workflow-specialist + gstack maintainability specialist  
**Purpose**: Define retry policies, conflict resolution, and error recovery patterns

---

## 1. Retry Strategies

### 1.1 Exponential Backoff with Jitter
```python
import random
import time

def exponential_backoff_with_jitter(attempt: int, base_delay: float = 1.0, max_delay: float = 60.0) -> float:
    """
    Calculate delay for exponential backoff with jitter.
    Prevents thundering herd problem.
    
    Attempt 1: ~1s, Attempt 2: ~2s, Attempt 3: ~4s, ... max 60s
    Jitter: ±25% randomization to spread retries
    """
    delay = min(base_delay * (2 ** attempt), max_delay)
    jitter = delay * 0.25 * random.uniform(-1, 1)
    return max(0, delay + jitter)

# Usage
for attempt in range(5):
    try:
        result = call_external_api()
        return result
    except Exception as e:
        if attempt < 4:
            wait_time = exponential_backoff_with_jitter(attempt)
            print(f"Retry {attempt + 1}/5 in {wait_time:.1f}s")
            time.sleep(wait_time)
        else:
            raise  # All retries exhausted
```

### 1.2 Retry Policies Per Service

| Service | Max Retries | Backoff | Timeout |
|---------|------------|---------|---------|
| **InvenTree** | 5 | Exponential (1s base) | 30s per attempt |
| **AureusERP** | 3 | Exponential (2s base) | 60s per attempt |
| **Twenty CRM** | 4 | Exponential (1s base) | 30s per attempt |
| **Gateway Internal** | 2 | Linear (500ms) | 10s per attempt |
| **Webhook Delivery** | 5 | Exponential (1s base) | 5s per attempt |

### 1.3 Circuit Breaker Pattern

**Purpose**: Prevent cascading failures by stopping calls to failing service

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Stop calling service
    HALF_OPEN = "half_open"  # Test if recovered

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            # Check if timeout expired
            if datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise
    
    def on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def create_po_in_erpnext(po_data):
    # If ERPNext is down, circuit will trip after 5 failures
    # and stop attempting for 60 seconds
    return breaker.call(erpnext_api.post, "/api/purchase_orders", po_data)
```

---

## 2. Idempotency & Deduplication

### 2.1 Idempotency Middleware (FastAPI — Production Implementation)

**This middleware is enforced at the Gateway level for all POST/PATCH/DELETE requests.**  
See T3.4 in PHASE3_TASKS.md for deployment task.

```python
# services/gateway/middleware/idempotency.py
import hashlib
import json
from datetime import datetime, timedelta
from typing import Callable

from fastapi import Request, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from gateway.models import IdempotencyKey
from gateway.database import get_db

IDEMPOTENCY_TTL_HOURS = 24
WRITE_METHODS = {"POST", "PATCH", "DELETE"}


async def idempotency_middleware(request: Request, call_next: Callable) -> Response:
    """
    Idempotency middleware for all write operations.
    
    - Requires Idempotency-Key header on all POST/PATCH/DELETE requests.
    - On first request: processes normally, stores result with key (TTL: 24h).
    - On duplicate key: returns cached result immediately with Idempotency-Status: replayed.
    - Concurrent requests with same key: second waits for first to complete (Redis lock).
    """
    if request.method not in WRITE_METHODS:
        return await call_next(request)

    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "Idempotency-Key header is required for all write operations.",
                "hint": "Generate a UUID v4 per unique operation: import uuid; str(uuid.uuid4())"
            }
        )

    # Validate key format (UUID v4 preferred, max 255 chars)
    if len(idempotency_key) > 255:
        raise HTTPException(status_code=400, detail={"code": "IDEMPOTENCY_KEY_TOO_LONG"})

    async for db in get_db():
        # Check for existing result
        result = await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.key == idempotency_key,
                IdempotencyKey.path == request.url.path,
                IdempotencyKey.expires_at > datetime.utcnow()
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Return cached response
            return Response(
                content=existing.response_body,
                status_code=existing.response_status,
                media_type="application/json",
                headers={
                    "Idempotency-Status": "replayed",
                    "Idempotency-Key": idempotency_key,
                    "X-Original-Request-Time": existing.created_at.isoformat(),
                }
            )

        # Process the request
        response = await call_next(request)

        # Read response body (needed to cache it)
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        # Store result (only cache successful responses: 2xx)
        if 200 <= response.status_code < 300:
            db.add(IdempotencyKey(
                key=idempotency_key,
                path=request.url.path,
                method=request.method,
                response_status=response.status_code,
                response_body=response_body.decode("utf-8"),
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=IDEMPOTENCY_TTL_HOURS),
            ))
            await db.commit()

        return Response(
            content=response_body,
            status_code=response.status_code,
            headers={
                **dict(response.headers),
                "Idempotency-Status": "processed",
                "Idempotency-Key": idempotency_key,
            },
            media_type=response.media_type,
        )
```

**SQLAlchemy Model**:
```python
# services/gateway/models/idempotency.py
from sqlalchemy import Column, String, Integer, DateTime, Text
from gateway.database import Base

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (
        Index("ix_idempotency_key_path", "key", "path"),
        Index("ix_idempotency_expires", "expires_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False)
    method = Column(String(10), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
```

**Wiring in main.py**:
```python
# services/gateway/main.py
from fastapi import FastAPI
from gateway.middleware.idempotency import idempotency_middleware

app = FastAPI()
app.middleware("http")(idempotency_middleware)
```

### 2.2 Idempotency Key Format (Caller Responsibility)

```
Format: UUID v4 (preferred) or {service}_{entity_id}_{action}_{date}

UUID v4 examples (for user-initiated requests):
  550e8400-e29b-41d4-a716-446655440000

Deterministic examples (for automated/agent-initiated requests):
  auto_po_{part_id}_{YYYY-MM-DD}        → auto_po_BOLT001_2026-05-04
  invoice_deal_{deal_id}                → invoice_deal_DEAL-00123
  contact_sync_{email_hash}             → contact_sync_a3f4b2c1

Rules:
  - Must be unique per operation (not per resource)
  - UUID v4 is preferred for user requests (guaranteed unique)
  - Deterministic keys are preferred for automated flows (guaranteed idempotent)
  - Max length: 255 characters
  - TTL: 24 hours (after expiry, same key will re-process)
```

### 2.3 Idempotency Key Pattern (Handler-level, legacy pattern)

For handlers that call downstream services (not Gateway middleware), use the handler-level pattern:

```python
async def create_po_with_idempotency(po_data: dict, idempotency_key: str, db: AsyncSession):
    """
    Create PO in AureusERP only if idempotency key hasn't been seen before.
    Used inside event handlers (not at middleware level).
    """
    existing = await db.execute(
        select(ProcessedEvent).where(ProcessedEvent.idempotency_key == idempotency_key)
    )
    record = existing.scalar_one_or_none()

    if record:
        return {"status": "idempotent", "po_number": record.result_ref, "replayed": True}

    # Call AureusERP
    po = await aureusrep_client.post("/api/purchases/orders", po_data)

    await db.execute(insert(ProcessedEvent).values(
        idempotency_key=idempotency_key,
        result_ref=po["id"],
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=24),
    ))
    await db.commit()

    return {"status": "created", "po_number": po["id"], "replayed": False}
```

---

## 3. Dead-Letter Queue (DLQ)

### 3.1 DLQ Schema
```python
class DeadLetterEvent(Base):
    __tablename__ = "dead_letter_queue"
    
    id: int = Column(Integer, primary_key=True)
    event_id: str = Column(String, unique=True)
    event_type: str = Column(String)  # "stock.on_hand_changed", etc.
    source_service: str = Column(String)  # "inventree", "twenty", etc.
    payload: dict = Column(JSON)
    error_message: str = Column(String)
    error_traceback: str = Column(String)
    retry_count: int = Column(Integer, default=0)
    max_retries_attempted: int = Column(Integer)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    last_retry_at: datetime = Column(DateTime)
    status: str = Column(String, default="pending")  # "pending", "resolved", "ignored"
    resolved_at: datetime = Column(DateTime)
    resolution_notes: str = Column(String)
```

### 3.2 DLQ Processing Flow

```
Event failed > Max retries
    ↓
Send to DLQ
    ↓
Alert admin via Zulip (#errors channel)
    ↓
Admin reviews in Homarr dashboard
    ↓
[OPTION 1: Fix & Replay]
  └─ Admin clicks "Replay"
     └─ Event retried (resets retry counter)
     └─ If succeeds: marked as "resolved"
     └─ If fails again: back to DLQ
     
[OPTION 2: Ignore]
  └─ Admin clicks "Ignore"
     └─ Status: "ignored"
     └─ No further retries
     
[OPTION 3: Manual Intervention]
  └─ Admin reviews error
     └─ Fixes underlying issue (e.g., data inconsistency)
     └─ Manually reconciles state
```

### 3.3 DLQ Admin Dashboard (Homarr Widget)

```
Dead Letter Queue Summary
├─ Pending: 3 events
├─ Resolved: 142 events (this week)
└─ Ignored: 5 events

Pending Events:
┌─────┬──────────────┬───────────┬────────────┐
│ID   │Event Type    │Source     │Retry Count │
├─────┼──────────────┼───────────┼────────────┤
│E123 │stock.changed │InvenTree  │5/5         │
│E124 │sale.created  │Twenty     │4/5         │
│E125 │doc.uploaded  │Paperless  │3/5         │
└─────┴──────────────┴───────────┴────────────┘

[Actions]
[E123: Replay] [E123: Ignore] [E123: View Error]
```

---

## 4. Conflict Resolution

### 4.1 Data Consistency: Which Source Wins?

| Conflict | Resolution | Reason |
|----------|------------|--------|
| **Stock count mismatch** | InvenTree wins | Source of truth for inventory |
| **PO status mismatch** | ERPNext wins | Source of truth for finance |
| **Customer data** | Twenty wins | Source of truth for CRM |
| **Document metadata** | Paperless wins | Source of truth for documents |

**Implementation**:
```python
def sync_stock_between_services(inventree_qty, erpnext_qty):
    """Reconciliation logic"""
    if inventree_qty != erpnext_qty:
        # InvenTree is source of truth
        log_discrepancy(f"Stock mismatch: InvenTree={inventree_qty}, ERPNext={erpnext_qty}")
        
        # Update ERPNext to match InvenTree
        update_erpnext_stock(erpnext_qty=inventree_qty)
        
        # Alert admin
        notify_admin_via_zulip(f"Stock reconciliation: Updated ERPNext to {inventree_qty}")
```

### 4.2 Concurrent Request Handling

**Problem**: Two requests trying to update same resource simultaneously

**Solution**: Pessimistic Locking
```python
def reserve_stock_with_lock(part_id: str, qty: int):
    """
    Lock part row while reading and updating.
    Prevents concurrent overwrites.
    """
    with db.begin_nested():
        # Acquire exclusive lock on part row
        part = db.query(Part).with_for_update().filter(
            Part.id == part_id
        ).first()
        
        # Check if sufficient stock
        if part.available_qty < qty:
            raise InsufficientStockError(f"Need {qty}, have {part.available_qty}")
        
        # Update atomically
        part.reserved_qty += qty
        part.available_qty -= qty
        db.commit()
    
    return {"reserved": qty}
```

### 4.3 Order of Operations: Stock vs. PO

**Scenario**: Stock update and PO creation happen simultaneously

**Ordering Rule**: Stock update FIRST, then PO creation
```python
# WRONG: Can cause race condition
def update_and_create_po(part_id, new_qty):
    create_po_if_needed(part_id)  # Checks stock level
    update_stock(part_id, new_qty)  # Then updates

# CORRECT: Ensures consistency
def update_and_create_po_correct(part_id, new_qty):
    update_stock(part_id, new_qty)  # Update first
    create_po_if_needed(part_id)  # Then check if PO needed
```

---

## 5. Timeout & Resource Limits

### 5.1 Request Timeout Policy
| Service | Timeout | Retry | Fallback |
|---------|---------|-------|----------|
| API calls | 30s | Yes | Return 504 error |
| Database queries | 10s | No | Log & alert |
| Webhook delivery | 5s | Yes (5x) | Send to DLQ |

### 5.2 Connection Pool Management
```python
# FastAPI Gateway
DATABASE_URL = "postgresql://user:pass@localhost/db"

# sqlalchemy engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Max connections in pool
    max_overflow=10,  # Additional connections beyond pool_size
    pool_timeout=30,  # Time to wait for connection
    pool_recycle=3600,  # Recycle connections after 1 hour
)
```

---

## 6. Graceful Degradation

### 6.1 Service Unavailability Handling

**InvenTree down**:
- ✅ Twenty CRM still accepts deals
- ❌ Stock reservations fail
- → Return 503 "Inventory service unavailable"

**ERPNext down**:
- ✅ InvenTree continues tracking stock
- ❌ PO creation fails
- → Queue event in DLQ; retry when ERPNext recovers

**Twenty CRM down**:
- ✅ InvenTree & ERPNext operational
- ❌ Deal-to-stock-reservation broken
- → Sales team notified; manual PO creation available

### 6.2 Fallback Logic
```python
def create_po_with_fallback(po_data):
    try:
        # Try primary ERPNext API
        return erpnext_api.create_po(po_data)
    except erpnext_api.ConnectionError:
        # Primary down, use fallback
        log_warning("ERPNext API failed, using DLQ fallback")
        dlq.add_event({
            "event_type": "po.creation_pending",
            "payload": po_data,
            "reason": "ERPNext unavailable"
        })
        return {
            "status": "queued",
            "message": "PO queued, will be created when ERPNext recovers",
            "dlq_event_id": dlq.last_event_id()
        }
```

---

## 7. Monitoring & Alerting

### 7.1 Error Rate Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API error rate | > 2% | > 5% |
| Webhook failures | > 1/hour | > 5/hour |
| DLQ queue depth | > 10 events | > 50 events |
| Retry exhaustion | > 3/hour | > 10/hour |

### 7.2 Zulip Alert Examples

```
[WARNING] High error rate detected
API Gateway error rate: 3.5% (threshold: 2%)
Affected endpoint: POST /api/inventree/reserve
Duration: 5 minutes
Action: Check error logs via SigNoz dashboard
```

```
[ERROR] DLQ queue growing
Current depth: 47 events (threshold: 50)
Oldest event: 2 hours old
Top error: "ERPNext API timeout"
Action required: Investigate ERPNext health
```

```
[INFO] Event successfully retried
Event ID: E456
Type: stock.on_hand_changed
Source: InvenTree
Retry attempt: 3/5
Status: SUCCESS
```

---

## 8. Testing Error Scenarios

### 8.1 Chaos Engineering Tests (Phase 3 & 4)

| Test | Method | Expected Behavior |
|------|--------|-------------------|
| **Service kill** | Stop Docker container | Events go to DLQ, recover on restart |
| **Network timeout** | Use toxiproxy to inject delay | Retry with backoff, eventually succeed/DLQ |
| **Invalid webhook payload** | Send malformed JSON | 400 error, logged, no retry |
| **Database connection loss** | Disconnect network | Circuit breaker trips, 503 returned |

### 8.2 Test Script
```python
# tests/integration/test_error_scenarios.py
import pytest
from unittest.mock import patch

def test_webhook_retry_on_timeout():
    """Verify webhook is retried when API times out"""
    with patch('requests.post', side_effect=Timeout()):
        result = handle_webhook({"event": "stock.changed"})
        # Should be queued for retry
        assert result["status"] == "queued"
        assert dlq.event_count() == 1

def test_idempotent_po_creation():
    """Verify PO not created twice with same idempotency key"""
    idempotency_key = "stock_BOLT001_reorder_123456"
    
    result1 = create_po_with_idempotency(po_data, idempotency_key)
    result2 = create_po_with_idempotency(po_data, idempotency_key)
    
    assert result1["status"] == "created"
    assert result2["status"] == "idempotent"
    assert result1["po_number"] == result2["po_number"]
    assert erpnext_api.call_count == 1  # Only one actual API call

def test_conflict_resolution_stock():
    """Verify InvenTree wins on stock mismatch"""
    sync_stock_between_services(inventree_qty=100, erpnext_qty=80)
    
    # ERPNext should be updated to match InvenTree
    assert erpnext_api.last_call["qty"] == 100
```

---

*Owner: RUFLO workflow-specialist + gstack maintainability specialist*  
*Next: Integration testing in Phase 3, Chaos testing in Phase 4*