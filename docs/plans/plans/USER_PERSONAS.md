# User Personas

## Persona 1: Inventory Manager (Primary)
- **Name**: Sarah
- **Role**: Inventory Manager
- **Goal**: Track stock levels, create POs, manage BOM
- **Pain Points**: Manual stock checks, lost parts, no QR scanning
- **Needs from System**:
  - QR code scanning for quick stock checks
  - Low-stock alerts in Zulip
  - Easy PO creation from InvenTree
  - BOM management interface
- **Access**: InvenTree (full), ERPNext (PO only), Homarr dashboard

## Persona 2: Finance Manager (Primary)
- **Name**: Mike
- **Role**: Finance Manager
- **Goal**: Track invoices, control spending, monitor margins
- **Pain Points**: Delayed invoicing, manual data entry, no visibility
- **Needs from System**:
  - Automated invoices from InvenTree POs
  - Real-time spend dashboard in Homarr
  - CRM deal-to-invoice flow
  - Audit trail for all transactions
- **Access**: ERPNext (full), Twenty CRM (read), Homarr dashboard

## Persona 3: Sales Representative (Primary)
- **Name**: Emily
- **Role**: Sales Rep
- **Goal**: Close deals, reserve stock, track orders
- **Pain Points**: Stock not reserved, customer data scattered
- **Needs from System**:
  - Quick stock checks via Zulip ("!stock bolts")
  - Reserve stock from Twenty CRM deal
  - Customer history in one view
  - Document upload (Paperless-ngx)
- **Access**: Twenty CRM (full), Zulip ChatOps, InvenTree (read), Paperless (upload)

## Persona 4: System Administrator (Secondary)
- **Name**: Alex
- **Role**: IT Admin
- **Goal**: Keep system running, monitor health, manage users
- **Pain Points**: No monitoring, manual restarts, unclear errors
- **Needs from System**:
  - SigNoz dashboards for all services
  - Easy user management (RBAC)
  - Automated backups
  - Clear rollback procedures
- **Access**: All services (admin), SigNoz (full), Caddy config

## Persona 5: Warehouse Worker (Secondary)
- **Name**: Joe
- **Role**: Warehouse Staff
- **Goal**: Receive goods, pick items, update stock
- **Pain Points**: Paper-based processes, slow scanning
- **Needs from System**:
  - Mobile-friendly InvenTree interface
  - QR/barcode scanning
  - Quick stock updates
  - Push notifications for incoming POs
- **Access**: InvenTree (mobile), Zulip (notifications), Homarr (mobile)

## Persona Summary Table
| Persona | Primary Need | Key Service | Frequency |
|----------|--------------|-------------|-----------|
| Sarah (Inventory) | Stock tracking | InvenTree | Daily |
| Mike (Finance) | Invoicing | ERPNext | Daily |
| Emily (Sales) | Deal closure | Twenty CRM | Daily |
| Alex (Admin) | System health | SigNoz | Weekly |
| Joe (Warehouse) | Stock updates | InvenTree | Hourly |