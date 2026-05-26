# Global Search & Command Palette

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** Frontend / UX

---

## 1. Problem Statement

Aquerii has no cross-module search. To find an invoice, you navigate to Invoicing and manually scroll/filter. To find a contact, you go to CRM. As data grows, this becomes unusable. A global search command palette (⌘K / Ctrl+K) is now a baseline expectation for SaaS productivity tools and a key differentiator against simpler competitors.

---

## 2. Feature Scope

### Phase 1: Global Search
- Keyboard shortcut: `Ctrl+K` (Windows/Linux), `⌘K` (Mac)
- Click on search icon in header also opens it
- Full-text search across: Invoices, Sales Orders, Purchase Orders, CRM Companies, CRM Contacts, CRM Deals, Products, Tasks, Boards, Files
- Results grouped by type with icons
- Recent searches (last 10, persisted in localStorage)
- Click result → navigate to that record's detail view

### Phase 2: Command Palette Mode
- Type `/` to enter command mode
- Commands: `/new-invoice`, `/new-deal`, `/settings`, `/invite`, `/help`
- Filtered by RBAC (only show commands user has permission to perform)

---

## 3. Search Architecture

### 3.1 Option A: Database Full-Text Search (Phase 1)

Use PostgreSQL `tsvector` full-text search on the most important fields:

```sql
-- search_index view (or materialized view)
SELECT
  id,
  workspace_id,
  'invoice' AS type,
  invoice_number AS title,
  customer_name AS subtitle,
  CAST(total AS TEXT) AS meta,
  to_tsvector('english', invoice_number || ' ' || coalesce(customer_name, '')) AS tsv
FROM invoices WHERE deleted_at IS NULL

UNION ALL

SELECT id, workspace_id, 'contact', name, email, job_title,
  to_tsvector('english', name || ' ' || coalesce(email, '') || ' ' || coalesce(job_title, ''))
FROM crm_contacts WHERE deleted_at IS NULL

UNION ALL
-- ... (sales_orders, purchase_orders, crm_companies, crm_deals, products, tasks)
```

Search query:
```sql
SELECT * FROM search_index
WHERE workspace_id = $1
AND tsv @@ plainto_tsquery('english', $2)
ORDER BY ts_rank(tsv, plainto_tsquery('english', $2)) DESC
LIMIT 20;
```

### 3.2 Option B: Meilisearch (Phase 2 scale)

If query-time search becomes slow (>100ms) at scale, add Meilisearch:
```yaml
# docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:v1.7
  environment:
    MEILI_MASTER_KEY: "${MEILISEARCH_KEY}"
  volumes:
    - meilisearch_data:/meili_data
```

Laravel Scout + `php artisan scout:import "App\Models\Invoice"` etc.

**Phase 1 uses Option A (no new infrastructure dependency).**

---

## 4. Backend: Search Endpoint

```
GET /api/workspaces/{w}/search?q={query}&types[]=invoice&types[]=contact&limit=20
```

```php
// SearchController.php
public function search(Request $request, Workspace $workspace): JsonResponse {
    $q     = $request->input('q', '');
    $types = $request->input('types', []); // empty = search all
    $limit = min((int) $request->input('limit', 20), 50);
    
    if (strlen(trim($q)) < 2) {
        return response()->json(['results' => [], 'total' => 0]);
    }
    
    $results = app(GlobalSearchService::class)->search($workspace, $q, $types, $limit);
    
    return response()->json([
        'results' => $results,
        'total'   => count($results),
        'query'   => $q,
    ]);
}
```

```php
// GlobalSearchService.php
public function search(Workspace $workspace, string $q, array $types, int $limit): array {
    $searches = [
        'invoice'   => fn() => $this->searchInvoices($workspace, $q),
        'so'        => fn() => $this->searchSalesOrders($workspace, $q),
        'po'        => fn() => $this->searchPurchaseOrders($workspace, $q),
        'company'   => fn() => $this->searchCompanies($workspace, $q),
        'contact'   => fn() => $this->searchContacts($workspace, $q),
        'deal'      => fn() => $this->searchDeals($workspace, $q),
        'product'   => fn() => $this->searchProducts($workspace, $q),
        'task'      => fn() => $this->searchTasks($workspace, $q),
    ];
    
    $active = empty($types) ? $searches : array_intersect_key($searches, array_flip($types));
    
    $results = collect($active)
        ->flatMap(fn($fn) => $fn())
        ->sortByDesc('score')
        ->take($limit)
        ->values()
        ->all();
    
    return $results;
}

private function searchInvoices(Workspace $workspace, string $q): Collection {
    return Invoice::where('workspace_id', $workspace->id)
        ->where(function ($query) use ($q) {
            $query->where('invoice_number', 'ilike', "%{$q}%")
                  ->orWhere('customer_name', 'ilike', "%{$q}%");
        })
        ->limit(5)->get()
        ->map(fn($inv) => [
            'id'       => $inv->id,
            'type'     => 'invoice',
            'title'    => $inv->invoice_number,
            'subtitle' => $inv->customer_name,
            'meta'     => '$' . number_format($inv->total, 2) . ' · ' . ucfirst($inv->status),
            'url'      => "/invoicing/{$inv->id}",
            'score'    => str_starts_with($inv->invoice_number, $q) ? 2 : 1,
        ]);
}
```

