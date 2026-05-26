# Company Branding & White-Label System

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** Multi-tenant Branding / Identity

---

## 1. Purpose & Context

Aquerii is a **multi-tenant project management, task tracking, team collaboration, and workflow automation platform** — highly customisable for complex dev, QA, and business processes. Each company (workspace) that subscribes should feel like the platform is *theirs*. Their employees should see the company logo when they log in, their brand colour in the UI, and their logo on every document, email, and printed artefact the platform produces.

This plan covers the complete branding lifecycle:
- Logo upload and storage
- Subdomain-based pre-login branding
- In-app logo display (sidebar, header, dashboard)
- Email branding (replacing hard-coded Aquerii header)
- PDF/document branding with 3 selectable layout templates
- Initials-avatar fallback when no logo is uploaded

---

## 2. Current State (Audit Findings)

| Field | Exists? | Status |
|-------|---------|--------|
| `workspaces.logo_url` | ✅ TEXT column | Never written — no upload endpoint |
| `workspaces.color` | ✅ STRING(20) | Written by `PATCH /workspaces/{id}` |
| `workspaces.settings` (JSONB) | ✅ Cast to array | Free-form, no defined keys yet |
| `WorkspaceResource` exposes logo | ❌ | `logo_url` omitted from API response |
| Logo upload endpoint | ❌ | Does not exist |
| Logo in sidebar/header | ❌ | Shows emoji icon only |
| Login page branding | ❌ | Hard-coded Aquerii branding |
| Email branding | ❌ | Hard-coded `<h1>Aquerii</h1>` in both templates |
| PDF template branding | ❌ | No PDFs exist yet (see DOCUMENT_TEMPLATES.md) |

**No new database columns are required.** All required fields already exist.

---

## 3. What Gets Built

### 3.1 Logo Upload & Storage

**Endpoint:** `POST /api/workspaces/{w}/logo`
- Accepts: `image` (JPEG/PNG/WebP/SVG, max 2MB)
- Validates: MIME type, file size, min dimensions 64×64px, max 2000×2000px
- Stores to: `s3://bucket/workspaces/{workspace_id}/logo.{ext}` (replaces any previous)
- Generates a public CDN URL (via CloudFront or direct S3 public read)
- Updates `workspaces.logo_url` with the new URL
- Returns: `{ logo_url: "https://..." }`

**Endpoint:** `DELETE /api/workspaces/{w}/logo`
- Removes object from S3
- Sets `workspaces.logo_url = null`

```php
// WorkspaceLogoController.php
public function store(Request $request, Workspace $workspace): JsonResponse {
    $this->authorize('update', $workspace);

    $request->validate([
        'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048', 'dimensions:min_width=64,min_height=64,max_width=2000,max_height=2000'],
    ]);

    // Delete old logo from S3 if present
    if ($workspace->logo_url) {
        $oldPath = parse_url($workspace->logo_url, PHP_URL_PATH);
        Storage::disk('s3')->delete(ltrim($oldPath, '/'));
    }

    $ext  = $request->file('image')->getClientOriginalExtension();
    $path = "workspaces/{$workspace->id}/logo.{$ext}";
    Storage::disk('s3')->put($path, file_get_contents($request->file('image')), 'public');

    $url = Storage::disk('s3')->url($path);
    $workspace->update(['logo_url' => $url]);

    $this->audit('workspace.logo_uploaded', $workspace);

    return response()->json(['logo_url' => $url]);
}

public function destroy(Workspace $workspace): JsonResponse {
    $this->authorize('update', $workspace);

    if ($workspace->logo_url) {
        $path = parse_url($workspace->logo_url, PHP_URL_PATH);
        Storage::disk('s3')->delete(ltrim($path, '/'));
        $workspace->update(['logo_url' => null]);
    }

    $this->audit('workspace.logo_removed', $workspace);

    return response()->json(['logo_url' => null]);
}
```

**Routes:**
```php
Route::post('workspaces/{workspace}/logo', [WorkspaceLogoController::class, 'store']);
Route::delete('workspaces/{workspace}/logo', [WorkspaceLogoController::class, 'destroy']);
```

---

### 3.2 WorkspaceResource — Expose Branding Fields

Update `WorkspaceResource` to include all branding fields in every workspace API response:

```php
// WorkspaceResource.php
public function toArray(Request $request): array {
    return [
        'id'           => $this->id,
        'name'         => $this->name,
        'slug'         => $this->slug,
        'plan'         => $this->plan,
        'owner_id'     => $this->owner_id,
        'member_count' => $this->member_count,
        // Branding
        'logo_url'     => $this->logo_url,
        'cover_url'    => $this->cover_url,
        'color'        => $this->color,
        'icon'         => $this->icon,
        // Settings (include doc_template)
        'settings'     => $this->settings ?? [],
        'created_at'   => $this->created_at,
    ];
}
```

