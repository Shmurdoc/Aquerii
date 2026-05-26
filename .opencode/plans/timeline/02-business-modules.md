# 02 — Group Beta: Business Modules

> **Lead Developer**: Business Modules
> **Responsibility**: CRM, Documents, Inventory, Automation, AI
> **Rule**: You own everything under `App/Modules/*`. No cross-module imports.
> **Testing Gate**: Every feature requires ALL existing tests passing PLUS new tests for the feature.

---

## ROLE CONTRACT

**You are Group Beta. You build the features that make Aquerii a real product.**

Your modules are what users pay for. CRM for sales teams. Documents for collaboration. Inventory for operations. Automation for efficiency. AI for intelligence.

**Your deliverables:**
- Every module has full CRUD with RLS, validation, policies
- AI endpoints work end-to-end (frontend → API → Python → LLM → response)
- Automation engine fires real automations (not skeletons)
- Sidecar proxies (InvenTree, Paperless) are complete and reliable

**Your non-negotiables:**
1. No cross-module imports (per R1)
2. Every module togglable via MODULE_* env flag
3. All endpoints idempotent (per R3)
4. Every AI call consumes credits (atomic Lua script)
5. Automation engine has tests before any trigger is enabled

---

## TASK LIST (Execute in Order)

### Phase B1: CRM Complete

**Prompt for AI Agent:**
```
Complete the CRM module in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- All CRUD routes exist for pipelines, stages, deals, contacts, companies
- All controllers exist: PipelineController, DealController, ContactController, CompanyController, StageController
- Models exist: CrmPipeline, CrmPipelineStage, CrmDeal, CrmContact, CrmCompany
- Resources exist: CrmContactResource, CrmDealResource
- But NO tests exist for any CRM endpoint
- The CRMControllers.php file may have duplicate/conflicting routes

Tasks:
1. **Audit and deduplicate routes** — Check routes/modules/crm.php for conflicts. CRMControllers.php may overlap with the individual controllers. Consolidate into the individual controllers (PipelineController, DealController, etc.) and remove CRMControllers.php or mark it as deprecated (add @deprecated docblock).

2. **Add workspace scoping** — Verify ALL CRM models have workspace_id in their migration and RLS policies. Add missing RLS if any table lacks it.

3. **Add stage position management** — Create POST /api/workspaces/{ws}/crm/stages/reorder that accepts an ordered array of stage IDs and updates their position column. This enables drag-and-drop pipeline reordering in the frontend.

4. **Add deal stage transition validation** — When a deal moves stages, validate the transition is valid per the pipeline configuration. Return 422 with code INVALID_TRANSITION if the move is illegal (e.g., skipping stages without proper config).

5. **Add contact deduplication on create** — Before creating a contact, check if a contact with the same email exists in the same workspace. If found, return 409 with code CONTACT_DUPLICATE and the existing contact ID.

6. **Write tests** — Create tests/Feature/Modules/CrmTest.php with:
   - Creates pipeline with stages
   - Creates deal in pipeline stage
   - Creates contact with company
   - Rejects duplicate contact email (409)
   - Rejects invalid stage transition (422)
   - Reorders stages successfully
   - Pipeline is workspace-isolated (404 for cross-workspace access)
   - Deletes pipeline cascades to stages (soft delete)

After all changes:
- composer test — ALL existing + 6+ new = 79+ passing
- E2E test: login, navigate to Inventory, create product, verify stock tracking
```

**MCP Tools (InventoryServer — new):**
Create `App\Mcp\Servers\InventoryServer` with:
- SearchProductsTool: full-text search across products
- TrackStockTool: get current stock level for a product
- GenerateBarcodeTool: generate EAN-13 barcode for a product
- AdjustStockTool: record stock movement (in/out/adjust)
- Resources: ProductResource, StockResource

**Acceptance Criteria:**
- [ ] Product images upload to MinIO
- [ ] Barcode generation (EAN-13) works
- [ ] Stock movement CRUD
- [ ] Low stock alert job runs on schedule
- [ ] InvenTree proxy updated with new endpoints
- [ ] InventoryServer with 4+ tools + 2 resources
- [ ] 6+ new tests
- [ ] All existing tests green

---

### Phase B2: Documents Complete (Collaborative + Scanned)

