# FlowOS — Security

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Security Lead  
**Principle**: Security is not a phase. It is a property of every line of code, every deploy, every dependency update. Failing a security gate is not a delay — it is a prevented breach.

---

## 1. Threat Model

### Assets to Protect

| Asset | Value | Threat |
|-------|-------|--------|
| Workspace data (items, docs, CRM) | Confidential customer data | Unauthorized access, exfiltration |
| Auth tokens (JWT, OAuth) | Identity | Token theft, session hijack |
| Billing data (card metadata, invoices) | Financial | PCI scope, fraud |
| AI prompts / outputs | Operational | Prompt injection, data leakage between tenants |
| Platform secrets (DB passwords, API keys) | Infrastructure | Credential theft → full compromise |
| File uploads | Operational | Malware, path traversal, SSRF |
| Automation webhook URLs | Operational | SSRF to internal network |

### Attacker Personas

| Persona | Capability | Goal |
|---------|-----------|------|
| Unauthenticated internet user | HTTP requests only | Access any data without login |
| Authenticated user (tenant A) | Valid JWT, knows API | Access tenant B data |
| Malicious workspace member | Member-level auth | Escalate privileges, exfiltrate |
| Compromised third-party integration | Valid OAuth token | Pivot to tenant data |
| Supply chain attacker | NPM/Composer dependency | Code execution in production |
| Insider (rogue super admin) | Super admin credentials | Mass data exfiltration |

---

## 2. Authentication

### JWT Configuration

```php
// config/jwt.php
return [
    'secret'    => env('JWT_SECRET'),          // 256-bit, from Vault
    'algo'      => 'HS256',                    // Symmetric — no algorithm confusion risk
    'ttl'       => 60,                         // Access token: 60 minutes
    'refresh_ttl' => 20160,                    // Refresh token: 14 days
    'blacklist_enabled' => true,               // Revocation via Redis blacklist
    'blacklist_grace_period' => 0,             // No grace — immediate revocation
];
```

**Rules**:
- Access token: 60-minute TTL, stored in memory only (never localStorage)
- Refresh token: 14-day TTL, stored in `HttpOnly; Secure; SameSite=Strict` cookie
- Token rotation: new refresh token issued on every refresh (old immediately blacklisted)
- All tokens signed with secret from Vault — never from `.env`

### Password Policy

```php
// app/Rules/PasswordStrength.php
// Enforced:
// - Minimum 12 characters
// - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
// - Not in HaveIBeenPwned database (checked via k-anonymity API)
// - Not same as last 5 passwords (hashed history stored)
// - Argon2id hashing: memory=65536, time=4, threads=2
```

### Brute Force Protection

```php
// Enforced via Laravel RateLimiter on auth endpoints:
RateLimiter::for('login', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->input('email')),    // Per email
        Limit::perMinute(20)->by($request->ip()),              // Per IP
    ];
});
// After 10 failures on same email: account temporarily locked (15 min), email notification sent
// After 50 failures from same IP: IP blocked at Caddy level (1 hour)
```

### MFA

- **TOTP** (RFC 6238): Google Authenticator / Authy compatible
- **Backup codes**: 10 single-use codes generated on MFA setup, shown once, stored as bcrypt hashes
- **Enforcement**: Optional for regular users; mandatory for Super Admin accounts
- **Recovery**: MFA bypass requires identity verification (email + backup code or support ticket with ID verification)

### OAuth (Google, GitHub, Microsoft)

```php
// Security requirements for OAuth:
// 1. state parameter: cryptographically random 32-byte nonce, verified on callback
// 2. PKCE: code_challenge required (S256 method)
// 3. Token storage: OAuth access tokens encrypted at rest (AES-256-GCM, key from Vault)
// 4. Scope: request minimum required scopes only
// 5. Account linking: OAuth email must match existing account email to link
//    (prevents account takeover via OAuth with different email)
```

---

## 3. Authorization

### RBAC Roles Per Workspace

| Role | Capabilities |
|------|-------------|
| `owner` | Full control: settings, billing, delete workspace, all data |
| `admin` | Manage members, boards, automations. Cannot delete workspace or change billing |
| `member` | Create/edit items on boards they have access to. Cannot manage members |
| `guest` | Read-only access to specific boards they are explicitly invited to |

### Permission Gates (Laravel Policies)

Every controller action backed by a Policy:

```php
// app/Policies/ItemPolicy.php
public function update(User $user, Item $item): bool
{
    // 1. RLS already enforces workspace isolation at DB level
    // 2. Policy checks board-level permission + role
    $member = WorkspaceMember::where([
        'workspace_id' => $item->board->workspace_id,
        'user_id'      => $user->id,
    ])->firstOrFail();

    return match($member->role) {
        'owner', 'admin', 'member' => true,
        'guest' => $item->board->guestCanEdit($user->id),
        default => false,
    };
}
```

### RLS Double-Enforcement Pattern