---

### 3.3 Workspace Settings: Document Template Choice

Store in `workspace.settings` JSONB:
```json
{
  "doc_template": "modern",
  "company_name": "Acme Corp",
  "company_address": "1 Main St, Johannesburg",
  "vat_number": "VAT-123456",
  "bank_details": "FNB · 62123456 · Branch 201909",
  "invoice_terms": "Payment due within 30 days.",
  "payment_terms_days": 30
}
```

`doc_template` values: `"modern"` | `"classic"` | `"minimal"` (default: `"modern"`)

---

### 3.4 Public Branding Endpoint (Subdomain Pre-Login)

**Endpoint:** `GET /api/branding` — **public, no authentication required**

This endpoint is called by the frontend on every page load before the user authenticates. It resolves the current hostname to a workspace and returns branding data.

```php
// BrandingController.php
public function show(Request $request): JsonResponse {
    $host      = $request->getHost(); // e.g. acme.aquerii.com
    $subdomain = explode('.', $host)[0]; // 'acme'

    // Look up workspace by slug matching subdomain
    $workspace = Workspace::where('slug', $subdomain)
        ->orWhere('custom_domain', $host)
        ->select(['id', 'name', 'slug', 'logo_url', 'color', 'icon', 'settings'])
        ->first();

    if (!$workspace) {
        // Return Aquerii default branding
        return response()->json([
            'workspace'  => null,
            'name'       => 'Aquerii',
            'logo_url'   => null,
            'color'      => '#7c3aed',
            'is_default' => true,
        ])->setTtl(300); // cache 5 min
    }

    return response()->json([
        'workspace'    => $workspace->id,
        'name'         => $workspace->name,
        'logo_url'     => $workspace->logo_url,
        'color'        => $workspace->color ?? '#7c3aed',
        'icon'         => $workspace->icon,
        'doc_template' => $workspace->settings['doc_template'] ?? 'modern',
        'is_default'   => false,
    ])->header('Cache-Control', 'public, max-age=300');
}
```

**Route:** `Route::get('/branding', [BrandingController::class, 'show']);` (outside auth middleware group)

---

## 4. Frontend: In-App Branding

### 4.1 Branding Context

A React context loaded at app boot:

```tsx
// contexts/BrandingContext.tsx
interface BrandingData {
    workspaceId: string | null
    name: string
    logoUrl: string | null
    color: string
    icon: string | null
    isDefault: boolean
    docTemplate: 'modern' | 'classic' | 'minimal'
}

// On app mount: fetch GET /api/branding
// Store in context + apply CSS var:
document.documentElement.style.setProperty('--color-accent', branding.color)
```

This means `--color-accent` and all derived tokens (`--color-accent-hover`, `--color-accent-light`, `--color-accent-glow`) automatically update to the company's brand colour across the entire UI.

### 4.2 Login Page — Subdomain Branding

```tsx
// AuthLayout.tsx / LoginPage.tsx
// On mount: fetch /api/branding
// If !isDefault:
//   Replace <h1>Aquerii</h1> with <img src={logoUrl} alt={name} />
//   Apply color to the "Sign In" button via --color-accent
//   Show "Welcome to {name}" as the heading

// Example:
{branding.isDefault ? (
    <div className="logo-lockup">
        <AqueriiLogo />
        <span>Aquerii</span>
    </div>
) : branding.logoUrl ? (
    <img src={branding.logoUrl} alt={branding.name} className="h-12 object-contain" />
) : (
    <InitialsAvatar name={branding.name} color={branding.color} size={48} />
)}
<h1>Welcome to {branding.name}</h1>
```

### 4.3 Sidebar / App Header Logo

Replace the current emoji-icon workspace display in the sidebar header:

```tsx
// AppLayout sidebar header
<div className="workspace-header flex items-center gap-3 p-4 border-b border-glass-border">
    {workspace.logo_url ? (
        <img
            src={workspace.logo_url}
            alt={workspace.name}
            className="h-8 w-8 rounded-lg object-contain bg-bg-elevated"
        />
    ) : (
        <InitialsAvatar name={workspace.name} color={workspace.color} size={32} />
    )}
    {!sidebarCollapsed && (
        <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{workspace.name}</p>
            <p className="text-xs text-text-tertiary">{workspace.plan}</p>
        </div>
    )}
</div>
```