**Prompt for AI Agent:**
```
Complete the Documents module in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Collaborative documents: DocumentController, Document model with ydoc column (Y.js CRDT), DocumentController with CRUD
- Scanned documents: ScannedDocumentController, ScannedDocument model, ProcessDocumentOcr job
- Document folders: DocumentFolder model exists
- Frontend: DocumentsPage with Notes (collaborative docs) + Files (scanned docs) tabs
- DocumentPage.tsx for individual doc view
- PaperlessProxyController for paperless-ngx sidecar

Tasks:
1. **Complete Y.js sync** — The Document model has a ydoc (bytea) column for Y.js CRDT state. Ensure the realtime service at realtime:3000 handles Y.js document sync via WebSocket. The frontend should connect to realtime for collaborative editing, NOT poll via REST. Add the sync endpoint POST /api/workspaces/{ws}/documents/{doc}/sync that accepts Y.js updates and returns the merged state.

2. **Add document folder CRUD** — Create DocumentFolderController with CRUD for folders. Folders support nesting (parent_id). Documents can be moved between folders via PATCH /api/workspaces/{ws}/documents/{doc} with folder_id.

3. **Complete OCR pipeline** — The ProcessDocumentOcr job dispatches. Ensure it:
   - Downloads the file from MinIO
   - Calls the Python AI service at /internal/extract-text
   - Stores the extracted text in scanned_documents.ocr_text
   - Sets ocr_status to 'completed' or 'failed'
   - On failure, retries up to 3 times with exponential backoff

4. **Wire Paperless proxy** — The PaperlessProxyController likely needs auth. Ensure it passes the Sanctum token to Paperless-ngx. Add a feature flag for paperless integration. If disabled, scanned documents use the local system only.

5. **Add document search** — Register documents in Meilisearch (already configured in Group Alpha A4). Add a search-specific resource for documents that returns title, snippet, folder path.

6. **Write tests** — Create tests/Feature/Modules/DocumentTest.php:
   - Creates collaborative document
   - Creates scanned document via file upload
   - Lists documents (collaborative + scanned)
   - Moves document to folder
   - OCR completes on uploaded PDF (mock the AI service response)
   - Search returns document results

After all changes:
- composer test — ALL existing + 6+ new = 73+ passing
- E2E test: login, navigate to Documents, create document, verify it appears in list
```

**MCP Tools (DocumentServer — new):**
Create `App\Mcp\Servers\DocumentServer` with:
- SearchDocumentsTool: full-text search across documents
- CreateDocumentTool: create document with optional content and folder
- UpdateDocumentTool: update title/content
- AnalyzeDocumentTool: trigger OCR analysis on scanned document
- Resources: DocumentResource (list documents as context), FolderResource

**Acceptance Criteria:**
- [ ] Y.js collaborative editing works (2 browser tabs)
- [ ] Document folders CRUD
- [ ] OCR pipeline works (upload PDF → text extracted)
- [ ] Paperless search integration
- [ ] DocumentServer with 4+ tools + 2 resources
- [ ] 6+ new tests
- [ ] All existing tests green

---

### Phase B3: Inventory Complete (Native + Sidecar)

**Prompt for AI Agent:**
```
Complete the Inventory module in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Native inventory: InventoryCategoryController, ProductController, StockItemController with CRUD
- Models: InventoryCategory (tree), Product (with SKU/barcode), StockItem (lot/serial)
- InvenTree sidecar: InvenTreeProxyController (proxies to InvenTree Django API)
- InventoryServiceProvider registers all routes
- Inventory tables have RLS

Tasks:
1. **Add product image upload** — Product model should support image uploads (use spatie/laravel-medialibrary or direct MinIO). Accept multipart POST /api/workspaces/{ws}/inventory/products/{product}/image. Store in MinIO, return the URL.

2. **Add barcode generation** — When a product is created without a barcode, auto-generate a unique EAN-13 or Code128 barcode. Store as product.barcode. Expose GET /api/workspaces/{ws}/inventory/products/{product}/barcode that returns a PNG barcode image.

3. **Add stock movement history** — Create a stock_movements table (migration): product_id, quantity_change, reason (enum: receipt, sale, adjustment, transfer), reference_type, reference_id, user_id. Every stock item update creates a movement record. Expose GET /api/workspaces/{ws}/inventory/stock-items/{id}/movements.

4. **Add low stock alert** — Product model has reorder_point and reorder_quantity fields. Create a scheduled job `app:check-low-stock` that runs hourly, queries products where stock <= reorder_point, creates notifications for workspace admins. This wires into the notification system from Phase A5.

5. **Complete InvenTree proxy** — The InvenTreeProxyController routes /api/inventory/* to the InvenTree sidecar. Ensure:
   - Authentication passes (API key from .env)
   - Response transformation is correct (InvenTree uses different JSON structure)
   - Error handling: if InvenTree is down, return 503 with helpful message (not raw connection error)
   - Feature flag: MODULE_INVENTREE_INTERNAL=true uses native tables, false uses InvenTree proxy

6. **Write tests** — Create tests/Feature/Modules/InventoryTest.php:
   - Creates category with parent hierarchy
   - Creates product with SKU and barcode
   - Creates stock item with lot number
   - Uploads product image
   - Lists stock movements
   - Low stock alert fires correctly (test with mock)

After all changes:
- composer test — ALL existing + 8+ new = 67+ passing
- E2E test: login, navigate to CRM, create pipeline, add deal, verify transition
```

