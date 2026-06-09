# BG-03: Project Email Addresses (Incoming Email → Task/Comment)

**Status:** ❌ NOT IMPLEMENTED
**Priority:** P2 — Important for external collaboration
**Complexity:** MEDIUM — Webhook handling, email parsing, attachment extraction

---

## 1. What This Feature Is

Each project (workspace) gets a unique email address like `project-abc123@inbound.aquerii.com`. When someone sends an email to that address, Aquerii receives it via a webhook from Mailgun/SendGrid, parses the content, and creates either a task or a comment on an existing task.

This enables a powerful workflow: a client emails `project-xyz@inbound.aquerii.com` with "Please update the landing page copy" → the system creates a task in that project with the email body as description and attachments. No login required. No portal access. Just email.

The backend has Email CRUD (messages, accounts, signatures) but that's for OUTBOUND email management. There is zero inbound email processing infrastructure.

---

## 2. Why It's Missing

Building inbound email processing is deceptively hard:

1. **Mailgun/SendGrid inbound parsing is a premium feature** — Mailgun Routes (inbound email) are available but require DNS MX record configuration. Setting up MX records for a custom domain is a DevOps task most teams avoid until necessary.
2. **Email parsing is messy** — Multipart MIME messages, HTML→text conversion, attachment extraction, encoding issues, spam filtering. The `egulias/email-validator` that Laravel uses is for format validation, not content parsing. You need a proper MIME parser like `zbateson/mail-mime-parser`.
3. **Security surface area** — Opening inbound email means dealing with spam, phishing links, malicious attachments, and email spoofing (SPF/DKIM verification required).
4. **Recipient matching** — The system needs to parse the `To` header, extract the project-specific prefix, look up the ProjectEmailAddress record, and handle forwarding chains where the original recipient is buried in headers.
5. **Thread detection** — If an email comes in with `In-Reply-To` or `References` headers pointing to a previous incoming email, the system should add it as a comment on the existing task, not create a new one. This requires header parsing + smart linking.

---

## 3. Backend Spec

### 3.1 Models

```php
// ProjectEmailAddress — the unique inbound address for each project
Schema::create('project_email_addresses', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('project_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('email_address')->unique();       // project-xxx@inbound.aquerii.com
    $table->string('prefix')->unique();              // the xxx part
    $table->string('status');                        // active, disabled, suspended
    $table->json('allowed_senders')->nullable();      // whitelist of email addresses, null = anyone
    $table->boolean('create_tasks_from_unknown')->default(true);  // create task if no thread match
    $table->string('default_assignee_email')->nullable();          // auto-assign to this user
    $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});

// IncomingEmail — each email received via webhook
Schema::create('incoming_emails', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('project_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('from_email');
    $table->string('from_name')->nullable();
    $table->string('subject');
    $table->longText('body_plain')->nullable();        // plain text version
    $table->longText('body_html')->nullable();          // HTML version (stored for reference)
    $table->json('headers')->nullable();                // raw email headers
    $table->string('message_id')->nullable();           // Message-ID header for threading
    $table->string('in_reply_to')->nullable();          // In-Reply-To header for threading
    $table->string('references')->nullable();           // References header for threading
    $table->nullableUuidMorphs('converted_to');          // converted to Item (task) or Comment
    $table->string('status');                            // received, converted, failed, spam
    $table->text('error_message')->nullable();
    $table->timestamp('received_at')->useCurrent();
    $table->timestamps();

    $table->index('message_id');
    $table->index('in_reply_to');
});

// IncomingEmailAttachment — files attached to an incoming email
Schema::create('incoming_email_attachments', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('incoming_email_id')->constrained('incoming_emails')->cascadeOnDelete();
    $table->string('filename');
    $table->string('mime_type');
    $table->integer('size_bytes');
    $table->string('storage_path');
    $table->string('content_id')->nullable();           // CID for inline images
    $table->timestamps();
});

// EmailThreadMapping — maps a message-id thread to an Aquerii item
Schema::create('email_thread_mappings', function (Blueprint $table) {
    $table->id();
    $table->string('email_message_id');                  // the original Message-ID
    $table->string('thread_root_message_id');            // the first email in the thread
    $table->nullableUuidMorphs('target');                 // Item or other entity the thread relates to
    $table->timestamps();

    $table->index('email_message_id');
    $table->index('thread_root_message_id');
});

// ProjectEmailAlias — optional additional email addresses pointing to the same project
Schema::create('project_email_aliases', function (Blueprint $table) {
    $table->id();
    $table->foreignUuid('project_email_id')->constrained('project_email_addresses')->cascadeOnDelete();
    $table->string('alias')->unique();
    $table->timestamps();
});
```

