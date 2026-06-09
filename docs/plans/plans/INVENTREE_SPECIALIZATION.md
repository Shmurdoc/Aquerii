# InvenTree Specialization: "Military-Grade" Inventory Hub

**Focus**: InvenTree's unique value proposition (QR codes, lifecycle traceability, BOM management)  
**Owner**: RUFLO intelligence-specialist + Team Beta  
**Skill Sources**: inventree-sdk 0.1.1, inventree Python module, Devine bulletproof-react

---

## 1. InvenTree Deployment Strategy

### 1.1 Docker-Compose Architecture
```yaml
# Expected structure from InvenTree official docs
inventree-web:       # Web UI
inventree-worker:    # Celery task queue (for async jobs)
inventree-redis:     # Cache for tasks
postgres:            # Inventory database
```

### 1.2 Environment Configuration Template
```bash
# .env for InvenTree
INVENTREE_DOCKER=true
INVENTREE_DB_ENGINE=postgresql
INVENTREE_DB_NAME=inventree_db
INVENTREE_DB_USER=inventree_user
INVENTREE_DB_PASSWORD=${INVENTREE_DB_PASSWORD}
INVENTREE_DB_HOST=postgres-main
INVENTREE_DB_PORT=5432

# External volume for media/attachments
INVENTREE_EXT_VOLUME=/data/inventree-media

# Security
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=inventree.mine-system.local

# Admin user (initial setup only, delete after first login)
INVENTREE_ADMIN_USER=admin
INVENTREE_ADMIN_PASSWORD=${INVENTREE_ADMIN_PASSWORD}
```

### 1.3 Initial Database Setup
```bash
# Execute during Phase 2, T2.3
docker compose run --rm inventree-server invoke update
docker compose run --rm inventree-server createsuperuser
```

---

## 2. QR Code Scanning & Barcoding (T2.3.ext1)

### 2.1 Hardware Integration
| Component | Purpose | Config |
|-----------|---------|--------|
| Barcode Scanner | Scan QR/1D codes | USB HID (human input device) |
| Mobile Browser | Mobile Inventory App | PWA or native webview |
| Desktop Browser | Warehouse Workstation | Standard Chrome/Firefox |

### 2.2 QR Code Types Supported
- **Part QR Code**: Encodes part ID for quick lookup
- **Stock Location QR Code**: Warehouse bin/shelf identifier
- **Batch/Serial QR Code**: Traceability per serial number

### 2.3 Setup Tasks (T2.3.ext1)
| Task | Description | Owner |
|------|-------------|-------|
| T2.3.ext1.1 | Enable barcode plugin in InvenTree admin | Team Beta |
| T2.3.ext1.2 | Configure QR code templates (part ID, batch, location) | RUFLO intelligence-specialist |
| T2.3.ext1.3 | Test QR scanning with USB scanner | Team Beta + Warehouse User |
| T2.3.ext1.4 | Create mobile-friendly stock check interface | Devine bulletproof-react |

### 2.4 Workflow: Stock Check via QR
```
Warehouse Worker
    ↓
[Open mobile app]
    ↓
[Scan part QR code] → InvenTree API /api/parts/{id}
    ↓
[Returns stock, location, reorder point]
    ↓
[If stock < reorder: Flag for PO]
    ↓
[Gateway webhook triggered] → Creates ERPNext PO automatically
```

---

## 3. Lifecycle Traceability (T2.3.ext2)

### 3.1 Part Lifecycle States
| State | Meaning | Transition | Owner |
|-------|---------|-----------|-------|
| **ACTIVE** | In use, stocked | From ANY | Inventory Mgr |
| **OBSOLETE** | No longer used | FROM ACTIVE | Inventory Mgr |
| **PROTOTYPE** | R&D phase | Auto from creation | R&D |
| **ARCHIVED** | Historical record | FROM OBSOLETE or PROTOTYPE | Inventory Mgr |

### 3.2 Audit Trail (Immutable Log)
**Every state change logged**:
- Timestamp (ISO 8601 UTC)
- User who made change
- Old state → New state
- Reason code
- Related documents (POs, sales orders)

**Access**: Visible via InvenTree web UI + API `/api/parts/{id}/audit`

### 3.3 Setup Tasks (T2.3.ext2)
| Task | Description | Owner |
|------|-------------|-------|
| T2.3.ext2.1 | Configure part lifecycle states in InvenTree | RUFLO intelligence-specialist |
| T2.3.ext2.2 | Enable audit logging for all state changes | gstack security-auditor |
| T2.3.ext2.3 | Create lifecycle transition approval rules | Team Beta |
| T2.3.ext2.4 | Setup audit report exports (CSV/PDF) | Devine bulletproof-react |

