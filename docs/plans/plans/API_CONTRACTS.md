# API Contracts

Based on gstack-main `review/specialists/api-contract.md` patterns.

## Gateway API Endpoints

### Authentication
```json
POST /api/auth/login
Request: { "username": "string", "password": "string" }
Response: { "access_token": "string", "token_type": "Bearer", "expires_in": 3600 }
```

### InvenTree Proxy
```json
GET /api/inventree/parts
Headers: Authorization: Bearer {token}
Response: { "parts": [{ "id": 1, "name": "steel bolt", "stock": 150 }] }

POST /api/inventree/parts/{id}/reserve
Request: { "quantity": 10, "order_id": "SO-001" }
Response: { "success": true, "reserved": 10 }
```

### ERPNext Proxy
```json
POST /api/erpnext/purchase-orders
Headers: Authorization: Bearer {token}
Request: { "supplier": "ABC Corp", "items": [{ "part_id": 1, "qty": 100 }] }
Response: { "po_number": "PO-2026-001", "status": "draft" }
```

### Webhook Endpoints
```json
POST /api/webhooks/inventree
Headers: X-Webhook-Signature: {signature}
Request: { "event": "stock.on_hand_changed", "part_id": 1, "new_stock": 50 }
Response: { "received": true, "actions_triggered": ["check_reorder_point"] }
```

## Contract Rules
| Rule | Description |
|------|-------------|
| Versioning | All endpoints prefixed with `/api/v1/` |
| Idempotency | Include `Idempotency-Key` header for write operations |
| Pagination | Use `?page=1&limit=50` for list endpoints |
| Errors | Standard format: `{ "error": true, "code": "ERR_CODE", "message": "..." }` |
| Timestamps | All timestamps in ISO 8601 UTC |

## Event Contracts (Webhooks)
| Event | Source | Payload |
|-------|--------|---------|
| `stock.on_hand_changed` | InvenTree | `{ "part_id": 1, "old_stock": 100, "new_stock": 50 }` |
| `part.created` | InvenTree | `{ "part_id": 1, "name": "steel bolt", "category": "fasteners" }` |
| `po.received` | ERPNext | `{ "po_number": "PO-001", "items": [...] }` |
| `sale.created` | Twenty | `{ "deal_id": "DEAL-001", "items": [...] }` |
| `document.uploaded` | Paperless | `{ "doc_id": "DOC-001", "type": "invoice" }` |

## Data Sync Contracts
### Low Stock → Purchase Order
1. InvenTree emits `stock.on_hand_changed` (stock < reorder_point)
2. Gateway receives webhook
3. Gateway calls ERPNext API to create PO
4. ERPNext returns PO number
5. Gateway updates InvenTree with PO reference

### Sale → Stock Reservation
1. Twenty emits `sale.created`
2. Gateway receives webhook
3. Gateway calls InvenTree to reserve stock
4. InvenTree confirms reservation
5. Gateway updates Twenty with reservation status