```php
// app/Http/Middleware/SetTenantContext.php
public function handle(Request $request, Closure $next): Response
{
    $workspaceId = $request->user()->current_workspace_id;

    // 1. Validate workspace membership
    abort_unless(
        WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $request->user()->id)
            ->exists(),
        403
    );

    // 2. Set PostgreSQL session variable for RLS
    DB::statement("SET app.workspace_id = '{$workspaceId}'");
    DB::statement("SET app.user_id = '{$request->user()->id}'");

    // 3. Set app-level binding for all queries
    app()->instance('current_workspace_id', $workspaceId);

    return $next($request);
}
```

**RLS Policy example** (enforced at DB level — not bypassable by application code):

```sql
CREATE POLICY workspace_isolation ON items
    USING (workspace_id = current_setting('app.workspace_id')::uuid);
```

---

## 4. Input Validation & Injection Prevention

### SQL Injection
- All queries via Eloquent ORM or raw queries with PDO parameter binding
- Zero string concatenation in SQL ever — enforced by Semgrep rule `sql-string-concat`
- Mass assignment protected: `$guarded = ['*']` on all models; explicit `$fillable` only

### XSS
- All user content rendered via React (JSX auto-escapes)
- BlockNote editor: DOMPurify on paste/import
- API responses: `Content-Type: application/json` always — never HTML from API
- CSP header enforced:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https://storage.flowos.app;
  connect-src 'self' wss://rt.flowos.app;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

### CSRF
- All state-changing API requests require `Authorization: Bearer {token}` header
- Cookie-based sessions (Super Admin) use `X-XSRF-TOKEN` header + `SameSite=Strict`
- Double-submit cookie pattern on all Filament forms

### File Upload Security

```php
// app/Services/FileUploadService.php
public function validate(UploadedFile $file): void
{
    // 1. Extension allowlist (not blocklist)
    $allowed = ['jpg','jpeg','png','gif','webp','pdf','doc','docx',
                'xls','xlsx','csv','txt','md','zip'];
    abort_unless(in_array($file->extension(), $allowed), 422, 'File type not allowed');

    // 2. MIME type re-detection (ignores client-supplied Content-Type)
    $detectedMime = mime_content_type($file->getRealPath());
    abort_unless(in_array($detectedMime, $this->allowedMimes), 422, 'MIME type mismatch');

    // 3. Max size: 100MB (enforced here + Caddy request size limit)
    abort_if($file->size() > 100 * 1024 * 1024, 413);

    // 4. Filename sanitization — never use original filename on disk
    // Files stored as: {uuid}.{extension} — never original name
    
    // 5. ZIP bomb check
    if ($file->extension() === 'zip') {
        $this->checkZipBomb($file);
    }
    
    // 6. ClamAV scan (async — file quarantined until scan complete)
    dispatch(new ScanFileForMalware($file->path()));
}
```

### SSRF Prevention (Automation Webhook URLs)

```php
// app/Services/WebhookValidator.php
public function validateUrl(string $url): void
{
    $parsed = parse_url($url);

    // Block internal/private IP ranges
    $ip = gethostbyname($parsed['host']);
    $privateRanges = [
        '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
        '127.0.0.0/8', '169.254.0.0/16', '::1/128', 'fc00::/7'
    ];
    foreach ($privateRanges as $range) {
        abort_if($this->ipInRange($ip, $range), 422, 'Webhook URL cannot target private network');
    }

    // Allowlist scheme
    abort_unless(in_array($parsed['scheme'], ['https']), 422, 'Only HTTPS webhooks allowed');
    
    // Resolve again at execution time (DNS rebinding protection)
    // compare to validated IP — must match
}
```

### Prompt Injection Prevention (AI Service)

```python
# services/ai/security/sanitizer.py
import re

PII_PATTERNS = [
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # email
    r'\b\d{10,15}\b',                                             # phone
    r'\b\d{3}-\d{2}-\d{4}\b',                                    # SSN
    r'\b(?:\d[ -]*?){13,16}\b',                                  # credit card
]

INJECTION_PATTERNS = [
    r'ignore (previous|all) instructions',
    r'you are now',
    r'jailbreak',
    r'<\|.*?\|>',   # special tokens
    r'system:',
]

def sanitize_for_prompt(text: str) -> str:
    # Remove PII
    for pattern in PII_PATTERNS:
        text = re.sub(pattern, '[REDACTED]', text, flags=re.IGNORECASE)
    
    # Detect injection attempts — raise, don't silently strip
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            raise PromptInjectionDetected(f"Potential injection detected: {pattern}")
    
    # Length limit — prevent context window stuffing
    return text[:8000]
```

---

## 5. Transport Security

### TLS Configuration (Caddy)

```caddyfile
# Automatic HTTPS — Caddy handles cert issuance + renewal (Let's Encrypt)
flowos.app, api.flowos.app, rt.flowos.app {
    tls {
        protocols tls1.2 tls1.3   # TLS 1.0/1.1 disabled
        ciphers TLS_AES_128_GCM_SHA256 TLS_AES_256_GCM_SHA384 TLS_CHACHA20_POLY1305_SHA256
    }
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }
}
```

### API Rate Limiting (Caddy + Laravel)