### 3.2 API Endpoints

```
# Project Email Addresses
GET    /api/workspaces/{id}/email-addresses               # List project email addresses
POST   /api/workspaces/{id}/email-addresses               # Generate a new email address
PATCH  /api/workspaces/{id}/email-addresses/{addrId}      # Update settings (whitelist, etc.)
DELETE /api/workspaces/{id}/email-addresses/{addrId}      # Disable/delete email address

# Incoming Emails
GET    /api/workspaces/{id}/incoming-emails               # List incoming emails (paginated)
GET    /api/incoming-emails/{id}                          # Get email detail + attachments
POST   /api/incoming-emails/{id}/convert-to-task          # Manually convert to task
POST   /api/incoming-emails/{id}/convert-to-comment       # Manually convert to comment on task
                                                           Body: { item_id: "..." }
POST   /api/incoming-emails/{id}/ignore                   # Mark as ignored/invalid

# Webhook Endpoint (called by Mailgun/SendGrid — no auth, uses signature verification)
POST   /api/email/inbound                                 # Inbound email webhook
       Body: multipart form (Mailgun format) or JSON (SendGrid format)

# Resolve Sender
GET    /api/email/inbound/resolve-sender?email=user@example.com
       # Returns matching user, contact, or lead in the workspace
```

### 3.3 Controller Logic

**InboundEmailWebhookController:**
1. Verify webhook signature (Mailgun HMAC or SendGrid signature)
2. Parse the incoming payload:
   - Mailgun: multipart form with `from`, `subject`, `body-plain`, `body-html`, `stripped-text`, `attachment-count`, `message-headers`, etc.
   - SendGrid: JSON with envelope, subject, text/HTML bodies, attachments