When the sidebar is collapsed to icon-rail mode, only the logo/avatar is shown (32×32).

### 4.4 InitialsAvatar Component

Used everywhere a logo is absent:

```tsx
// components/shared/InitialsAvatar.tsx
interface Props {
    name: string         // e.g. "Acme Corp" → "AC"
    color?: string       // hex, used as background
    size?: number        // px, default 32
    className?: string
    shape?: 'circle' | 'rounded' // default: 'rounded' for workspace, 'circle' for contacts
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function getContrastColor(hex: string): string {
    // Returns '#fff' or '#111' based on luminance
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#111' : '#fff';
}

export function InitialsAvatar({ name, color = '#7c3aed', size = 32, className, shape = 'rounded' }: Props) {
    const initials   = getInitials(name);
    const bg         = color;
    const textColor  = getContrastColor(color);
    const radius     = shape === 'circle' ? '50%' : '8px';

    return (
        <div
            className={className}
            style={{
                width: size, height: size, borderRadius: radius,
                background: bg, color: textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
                userSelect: 'none',
            }}
            aria-label={name}
        >
            {initials}
        </div>
    );
}
```

Used in: sidebar workspace header, login page, email previews, PDF documents, contact/company cards throughout CRM.

---

## 5. Settings > General: Logo Upload UI

```tsx
// components/settings/GeneralTab.tsx — Logo section
<section className="settings-section">
    <h3>Workspace Logo</h3>
    <p className="text-text-secondary text-sm">
        Shown in the sidebar, on login, in emails, and on all printed documents.
        JPEG, PNG, WebP or SVG · Max 2MB · Min 64×64px
    </p>

    <div className="flex items-center gap-6 mt-4">
        {/* Current logo preview */}
        <div className="logo-preview w-20 h-20 rounded-xl border border-glass-border bg-bg-elevated flex items-center justify-center overflow-hidden">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
                <InitialsAvatar name={workspaceName} color={brandColor} size={48} />
            )}
        </div>

        <div className="flex flex-col gap-2">
            {/* Hidden file input triggered by button */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Spinner size={14} /> : <Upload size={14} />}
                {logoUrl ? 'Replace Logo' : 'Upload Logo'}
            </Button>
            {logoUrl && (
                <Button variant="ghost" className="text-red-400" onClick={handleRemoveLogo} disabled={uploading}>
                    <Trash2 size={14} /> Remove Logo
                </Button>
            )}
        </div>
    </div>
</section>
```

On file select:
1. Client-side validation: type, size
2. Show preview using `URL.createObjectURL`
3. POST `FormData` to `/api/workspaces/{id}/logo`
4. On success: update workspace context `logo_url`; show success toast

---

## 6. Settings > Documents: Template Selector

```tsx
// In Settings > Documents tab (new sub-route: /settings/documents)
<section>
    <h3>Document Layout Template</h3>
    <p className="text-sm text-text-secondary">
        Applied to all PDFs: invoices, quotes, purchase orders, delivery notes, and receipts.
    </p>

    <div className="grid grid-cols-3 gap-4 mt-4">
        {(['modern', 'classic', 'minimal'] as const).map(tpl => (
            <button
                key={tpl}
                onClick={() => setDocTemplate(tpl)}
                className={`template-card rounded-xl border-2 p-4 text-left transition ${
                    docTemplate === tpl ? 'border-accent bg-accent-light' : 'border-glass-border'
                }`}
            >
                <TemplatePreviewThumbnail template={tpl} color={brandColor} />
                <p className="mt-3 font-semibold capitalize">{tpl}</p>
                <p className="text-xs text-text-secondary mt-1">
                    {tpl === 'modern'  && 'Clean sans-serif, accent band, right-aligned totals'}
                    {tpl === 'classic' && 'Formal layout, horizontal rules, centred header'}
                    {tpl === 'minimal' && 'White space focused, subtle grid, small typography'}
                </p>
            </button>
        ))}
    </div>
</section>
```

`TemplatePreviewThumbnail` renders a tiny static SVG mockup of each template style.

---

## 7. Email Branding

All Mailable classes receive the workspace and pass branding to their Blade templates.

### 7.1 Updated Mailable Base Pattern

```php
// app/Mail/WorkspaceMail.php (abstract base)
abstract class WorkspaceMail extends Mailable {
    public function __construct(protected Workspace $workspace) {}

    protected function brandingData(): array {
        return [
            'workspaceName' => $this->workspace->name,
            'logoUrl'       => $this->workspace->logo_url,
            'brandColor'    => $this->workspace->color ?? '#7c3aed',
            'icon'          => $this->workspace->icon,
        ];
    }
}
```