**MCP Tools (CrmServer — update existing from Phase A6):**
Add to CrmServer tools array:
- MergeContactsTool: merges two contacts, handling duplicate data
- ReorderPipelineStagesTool: reorder stages by position array
- ValidateStageTransitionTool: validates if a deal can transition between stages
- SearchDealsTool: full-text search across deal name, contact, company

**Acceptance Criteria:**
- [ ] Pipeline stage reorder endpoint working
- [ ] Stage transition validation working
- [ ] Contact dedup (email unique per workspace)
- [ ] Deal merge endpoint working
- [ ] 8+ new tests
- [ ] All existing tests green

---

### Phase B4: Automation Engine (Real Triggers + Actions)

**Prompt for AI Agent:**
```
Complete the Automation Engine in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Automation model exists (trigger_type, trigger_config JSON, actions JSON, is_active)
- AutomationRun model exists (execution log)
- AutomationController exists with CRUD
- AutomationEngine.php exists but has NO real triggers or actions — it's a skeleton
- Automation templates table exists with some preset templates
- AutomationPolicy exists for authorization

Tasks:
1. **Define trigger types** — In App/Modules/Automation/Enums/TriggerType.php:
   - ITEM_STATUS_CHANGED: fires when item.status changes to/from a value
   - ITEM_CREATED: fires when an item is created in a board
   - ITEM_ASSIGNED: fires when a user is assigned to an item
   - DUE_DATE_APPROACHING: fires at a configurable time before due_date
   - COMMENT_ADDED: fires when a comment is added to an item
   - BOARD_CREATED: fires when a new board is created

2. **Define action types** — In App/Modules/Automation/Enums/ActionType.php:
   - CHANGE_STATUS: set item.status to a configured value
   - ASSIGN_USER: assign a configured user to the item
   - SET_DUE_DATE: set item.due_date to a configured offset
   - SEND_NOTIFICATION: send an in-app notification to a user
   - CREATE_ITEM: create a new item in a configured board
   - CALL_WEBHOOK: POST to an external URL with event payload

3. **Implement trigger evaluator** — In AutomationEngine, add a method `evaluate(Automation $automation, array $context): bool` that:
   - Reads trigger_type and trigger_config
   - For ITEM_STATUS_CHANGED: checks if $context['item']['status'] matches trigger_config['from']/['to']
   - For ITEM_CREATED: always true (but check board_id matches if configured)
   - For DUE_DATE_APPROACHING: checks if item.due_date is within trigger_config['hours_before'] hours
   - Returns true if conditions match, false otherwise

4. **Implement action executor** — In AutomationEngine, add a method `execute(Automation $automation, array $context): AutomationRun` that:
   - Reads actions JSON array
   - For each action, executes the appropriate handler
   - CHANGE_STATUS: ItemService::update($item, ['status' => $action['value']])
   - SEND_NOTIFICATION: NotificationService::send($user, $message)
   - CALL_WEBHOOK: Http::post($action['url'], $payload) with timeout + retry
   - Logs each action result to AutomationRun.results (JSON)
   - On any action failure: marks run as 'failed', stops execution, logs error

5. **Wire triggers to domain events** — In BoardObserver, ItemObserver, CommentObserver: after the model saves, check if any automations match. Use EvaluateAutomationTriggers job (already exists) to process asynchronously. The job should:
   - Query active automations for the board/workspace
   - For each, call evaluate() with context
   - If true, call execute()
   - Create AutomationRun record

6. **Wire CALL_WEBHOOK action** — Add outbound webhook support. The action sends an HTTP POST to a configured URL with a JSON payload containing the event_type, source, and context. Handle failures: retry 3 times, then mark the run as 'failed'.

7. **Write tests** — Create tests/Feature/Modules/AutomationTest.php (MUST test the engine itself, not just CRUD):
   - Creates an automation with ITEM_STATUS_CHANGED trigger
   - Updates item status → verifies automation runs
   - Automation with condition does not fire when condition doesn't match
   - CALL_WEBHOOK action with mock HTTP endpoint
   - Invalid trigger type returns validation error
   - Automation is workspace-isolated
   - Automation template creates from preset

After all changes:
- composer test — ALL existing + 7+ new = 73+ passing
- THIS IS THE MOST IMPORTANT MODULE — DO NOT SKIP TESTS
```