3. Extract `recipient` (the To address) and look up ProjectEmailAddress by the full email or prefix
4. If no match → log warning, return 200 (don't let the mail provider retry)
5. Check `allowed_senders` whitelist if configured
6. Parse MIME headers for `Message-ID`, `In-Reply-To`, `References`
7. Check `email_thread_mappings` to see if this is a reply to an existing thread
8. Extract attachments, store files via the Upload system
9. Create IncomingEmail record with status `received`
10. Dispatch `ProcessIncomingEmail` job to queue (don't do it synchronously — email parsing can be slow)

**ProcessIncomingEmail Job:**
1. If incoming email has `in_reply_to` → try to find the parent IncomingEmail
2. If parent found and parent's `converted_to` is an Item → create a Comment on that Item
3. If no parent → create a new Item (task) in the project
4. Map the email's Message-ID to the created Item/Comment in `email_thread_mappings`
5. Update IncomingEmail status to `converted`

**IncomingEmailController@convertToTask:**
1. Find the IncomingEmail
2. If already converted, return error
3. Create an Item (task) with:
   - `title` = email subject
   - `description` = email body (plain text)
   - `item_type` = 'task'
   - `project_id` = IncomingEmail project_id
4. Attach files from IncomingEmailAttachment to the new Item
5. Create EmailThreadMapping
6. Update IncomingEmail status to `converted`

### 3.4 Service Layer

```
App\Services\Email\Inbound\MailgunWebhookHandler
  - verifySignature(array $payload): bool
  - parsePayload(array $payload): InboundEmailData

App\Services\Email\Inbound\SendGridWebhookHandler
  - verifySignature(string $signature, string $payload): bool
  - parsePayload(array $payload): InboundEmailData

App\Services\Email\Inbound\EmailParserService
  - parseBody(string $html, string $plain): ParsedBody
  - extractAttachments(array $attachments): array
  - cleanReplyText(string $body): string  // strips "On ... wrote:" blocks
  - extractMentionedTaskIds(string $body): array  // detect refs like "TASK-123"

App\Services\Email\Inbound\RecipientResolverService
  - resolveProject(string $recipient): ?ProjectEmailAddress
  - resolveUser(string $fromEmail): ?User
  - resolveContact(string $fromEmail, string $workspaceId): ?Contact

App\Services\Email\Inbound\ThreadResolverService
  - resolve(IncomingEmail $email): ?IncomingEmail  // find parent in thread
  - createMapping(string $messageId, Model $target): void
  - getThreadTarget(string $messageId): ?Model
```

### 3.5 Email Address Format

```
Format:      project-{prefix}@inbound.{domain}
Example:     project-abc123def@inbound.aquerii.com
Prefix:      8+ character random alphanumeric string (collision-resistant)
Domain:      Separate subdomain for easier MX management

Optional alias for vanity:
  support@inbound.aquerii.com → project-abc123def@inbound.aquerii.com
```

### 3.6 Mailgun/SendGrid Configuration

**Mailgun Setup:**
```
MX Records:
  inbound.aquerii.com → mxa.mailgun.org
  inbound.aquerii.com → mxb.mailgun.org

Mailgun Route:
  Priority: 10
  Filter: catch_all
  Actions: forward("https://api.aquerii.com/api/email/inbound")
```

**SendGrid Setup:**
```
Inbound Parse:
  Domain: inbound.aquerii.com
  URL: https://api.aquerii.com/api/email/inbound
  Spam check: true
```

### 3.7 Security Measures

```php
// SPF/DKIM/DMARC verification (configurable)
'inbound_email' => [
    'verify_spf' => true,
    'verify_dkim' => true,
    'spam_score_threshold' => 5.0,  // SpamAssassin score, skip if over
    'allowed_domains' => ['gmail.com', 'outlook.com', 'example.com'], // null = all
    'max_attachment_size' => 25 * 1024 * 1024,  // 25MB
    'allowed_mime_types' => [
        'application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.*',
        'text/plain', 'text/csv',
    ],
    'blocked_extensions' => ['exe', 'scr', 'bat', 'cmd', 'vbs', 'js'],
],
```

---

## 4. Frontend Design

### 4.1 Project Settings — Email Address Tab

```
┌──────────────────────────────────────────────────────┐
│  Project Settings  →  Email Address                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Inbound Email Address                               │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  📧 project-abc123def@inbound.aquerii.com      │  │
│  │  [📋 Copy]  [🔗 Open in Mail Client]          │  │
│  │  Created Apr 15, 2026 by you                    │  │
│  │  Status: ✅ Active                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ⚙ Settings:                                         │
│  ☑ Create tasks from unknown senders                 │
│  Default assignee:  [Sarah Chen ▼]                   │
│                                                      │
│  Allowed Senders:                                    │
│  ○ Anyone (no restriction)                           │
│  ● Only these senders:                               │
│    [client@acme.com          ] [✕]                   │
│    [vendor@supplyco.com      ] [✕]                   │
│    [_________________________] [+ Add]               │
│                                                      │
│  [Regenerate Address]  [Disable]                     │
│                                                      │
│  ── Tips ─────────────────────────────────────────── │
│  Share this email with clients, vendors, or anyone   │
│  who needs to create tasks without logging in.       │
│  Replies to emails are automatically threaded.       │
└──────────────────────────────────────────────────────┘
```

### 4.2 Incoming Emails List in Project

```
┌──────────────────────────────────────────────────────┐
│  📬 Incoming Emails (23)          [Mark All Read]    │
├──────────────────────────────────────────────────────┤
│  Filter: [All ▼]  Search: [___________________]     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ☐ 📧 Q3 Budget Review                    NEW  │  │
│  │   From: client@acme.com                     │  │
│  │   "Attached is the Q3 budget spreadsheet..." │  │
│  │   10:32 AM  [Convert to Task] [Ignore]      │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ☐ 💬 Re: Site issues                    NEW  │  │
│  │   From: john@example.com                     │  │
│  │   Reply to TASK-142                         │  │
│  │   9:15 AM   [View Task]                     │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ☐ 📧 Design mockups feedback                  │  │
│  │   From: designer@agency.com                   │  │
│  │   ➜ TASK-128 (converted Apr 12)             │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ☐ 📧 Spam message                   ⚠ SPAM   │  │
│  │   From: spammer@bad.com                       │  │
│  │   [Mark as Not Spam] [Delete]                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [← Prev]  Page 1 of 3  [Next →]                    │
└──────────────────────────────────────────────────────┘
```

### 4.3 Incoming Email Detail

```
┌──────────────────────────────────────────────────────┐
│  📬 Q3 Budget Review                                 │
├──────────────────────────────────────────────────────┤
│  From:    client@acme.com                            │
│  To:      project-abc123def@inbound.aquerii.com      │
│  Date:    May 28, 2026 10:32 AM                      │
│  Subject: Q3 Budget Review                            │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  Hi team,                                             │
│                                                      │
│  Attached is the Q3 budget spreadsheet for review.    │
│  Please take a look and let me know if any changes   │
│  are needed before the board meeting on Friday.      │
│                                                      │
│  Thanks,                                              │
│  Client                                               │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  Attachments (1):                                    │
│  📎 Q3_Budget_2026.xlsx    [Preview] [Download]     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  [📝 Convert to Task]  [💬 Convert to Comment] │  │
│  │  [✕ Ignore]                                    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 4.4 Convert to Task — Pre-filled Form

```
┌──────────────────────────────────────────────────────┐
│  📝 Convert to Task                                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Title:    [Q3 Budget Review                    ▼]   │
│  List:     [Backlog ▼]                               │
│  Assignee: [Sarah Chen ▼]                           │
│  Due:      [📅 ________]                             │
│  Priority: [🟡 Medium ▼]                             │
│  Tags:     [budget] [Q3] [finance]                   │
│                                                      │
│  Description:                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Hi team,                                       │  │
│  │                                                │  │
│  │ Attached is the Q3 budget spreadsheet...       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Attachments will be linked to the task              │
│                                                      │
│  [✕ Cancel]                 [Create Task from Email] │
└──────────────────────────────────────────────────────┘
```

### 4.5 Convert to Comment — Select Task

```
┌──────────────────────────────────────────────────────┐
│  💬 Convert to Comment                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Search for a task to add this as a comment:         │
│  [Search tasks...                       🔍]          │
│                                                      │
│  Recent tasks:                                       │
│  ○ TASK-142  Site Issues                            │
│  ○ TASK-128  Design mockups feedback                │
│  ○ TASK-101  Q2 Budget Review                       │
│  ○ TASK-089  Vendor onboarding                      │
│                                                      │
│  [✕ Cancel]                 [Add as Comment]         │
└──────────────────────────────────────────────────────┘
```

### 4.6 Task Detail — Shows Email Origin

When a task was created from an email, the task detail shows:

```
┌──────────────────────────────────────────────────────┐
│  TASK-142: Q3 Budget Review                          │
│  [📧 Created from email]  May 28, 2026              │
├──────────────────────────────────────────────────────┤
│  ...task content...
│                                                      │
│  ──── Original Email ────                            │
│  From: client@acme.com                              │
│  [View Original Email] [Reply via Email]            │
└──────────────────────────────────────────────────────┘
```

---

## 5. Implementation Complexity Analysis

| Component | Complexity | Risk | Notes |
|-----------|-----------|------|-------|
| Mailgun/SendGrid inbound setup | LOW | LOW | MX record config, webhook URL setup. Done once. |
| MIME email parsing | MEDIUM | MEDIUM | HTML→text conversion, encoding issues, forwarded email stripping. Use `zbateson/mail-mime-parser`. |
| Attachment extraction & storage | MEDIUM | LOW | Standard file upload with MIME type validation. |
| Thread detection (In-Reply-To) | MEDIUM | MEDIUM | Not all email clients set these headers correctly. Gmail is fine, Outlook sometimes drops them. |
| SPF/DKIM verification | MEDIUM | LOW | Mailgun/SendGrid handle most of this, but additional verification adds complexity. |
| Webhook signature verification | LOW | LOW | Well-documented for both providers. |
| Spam filtering | LOW | MEDIUM | Basic: block known spam domains, check SpamAssassin score if available. |
| Sender resolution (email→user) | LOW | LOW | Look up by email in users/contacts. |
| Queue job processing | LOW | LOW | Standard Laravel queue pattern. |
| Frontend email list UI | MEDIUM | LOW | Pagination, filtering, status badges. Standard CRUD UI. |

**Total estimated effort:** 1.5-2 weeks for a full-stack developer
**Ongoing cost:** Mailgun inbound email pricing (~$1/1000 emails), storage for attachments
**Key risk:** Email threading breaks when clients use different email clients. Mitigation: always match by In-Reply-To first, then by subject similarity as fallback. The "Convert to Task" / "Convert to Comment" manual overrides handle the edge cases.

**Why this is MEDIUM, not HIGH complexity:**
Mailgun and SendGrid handle the hardest parts (MIME parsing, attachment extraction, spam filtering, SPF/DKIM verification). We're essentially writing a webhook → database mapping layer. The threading logic is the only genuinely tricky piece, and manual overrides make it non-critical.