```
Caddy level (IP-based):
  - /api/auth/*      → 10 req/min per IP
  - /api/*           → 1000 req/min per IP
  - /webhooks/*      → 500 req/min per IP (Stripe/PayFast)

Laravel level (authenticated, per-workspace):
  - General API      → 600 req/min per workspace
  - AI endpoints     → 10 req/min per user
  - File upload      → 20 req/min per workspace
  - Export           → 5 req/10min per workspace
```

---

## 6. Secrets Management

### Vault Path Structure

```
secret/flowos/
├── production/
│   ├── db_password
│   ├── redis_password
│   ├── jwt_secret
│   ├── stripe_secret_key
│   ├── stripe_webhook_secret
│   ├── payfast_merchant_key
│   ├── payfast_merchant_passphrase
│   ├── gemini_api_key
│   ├── anthropic_api_key
│   ├── meilisearch_master_key
│   ├── minio_secret_key
│   └── oauth/
│       ├── google_client_secret
│       ├── github_client_secret
│       └── microsoft_client_secret
├── staging/
│   └── [same structure]
└── super-admin/
    └── totp_encryption_key
```

**Rules**:
- Services read secrets via Vault Agent sidecar — no Vault SDK calls in app code
- Secret rotation: DB password, JWT secret rotatable without downtime (rolling restart)
- All secrets encrypted at rest (Vault AES-256-GCM)
- Vault audit log enabled — every read/write logged
- `.env` files contain only `VAULT_ADDR` and `VAULT_TOKEN` — nothing sensitive

---

## 7. Dependency Security

### Automated Scanning (every PR + daily)

```yaml
# .github/workflows/security.yml
- name: PHP dependency audit
  run: composer audit --no-dev --format=json | jq '.advisories | length == 0'

- name: NPM dependency audit  
  run: npm audit --audit-level=high --json | jq '.metadata.vulnerabilities.high == 0 and .metadata.vulnerabilities.critical == 0'

- name: Python dependency audit
  run: pip-audit --requirement requirements.txt --format=json | jq '.vulnerabilities | length == 0'

- name: SAST — Semgrep
  run: semgrep --config=auto --error --json > semgrep-results.json

- name: Container image scan
  run: trivy image ghcr.io/flowos/api:$GIT_SHA --exit-code 1 --severity HIGH,CRITICAL
```

### Dependency Update Policy

- **Critical CVE**: patch within 24 hours (P0)
- **High CVE**: patch within 7 days (P1)
- **Medium CVE**: patch within 30 days (P2)
- **Dependabot**: enabled on all repos, auto-merge for patch-level non-breaking updates after CI passes

---

## 8. Data Privacy (GDPR / POPIA)

### Data Classification

| Class | Examples | Handling |
|-------|---------|---------|
| Personal | Name, email, IP, device ID | Encrypted at rest, logged with ID only, 30-day purge on erasure request |
| Sensitive | Billing info, auth tokens | Never logged, encrypted at rest, Vault-managed keys |
| Tenant data | Items, docs, CRM records | RLS isolated, exportable, deletable on workspace deletion |
| Analytics | Aggregate event counts | Anonymized before ClickHouse insert, no PII |

### Right to Erasure Implementation

```php
// app/Jobs/PurgeUserData.php
// Triggered: 30 days after soft-delete
// Executes:
// 1. Replace user.name with '[Deleted User]'
// 2. Replace user.email with '{id}@deleted.flowos'
// 3. Nullify: avatar_url, phone, address
// 4. Remove OAuth tokens
// 5. Remove device tokens (push notifications)
// 6. Keep: item assignments (shown as 'Deleted User'), activity log (shown as 'Deleted User')
//    REASON: deleting activity log would corrupt audit trail
// 7. Remove from Meilisearch index
// 8. Remove from ChromaDB workspace collection
// 9. Log: super_admin_audit_log entry with purge timestamp
```

### Data Residency

```php
// Workspace creation: user selects region
// Options: 'eu' (Frankfurt), 'us' (Virginia), 'za' (Johannesburg — future)
// Effect: PostgreSQL read replica + MinIO bucket routed to selected region
// Super Admin can view per-workspace region, cannot override without owner consent
```

---

## 9. Penetration Testing Scope

### Pre-Launch Red Team (external, independent)

**In scope**:
- All public API endpoints (`/api/v1/*`)
- Authentication flows (register, login, OAuth, MFA, password reset)
- File upload endpoints
- Webhook ingestion endpoints
- WebSocket connections
- Super Admin panel (network-reachable from test VPN)
- RLS bypass attempts (direct SQL injection, API parameter manipulation)
- Automation SSRF via webhook URL
- Billing manipulation (plan bypass, quota bypass)
- AI prompt injection
- JWT tampering (algorithm confusion, key confusion)

**Pass gate**: 0 Critical, 0 High findings before public launch. Non-negotiable.

**Medium findings**: documented + scheduled fix within 30 days of launch.

---

*Owner: Security Lead*  
*Cross-reference: QA_STRATEGY.md §7, OPERATIONAL_MATURITY.md §4, DATABASE_SCHEMA.md (RLS policies)*