### 7.2 Email Master Layout `resources/views/emails/layout.blade.php`

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 0; background: #f4f4f8; font-family: Inter, -apple-system, sans-serif; }
  .email-wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .email-header { background: {{ $brandColor }}; padding: 28px 32px; text-align: center; }
  .email-header img { max-height: 48px; max-width: 200px; object-fit: contain; }
  .email-header .initials-avatar {
    display: inline-flex; align-items: center; justify-content: center;
    width: 56px; height: 56px; border-radius: 12px;
    background: rgba(255,255,255,0.2); color: #fff;
    font-size: 20px; font-weight: 700;
  }
  .email-header .workspace-name { color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 8px; }
  .email-body  { padding: 32px; color: #333; line-height: 1.6; }
  .email-footer { padding: 16px 32px; background: #f9f9fb; border-top: 1px solid #eee; font-size: 11px; color: #aaa; text-align: center; }
  .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; background: {{ $brandColor }}; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="email-header">
    @if($logoUrl)
      <img src="{{ $logoUrl }}" alt="{{ $workspaceName }}">
    @else
      <div class="initials-avatar">{{ strtoupper(substr($workspaceName, 0, 1)) }}{{ strtoupper(substr(strrchr($workspaceName, ' ') ?: '', 1, 1)) }}</div>
    @endif
    <div class="workspace-name">{{ $workspaceName }}</div>
  </div>
  <div class="email-body">
    @yield('body')
  </div>
  <div class="email-footer">
    &copy; {{ date('Y') }} {{ $workspaceName }}. Powered by Aquerii.
  </div>
</div>
</body>
</html>
```

### 7.3 Updated `WorkspaceInvitation` Mailable

```php
// Replace view call to use layout + pass branding
return $this->subject("You're invited to join {$this->workspace->name}")
    ->view('emails.workspace-invitation')
    ->with(array_merge($this->brandingData(), [
        'inviterName'   => $this->inviter->name,
        'inviteUrl'     => $this->inviteUrl,
        'workspaceName' => $this->workspace->name,
    ]));
```

All existing Mailable classes (`WorkspaceInvitation`, `BillingConfirmation`) and future ones (`InvoiceMail`, `MeetingInvite`, `ExpenseApproval`) use the shared layout.

---

## 8. PDF Branding: Three Templates

See `DOCUMENT_TEMPLATES.md` for full Blade template code. Summary of how branding integrates:

### 8.1 Shared Variables Passed to Every PDF Template

```php
// DocumentPdfService::generate()
$html = view("pdf.{$layout}.{$type}", [
    'document'    => $document,
    'workspace'   => $workspace,
    'logoUrl'     => $workspace->logo_url,
    'brandColor'  => $workspace->color ?? '#7c3aed',
    'settings'    => $workspace->settings ?? [],
    'layout'      => $layout, // 'modern' | 'classic' | 'minimal'
])->render();
```

where `$layout = $workspace->settings['doc_template'] ?? 'modern'`.

### 8.2 Initials Avatar in PDFs

When `$logoUrl` is null, render a SVG initials badge inline in the Blade template:

```blade
{{-- resources/views/pdf/partials/logo.blade.php --}}
@if($logoUrl)
    <img src="{{ $logoUrl }}" alt="{{ $settings['company_name'] ?? $workspace->name }}" style="max-height:56px; max-width:180px; object-fit:contain;">
@else
    @php
        $words    = explode(' ', trim($settings['company_name'] ?? $workspace->name));
        $initials = strtoupper(substr($words[0], 0, 1) . (isset($words[1]) ? substr($words[1], 0, 1) : ''));
        $bg       = $brandColor;
        $fg       = '#ffffff';
    @endphp
    <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
        <rect width="56" height="56" rx="10" fill="{{ $bg }}"/>
        <text x="28" y="36" text-anchor="middle" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="{{ $fg }}">{{ $initials }}</text>
    </svg>
@endif
```

### 8.3 Three PDF Template Directory Structure

```
resources/views/pdf/
├── partials/
│   ├── logo.blade.php          ← shared logo/avatar partial
│   └── totals.blade.php        ← shared totals block
├── modern/
│   ├── layout.blade.php        ← Modern master layout
│   ├── invoice.blade.php
│   ├── quote.blade.php
│   ├── sales-order.blade.php
│   ├── purchase-order.blade.php
│   ├── grn.blade.php
│   ├── receipt.blade.php
│   └── credit-note.blade.php
├── classic/
│   └── layout.blade.php + all 7 document types
└── minimal/
    └── layout.blade.php + all 7 document types
```

### 8.4 Template Visual Differences

**Modern** (default):
- Full-width accent colour band at top (uses `$brandColor`)
- Logo in top-left of accent band; document type + number in top-right
- Table headers: `background: $brandColor`, white text
- Totals block: right-aligned, accent border-left

**Classic**:
- White background with centred company logo at top
- Document type in large serif-style (Georgia or similar fallback) uppercase text
- Horizontal rule dividers between sections
- Table headers: light grey background, dark text, bottom border only
- Totals block: right-aligned plain box

**Minimal**:
- No coloured bands — white-only layout
- Logo small, top-left, 32px height
- Large document number as page watermark (10% opacity, rotated 15°, bottom-right)
- Table: hairline borders, generous line height, small compact typography
- Accent colour used only on the "Total Due" row highlight

---

## 9. Settings > Documents Sub-Page (New Route)

Add `/settings/documents` to the settings section:

```tsx
// App.tsx — inside settings Routes
<Route path="documents" element={<DocumentSettingsTab />} />
```

`DocumentSettingsTab` contains:
- Company details (name, address, VAT, registration)
- Bank details
- Invoice terms / quote footer text
- Payment terms (days)
- Document number prefixes + starting numbers
- **Logo upload** (links to GeneralTab or inline)
- **Template selector** (Modern / Classic / Minimal with previews)
- **Preview PDF button** → calls `GET /api/workspaces/{w}/documents/preview?template=modern` → streams a sample PDF

---

## 10. Brand Colour in the App UI

The `workspaces.color` field drives the CSS `--color-accent` variable at login and throughout the app:

```tsx
// Applied when workspace loads (in WorkspaceProvider or App.tsx)
useEffect(() => {
    const color = workspace?.color ?? '#7c3aed';
    document.documentElement.style.setProperty('--color-accent', color);
    // Derive hover/light/glow from base colour
    document.documentElement.style.setProperty('--color-accent-hover', darken(color, 10));
    document.documentElement.style.setProperty('--color-accent-light', alpha(color, 0.15));
    document.documentElement.style.setProperty('--color-accent-glow',  alpha(color, 0.35));
}, [workspace?.color]);
```

Utilities `darken(hex, percent)` and `alpha(hex, opacity)` are small pure-JS helpers (no dependency).

---

## 11. Implementation Sequence (within P0 phase)

1. `WorkspaceLogoController` — upload + delete endpoints
2. Update `WorkspaceResource` to expose `logo_url`, `color`, `icon`, `settings`
3. `BrandingController` — public `/api/branding` endpoint
4. `InitialsAvatar` React component
5. `BrandingContext` + boot-time `GET /api/branding` fetch
6. Login page: conditional logo / initials / Aquerii fallback
7. Sidebar workspace header: logo / initials
8. `GeneralTab.tsx`: logo upload section
9. Email `layout.blade.php`: dynamic logo / initials header
10. Update `WorkspaceInvitation` + `BillingConfirmation` Mailables to use new layout
11. Settings > Documents sub-page route + `DocumentSettingsTab`
12. Three PDF Blade template directories (Modern / Classic / Minimal) — after Gotenberg is running

---

## 12. Success Criteria

- [ ] `POST /api/workspaces/{w}/logo` stores image to S3, updates `logo_url`, returns URL
- [ ] `DELETE /api/workspaces/{w}/logo` removes from S3, nulls `logo_url`
- [ ] `WorkspaceResource` returns `logo_url`, `color`, `icon`, `settings` in every response
- [ ] `GET /api/branding` resolves subdomain/custom domain to workspace branding; cached 5 min
- [ ] `InitialsAvatar` component renders correct 2-letter initials with contrast-safe text
- [ ] Login page shows company logo (or initials) when accessed via workspace subdomain
- [ ] Sidebar header shows workspace logo (or initials avatar) at 32×32
- [ ] `GeneralTab.tsx` has file upload section with preview, replace, and remove actions
- [ ] All transactional emails render company logo in header; fall back to initials
- [ ] Settings > Documents tab includes template selector (Modern / Classic / Minimal)
- [ ] Brand colour (`workspace.color`) applies `--color-accent` CSS var across full UI
- [ ] PDF templates inject logo/avatar, brand colour, and correct layout based on `settings.doc_template`
- [ ] Tests: logo upload validates type/size; `BrandingController` subdomain resolution; `InitialsAvatar` initials logic; email layout snapshot