**MCP Tools + n8n Integration:**

**AutomationServer (update existing from Phase A6):**
Add to AutomationServer tools array:
- CreateAutomationTool: create automation from template
- TestRuleTool: test a trigger condition against mock data
- ListTriggersTool: list available trigger types with descriptions
- ListActionsTool: list available action types with descriptions
- GetAutomationRunHistoryTool: get recent execution logs

**n8n sidecar (complex cross-system workflows):**
Add n8n container to docker-compose.yml:
```yaml
n8n:
  image: n8nio/n8n:latest
  ports: ["5678:5678"]
  environment:
    N8N_HOST: n8n.flowos.local
    N8N_PROTOCOL: https
    N8N_MCP_ENABLED: "true"
  volumes: [n8n_data:/home/node/.n8n]
```
n8n handles workflows that cross system boundaries:
- Deal won → create invoice in InvenTree → send Slack → update CRM
- Stock low → generate PO → email supplier → notify buyer
- Document scanned → OCR → classify → file in folder

**Acceptance Criteria:**
- [ ] 5 trigger types implemented and evaluatable
- [ ] 5 action types implemented and executable
- [ ] CALL_WEBHOOK action works with retry
- [ ] Automations fire from domain events (observers)
- [ ] AutomationRun logs every execution with results
- [ ] AutomationServer with 5 tools
- [ ] n8n sidecar configured with MCP enabled
- [ ] 7+ new tests including engine logic tests
- [ ] All existing tests green

---

### Phase B5: AI Module Complete

**Prompt for AI Agent:**
```
Complete the AI module in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- AIController exists with 11 endpoints (chat, summarize, score-deal, credits, generate task/doc/automation/flowchart, analyze, auto-tag, link-deal)
- All endpoints proxy to the Python FastAPI service at ai:8002
- Credits are consumed via atomic Lua script (tested in AICreditTest.php)
- The Python service has Gemini + Claude integration
- ChromaDB is running for RAG but not wired
- AI endpoints are throttle-limited to 30/hour per workspace

Tasks:
1. **Add streaming support** — The chat endpoint POST /api/workspaces/{ws}/ai/chat currently blocks for the full response. Convert to Server-Sent Events (SSE). The Laravel controller should:
   - Return a streamed response with Content-Type: text/event-stream
   - Pipe chunks from the Python AI service as they arrive
   - The frontend should use EventSource or fetch with ReadableStream
   - Credit should be consumed ONCE at the start (not per-chunk)

2. **Add context injection** — The chat endpoint should accept an optional context parameter. When provided, the AI service receives workspace context (board names, item count, member list) as system prompt injection. The context endpoint GET /api/workspaces/{ws}/ai/context returns:
   - Workspace name, member count, board count
   - Recent activity (last 10 activity_log entries)
   - This allows the LLM to answer workspace-specific questions

3. **Add fallback provider** — In the Python AI service, if Gemini returns an error, automatically retry with Claude. If both fail, return a cached response (if available and within TTL). Implement circuit breaker: after 5 consecutive failures to either provider, stop trying for 60 seconds and return a 503 with "AI service temporarily unavailable".

4. **Add prompt caching** — In the Laravel AI module, before calling the Python service, check Redis for a cached response. Cache key = SHA256(workspace_id + endpoint + input). TTL: 1 hour for deterministic endpoints (summarize, analyze, auto-tag), no cache for chat. This reduces API costs by ~60%.

5. **Add cost tracking** — Create ai_usage_log table: workspace_id, user_id, endpoint, model, prompt_tokens, completion_tokens, cost (USD), created_at. Every AI call logs to this table. Expose GET /api/workspaces/{ws}/ai/usage?from=&to= for workspace-level cost view.

6. **Add graceful credit exhaustion UX** — When credits are exhausted (the Lua script returns false), the current response is a 402. Instead, add a header X-Credits-Exhausted: true and return a structured response with upgrade_url pointing to the billing portal. The frontend should show a modal "You've run out of AI credits. Upgrade to continue using AI features." with a link to billing.

7. **Write tests** — Create tests/Feature/Modules/AITest.php (add to existing AICreditTest.php):
   - Chat endpoint returns SSE response with correct headers
   - Credit consumption works with streaming (consumed once at start)
   - Cache returns cached response for duplicate summarize requests
   - Context endpoint returns workspace data
   - Usage endpoint returns cost data
   - Graceful credit exhaustion shows upgrade_url

After all changes:
- composer test — ALL existing + 6+ new = 79+ passing
- Verify: POST /api/workspaces/{ws}/ai/chat with streaming
- Verify: duplicate summarize request returns cached (measured response time < 100ms)
```