---

## 4. Bill of Materials (BOM) Management (T2.3.ext3)

### 4.1 BOM Structure
```
Assembly: Main PCB (Part ID: MP-001)
  ├─ Component: CPU (Part ID: CPU-001) x1
  │   └─ Supplier: Intel, Lead time: 4 weeks
  ├─ Component: RAM (Part ID: RAM-001) x2
  │   └─ Supplier: Samsung, Lead time: 2 weeks
  └─ Sub-assembly: Power Module (Part ID: PSU-001) x1
      ├─ Component: Capacitor (Part ID: CAP-001) x10
      └─ Component: Inductor (Part ID: IND-001) x2
```

### 4.2 BOM Features
| Feature | Purpose | Example |
|---------|---------|---------|
| **Versioning** | Track BOM history | V1.0 → V1.1 (capacitor upgrade) |
| **Substitutes** | Alternative parts | CPU-001 OR CPU-002 (equivalent) |
| **Supplier Selection** | Optimize costs/lead times | Prefer Supplier A if in stock |
| **Stock Availability** | Check if assembly can be built | "5 units available" |
| **Lead Time Calculation** | PO timing | Max component lead time = 4 weeks |

### 4.3 Setup Tasks (T2.3.ext3)
| Task | Description | Owner |
|------|-------------|-------|
| T2.3.ext3.1 | Import existing BOMs from legacy system | gstack data-migration specialist |
| T2.3.ext3.2 | Configure BOM versioning scheme | RUFLO intelligence-specialist |
| T2.3.ext3.3 | Setup supplier links per component | Team Beta + Purchasing |
| T2.3.ext3.4 | Create BOM availability checker (UI) | Devine bulletproof-react |

### 4.4 InvenTree SDK: BOM Operations
```python
# Using inventree-sdk 0.1.1
from inventree.part import Part, BomItem

# Load parent assembly
pcb = Part.objects.get(pk='MP-001')

# Get BOM
bom_items = BomItem.objects.filter(part=pcb)

# Check if assembly can be built
for bom_item in bom_items:
    available = bom_item.part.get_stock_count()
    required = bom_item.quantity
    if available < required:
        print(f"Insufficient {bom_item.part.name}: need {required}, have {available}")
```

---

## 5. Supplier Management (T2.3.ext4)

### 5.1 Supplier Information
| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Supplier ID | Supplier-001 |
| **Part Link** | Maps to parts supplied | {part_id: qty, lead_time: days} |
| **Lead Time** | Days to deliver | 14 days |
| **Minimum Order** | MOQ | 100 units |
| **Price** | Cost per unit | $5.00 |
| **Contact** | Procurement contact | email, phone |

### 5.2 Purchase Order Generation
**Automatic PO creation from InvenTree to ERPNext**:
- Stock falls below reorder point
- Webhook triggered to Gateway
- Gateway creates ERPNext PO with supplier details
- InvenTree marked with PO number

### 5.3 Setup Tasks (T2.3.ext4)
| Task | Description | Owner |
|------|-------------|-------|
| T2.3.ext4.1 | Import suppliers into InvenTree | Team Beta |
| T2.3.ext4.2 | Link suppliers to parts (MOQ, lead time, cost) | Purchasing Mgr |
| T2.3.ext4.3 | Setup preferred supplier rules | Team Beta + RUFLO intelligence-specialist |
| T2.3.ext4.4 | Create supplier performance dashboard | Devine bulletproof-react |

---

## 6. Stock Level Rules & Reorder Automation (T2.3.ext5)

### 6.1 Stock Rules Per Part
| Rule | Purpose | Example |
|------|---------|---------|
| **Reorder Point** | When to trigger PO | Stock < 50 units → Create PO |
| **Reorder Quantity** | How much to order | Order 100 units (MOQ-based) |
| **Maximum Stock** | Upper limit | Don't order if stock > 500 |
| **Safety Stock** | Buffer | Keep 20 units extra |

### 6.2 Reorder Automation Flow
```
Inventory System (Continuous monitoring)
    ↓
[Compare current stock to reorder point]
    ↓
[Stock < Reorder Point?]
    ├─ YES: Emit `stock.on_hand_changed` event
    │   └─ Gateway webhook receives
    │       └─ Create ERPNext PO
    │           └─ Update InvenTree with PO ref
    └─ NO: Continue monitoring
```