Result shape (uniform across all types):
```ts
interface SearchResult {
    id: string
    type: 'invoice' | 'so' | 'po' | 'company' | 'contact' | 'deal' | 'product' | 'task'
    title: string       // primary display text
    subtitle?: string   // secondary text (customer name, email, etc.)
    meta?: string       // amount, status, date
    url: string         // where to navigate on click
    score: number       // for client-side sort
}
```

---

## 5. Frontend: CommandPalette Component

```tsx
// components/CommandPalette.tsx
// Opened via: Ctrl+K shortcut, or header search icon click
// State: managed in a global Zustand store (isOpen, query, results, history)
```

### 5.1 Layout

```
┌────────────────────────────────────────────────┐
│  🔍  Search Aquerii...                    ⌘K   │
├────────────────────────────────────────────────┤
│  Recent                                        │
│  📄  INV-2026-0041  ·  Acme Corp              │
│  👤  Jane Doe  ·  CFO at Acme Corp            │
├────────────────────────────────────────────────┤
│  Invoices                                      │
│  📄  INV-2026-0043  ·  TechStart Inc  $2,400  │
│  📄  INV-2026-0039  ·  BuilderCo     $800     │
├────────────────────────────────────────────────┤
│  Contacts                                      │
│  👤  John Acme  ·  john@acme.com              │
└────────────────────────────────────────────────┘
  ↑↓ navigate  ↵ open  esc close
```

### 5.2 Keyboard Navigation

- `ArrowUp` / `ArrowDown`: move highlighted result
- `Enter`: navigate to highlighted result's URL
- `Escape`: close palette; clear query if query non-empty, else close
- `Tab`: cycle through type filters
- Typing: debounced 200ms → API call

### 5.3 Type Filter Pills

Below the input, small pills to filter results:
`All` · `Invoices` · `Contacts` · `Deals` · `Tasks` · `Products`

Active pill highlighted with accent colour.

### 5.4 Recent Searches

Stored in `localStorage` under `search:recent:{workspaceId}`. Max 10 entries. Each entry: `{ query, result: SearchResult, timestamp }`. Shown when input is empty.

### 5.5 Empty States

- No query entered → show Recent searches
- Query < 2 chars → "Keep typing…"
- Query with no results → "No results for '{query}'" + suggestion to check spelling

### 5.6 Animation

```css
/* Overlay: fade in */
.palette-overlay {
  animation: fadeIn var(--duration-150) var(--ease-out);
}

/* Dialog: slide down + scale up from top */
.palette-dialog {
  animation: slideDown var(--duration-200) var(--ease-spring);
  transform-origin: top center;
}
```

---

## 6. Global Keyboard Shortcut Registration

```tsx
// hooks/useCommandPalette.ts
useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            togglePalette();
        }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
}, []);
```

Registered once at the root `App.tsx` level.

---

## 7. Header Integration

Replace the current header's search icon with:
```tsx
<button
  onClick={openPalette}
  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-input border border-glass-border text-text-tertiary hover:text-text-primary text-sm transition"
>
  <Search size={14} />
  <span>Search...</span>
  <kbd className="ml-2 text-xs bg-bg-elevated px-1.5 py-0.5 rounded">⌘K</kbd>
</button>
```

---

## 8. Phase 2: Command Mode

Type `/` to enter command mode. Available commands:

| Command | Action |
|---------|--------|
| `/new invoice` | Opens new invoice modal |
| `/new deal` | Opens new deal modal |
| `/new contact` | Opens new contact modal |
| `/new task` | Opens new task modal |
| `/settings` | Navigate to Settings |
| `/invite` | Open invite team member modal |
| `/help` | Open help/docs |
| `/switch workspace` | Show workspace switcher |

Commands filtered by RBAC — members only see commands they're permitted to trigger.

---

## 9. Open Questions

- Should search include file names / document content from uploaded files?
- Should search results include board item descriptions (potentially long, noisy)?
- Real-time streaming results vs single request with all types?

---

## 10. Success Criteria

- [ ] `GET /search` endpoint returns results across all 8 resource types
- [ ] Results deduplicated, sorted by score, limited to 20
- [ ] `CommandPalette` component renders with correct animations
- [ ] Keyboard shortcuts: `Ctrl+K` opens, `Escape` closes, `↑↓` navigates, `Enter` opens result
- [ ] Type filter pills work (filter by single type)
- [ ] Recent searches persisted in localStorage; shown when input is empty
- [ ] Header search button opens palette; shows `⌘K` hint
- [ ] Empty state messages for no query, short query, no results
- [ ] Tests: `GlobalSearchService` with query; search endpoint returns grouped results; recent history deduplication