**MCP Tools (AiServer — new):**
Create `App\Mcp\Servers\AiServer` with:
- ChatTool: send message to AI, receive streaming or full response
- SummarizeTool: summarize text/document content
- AutoTagTool: automatically tag content based on analysis
- AnalyzeDocumentTool: extract metadata from document
- LinkDealTool: link AI analysis to CRM deal
- Resources: CreditUsageResource (current credits, usage history)

**Acceptance Criteria:**
- [ ] Chat streaming via SSE works end-to-end
- [ ] Context injection provides workspace awareness
- [ ] Fallback provider (Gemini → Claude) works
- [ ] Prompt caching reduces duplicate requests
- [ ] Cost tracking in ai_usage_log table
- [ ] Graceful credit exhaustion with upgrade modal
- [ ] AiServer with 5 tools + 1 resource
- [ ] 6+ new tests passing
- [ ] All existing tests green

---

## GROUP BETA EXIT GATE

Before Group Beta work is considered complete:

| Check | Criteria | Verified By |
|-------|----------|-------------|
| CRM complete | Full CRUD + dedup + stage reorder + transition validation | 8+ new tests |
| CRM MCP tools | MergeContacts, ReorderStages, ValidateTransition tools | MCP Inspector |
| Documents complete | Y.js sync + folders + OCR pipeline + search | 6+ new tests |
| Documents MCP tools | DocumentServer with 4+ tools | MCP Inspector |
| Inventory complete | Images + barcodes + movements + low stock alerts + proxy | 6+ new tests |
| Inventory MCP tools | InventoryServer with 4+ tools | MCP Inspector |
| Automation complete | 5 triggers + 5 actions + webhook + engine tests | 7+ new tests |
| Automation MCP + n8n | AutomationServer tools + n8n sidecar configured | MCP Inspector + n8n health |
| AI complete | Streaming + caching + fallback + cost tracking + credits UX | 6+ new tests |
| AI MCP tools | AiServer with 5 tools + CreditUsageResource | MCP Inspector |
| PHPUnit green | 79+ tests, 0 failures | composer test |
| No regression | Existing 46 tests still pass | composer test |
| No cross-module imports | Modules don't import from other modules | Code review |

---

## MODULE ENV FLAGS REFERENCE

```env
# Feature flags for module toggling
MODULE_CRM_ENABLED=true
MODULE_DOCUMENTS_ENABLED=true
MODULE_INVENTORY_ENABLED=true
MODULE_INVENTREE_INTERNAL=true      # true=use native tables, false=InvenTree proxy
MODULE_AUTOMATION_ENABLED=true
MODULE_AI_ENABLED=true
MODULE_PAPERLESS_ENABLED=false      # feature flag, off by default
```