### 6.3 Setup Tasks (T2.3.ext5)
| Task | Description | Owner |
|------|-------------|-------|
| T2.3.ext5.1 | Define stock rules per part category | Inventory Mgr + RUFLO intelligence-specialist |
| T2.3.ext5.2 | Configure reorder automation in InvenTree | Team Beta |
| T2.3.ext5.3 | Setup dashboard showing stock status (red/yellow/green) | Devine bulletproof-react |
| T2.3.ext5.4 | Test automatic PO creation end-to-end | Team Beta + Team Gamma |

---

## 7. Integration with Gateway & ERPNext

### 7.1 InvenTree → Gateway (Webhooks)
| Event | Payload | Handler |
|-------|---------|---------|
| `stock.on_hand_changed` | `{part_id, old_qty, new_qty, reorder_point}` | Check if reorder needed |
| `part.created` | `{part_id, name, category}` | Index in search |
| `po.received` | `{po_number, items}` | Update stock |

### 7.2 Gateway → ERPNext (API Call)
```python
# On receiving `stock.on_hand_changed` webhook:
if new_qty < reorder_point:
    # Call ERPNext API to create PO
    po_data = {
        "doctype": "Purchase Order",
        "supplier": supplier_id,
        "items": [
            {
                "item_code": part_id,
                "qty": reorder_qty,
                "rate": supplier_price
            }
        ]
    }
    po = create_po_in_erpnext(po_data)
    
    # Update InvenTree with PO reference
    update_part_po_reference(part_id, po.name)
```

### 7.3 Setup Tasks (Phase 3, T3.5)
| Task | Description | Owner |
|------|-------------|-------|
| T3.5.1 | Configure InvenTree EventMixin webhooks | RUFLO intelligence-specialist + RUFLO workflow-specialist |
| T3.5.2 | Implement Gateway webhook receiver for InvenTree events | RUFLO workflow-specialist |
| T3.5.3 | Build ERPNext API sync logic in Gateway | gstack api-contract specialist |
| T3.5.4 | Test end-to-end: Low stock → PO created | Team Beta + Team Gamma |

---

## 8. Mobile App & Warehouse Interface

### 8.1 Mobile Stock Check Interface
**Built with**: Devine bulletproof-react (PWA pattern)

**Features**:
- Scan QR code → Displays part info
- Quick location lookup
- One-tap reorder notification
- Offline mode (sync when reconnected)

**Technology**:
```
React (bulletproof-react patterns)
  ├─ React Query (data fetching)
  ├─ Zustand (state management)
  └─ PWA (offline capability)
```

### 8.2 Setup Task (T4.2.ext)
- T4.2.ext1: Build mobile-responsive InvenTree interface
- T4.2.ext2: Implement offline stock lookup cache
- T4.2.ext3: Connect to Zulip for push notifications

---

## 9. Success Criteria: InvenTree Phase 2

**By end of Phase 2 (Week 7)**:
- ✅ InvenTree running, web UI accessible
- ✅ Initial parts & BOMs loaded
- ✅ Stock levels visible
- ✅ Supplier information configured
- ✅ QR code scanning tested (USB scanner)
- ✅ Audit trail enabled
- ✅ Lifecycle states configured
- ✅ Reorder rules defined (not yet automated)

**By end of Phase 3 (Week 9)**:
- ✅ Webhooks triggering on stock changes
- ✅ Automatic PO creation in ERPNext
- ✅ Stock reservation from Twenty CRM sales
- ✅ BOM availability calculator working
- ✅ Mobile interface responsive

**By end of Phase 4 (Week 12)**:
- ✅ Homarr tile showing real-time stock status
- ✅ Zulip alerts on low stock
- ✅ HuixiangDou answering "What's the stock of X?"
- ✅ Excalidraw diagrams showing BOM structure

---

## 10. Skills Required (Mapped to Source Projects)

| Skill | Source | Task |
|-------|--------|------|
| InvenTree SDK 0.1.1 | RUFLO intelligence-specialist | T2.3, T3.5 |
| Python module `inventree` | RUFLO intelligence-specialist | T2.3, T3.5 |
| QR code library | RUFLO browser-agent (QR scanning) | T2.3.ext1 |
| React PWA patterns | Devine bulletproof-react | T4.2.ext |
| Data import/ETL | gstack data-migration specialist | T2.3.ext3 |
| Webhook handlers | RUFLO workflow-specialist | T3.5.1 |
| API contracts | gstack api-contract specialist | T3.5.2 |

---

*Owner: RUFLO intelligence-specialist + Team Beta*  
*Reference: InvenTree docs at https://inventree.org/api*  
*SDK: https://github.com/inventree/inventree-python*