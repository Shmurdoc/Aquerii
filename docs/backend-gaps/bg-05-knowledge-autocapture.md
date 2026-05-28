# BG-05: AI Knowledge Auto-Capture from Resolved Issues

**Status:** ❌ NOT IMPLEMENTED
**Priority:** P2 — High-value knowledge management automation
**Complexity:** MEDIUM — AI extraction quality is the risk, not the engineering

---

## 1. What This Feature Is

When a support ticket is resolved, the system automatically extracts the solution from the conversation (ticket comments, internal notes, the resolution summary) and generates a draft Knowledge Base article. A human reviews the draft, edits if needed, and publishes it.

This solves a classic knowledge management problem: every time someone solves a support ticket, they learn something. But that knowledge stays in the ticket, invisible to future users and agents. Auto-capture makes knowledge creation a byproduct of support work instead of an extra task nobody has time for.

The pipeline: Ticket Resolved → AI reads the full conversation → Extracts problem + cause + solution → Generates KB draft → Notifies reviewer → Draft appears in KB as "pending review" → Human edits + publishes → KB article is live.

The existing backend has Support Tickets (with comments, statuses, SLAs) and Knowledge Base (articles, categories). But there is zero connection between them. Articles are manually created.

---

## 2. Why It's Missing

1. **AI quality concerns** — The feature is only as good as the AI extraction. If the generated KB articles are low quality, they waste more time than they save. The existing AI Chat module is basic (sessions + messages + credits) — it has no specialized extraction capabilities.
2. **Ticket structure varies** — Some tickets have a clear "root cause" and "resolution". Others are rambling 20-comment threads where the real solution is buried. The AI needs to handle both.
3. **Review gate is essential** — Auto-publishing would be dangerous (hallucinated solutions, incorrect procedures). The review process needs to be lightweight enough that reviewers actually do it — not another backlog item.
4. **Not a priority** — The Support module was built to be functional (tickets in, tickets out). Knowledge management was a separate feature that got deprioritized against ERP and CRM features.

---

## 3. Backend Spec

### 3.1 Models

```php
// KbAutoCapture — tracks the auto-capture process from ticket to draft
Schema::create('kb_auto_captures', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
    $table->foreignUuid('draft_article_id')->nullable()->constrained('kb_articles')->nullOnDelete();
    $table->longText('extracted_solution');              // the raw AI-extracted solution text
    $table->json('extraction_metadata');                  // { confidence_score, model_used, tokens_used, extraction_duration_ms }
    $table->string('status');                             // pending, draft_created, rejected, published
    $table->text('rejection_reason')->nullable();
    $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('reviewed_at')->nullable();
    $table->timestamp('created_at')->useCurrent();
    $table->timestamp('updated_at')->useCurrent();
});

// KbArticleVersion — version history for KB articles
Schema::create('kb_article_versions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('article_id')->constrained('kb_articles')->cascadeOnDelete();
    $table->integer('version_number');
    $table->string('title');
    $table->longText('content');                          // Markdown or HTML content
    $table->json('metadata')->nullable();                  // { change_summary, auto_capture_id }
    $table->string('change_reason')->nullable();
    $table->foreignUuid('created_by')->constrained('users');
    $table->timestamp('created_at')->useCurrent();

    $table->unique(['article_id', 'version_number']);
});

// Add to existing kb_articles table:
// $table->string('source')->default('manual');  // manual, auto_capture, import
// $table->uuid('source_id')->nullable();        // the auto_capture_id if source=auto_capture
// $table->string('status')->default('published'); // draft, published, archived
// $table->boolean('needs_review')->default(false);

// KbAutoCaptureCategorySuggestion — AI-suggested categories for the draft
Schema::create('kb_auto_capture_category_suggestions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('auto_capture_id')->constrained('kb_auto_captures')->cascadeOnDelete();
    $table->foreignUuid('category_id')->constrained('kb_categories');
    $table->float('confidence');                          // AI confidence 0-1
    $table->timestamp('created_at')->useCurrent();
});

// KbAutoCaptureTagSuggestion — AI-suggested tags
Schema::create('kb_auto_capture_tag_suggestions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('auto_capture_id')->constrained('kb_auto_captures')->cascadeOnDelete();
    $table->string('tag');
    $table->float('confidence');
    $table->timestamp('created_at')->useCurrent();
});

// KbAutoCaptureConfig — per-workspace auto-capture settings
Schema::create('kb_auto_capture_configs', function (Blueprint $table) {
    $table->foreignUuid('workspace_id')->primary()->constrained('workspaces')->cascadeOnDelete();
    $table->boolean('enabled')->default(true);
    $table->string('trigger');                             // on_resolve, on_close, manual
    $table->string('target_category_id')->nullable();      // default category for new drafts
    $table->json('excluded_categories')->nullable();       // don't auto-capture from these ticket categories
    $table->boolean('auto_assign_reviewer')->default(true);
    $table->foreignUuid('default_reviewer_id')->nullable()->constrained('users')->nullOnDelete();
    $table->integer('min_confidence_threshold')->default(60); // 0-100, skip if below
    $table->timestamps();
});
```

### 3.2 API Endpoints

```
# Auto-Capture Triggers
POST   /api/kb/auto-capture/{ticketId}/generate              # Manually trigger extraction for a ticket
GET    /api/kb/auto-capture/status/{ticketId}                 # Check if auto-capture has been run on a ticket

# Draft Management
GET    /api/kb/auto-capture/drafts                            # List all pending drafts (paginated)
       Query: ?status=draft_created&category_id=...&page=1

GET    /api/kb/auto-capture/drafts/{id}                       # Get a single draft with suggestions
PUT    /api/kb/auto-capture/drafts/{id}                       # Update draft content before publishing
       Body: { title: "...", content: "...", category_id: "...", tags: [...] }

POST   /api/kb/auto-capture/drafts/{id}/publish               # Publish the draft as a live KB article
POST   /api/kb/auto-capture/drafts/{id}/reject                # Reject the draft (with reason)
       Body: { reason: "incomplete" }

# Review Assignment
GET    /api/kb/auto-capture/drafts/{id}/suggest-reviewers     # Get suggested reviewers (AI based on topic)
       Returns: [{ user_id, name, relevance_score }]

# Statistics
GET    /api/kb/auto-capture/stats                             # Auto-capture performance metrics
       Returns: { total_captured, published, rejected, avg_confidence, avg_review_time }

# Auto-Capture Configuration
GET    /api/kb/auto-capture/config                            # Get workspace auto-capture config
PUT    /api/kb/auto-capture/config                            # Update auto-capture config

# Article Versions
GET    /api/kb/articles/{id}/versions                         # List versions of an article
GET    /api/kb/articles/{id}/versions/{versionId}            # Get specific version
POST   /api/kb/articles/{id}/versions/restore/{versionId}    # Restore a previous version
```

### 3.3 Controller Logic

**AutoCaptureController@generate:**
1. Validate the ticket exists and is in a resolved/closed status
2. Check if auto-capture already exists for this ticket — if so, return existing
3. Fetch the full ticket data:
   - Ticket title, description
   - All public comments (thread)
   - Internal notes (if user has permission)
   - Resolution summary (if filled in)
   - Custom field values
   - Category and tags
4. Build the extraction prompt:
   ```
   You are a knowledge base article extractor. Given a support ticket
   conversation, extract the solution and create a KB article draft.

   Ticket: {title}
   Description: {description}
   Conversation: {concatenated comments with role labels}
   Resolution: {resolution_summary}

   Extract:
   1. PROBLEM: One-sentence description of the issue
   2. CAUSE: Root cause of the problem
   3. SOLUTION: Step-by-step resolution (numbered steps)
   4. ALSO APPLIES TO: Related scenarios/versions (if any)
   5. SUGGESTED_TITLE: A short, searchable title
   6. SUGGESTED_CATEGORY: Best-matching KB category
   7. SUGGESTED_TAGS: 3-5 relevant tags
   8. CONFIDENCE: 0-100 how confident you are in this extraction

   Format response as JSON.
   ```
5. Call the AI Chat LLM (reuse existing integration) with the extraction prompt
6. Parse the JSON response
7. Create KbAutoCapture record with extracted solution and metadata
8. If confidence >= threshold (default 60), create the draft:
   - Create a KB article with status `draft`, source `auto_capture`, marked `needs_review`
   - Store the first version in KbArticleVersion
   - Set the draft title and content from AI response
   - Create suggested categories and tags
9. If confidence < threshold, mark as `pending` for manual review
10. If `auto_assign_reviewer` is enabled, find the best reviewer:
    - Check default_reviewer_id from config
    - Or, find a user who has edited KB articles in this category
    - Or, find the ticket's assigned agent
11. Create a notification: "AI-generated KB draft ready for review: {title}"
12. Return the draft ID

**AutoCaptureController@drafts (list):**
```
Response:
{
  "data": [
    {
      "id": "...",
      "ticket": { "id": "...", "title": "Cannot connect to VPN", "code": "TICKET-123" },
      "draft_article": { "id": "...", "title": "VPN Connection Issues — Step-by-Step Fix" },
      "confidence": 87,
      "suggested_category": { "id": "...", "name": "Networking" },
      "suggested_tags": ["vpn", "connection", "authentication", "windows"],
      "created_at": "2026-05-28T10:30:00Z",
      "reviewer": { ... }
    }
  ],
  "meta": {
    "total": 23,
    "pending_review": 15,
    "published_today": 3,
    "avg_confidence": 74
  }
}
```

**AutoCaptureController@publish:**
1. Find the draft
2. Validate the current user has permission to publish KB articles
3. Update the draft article: status `published`, `needs_review` false
4. Create a new version in KbArticleVersion with `change_reason: "Published from AI auto-capture"`
5. Update the auto-capture status to `published`
6. Apply any changes the reviewer made (title, content, category, tags were already updated via PUT)
7. Notify anyone who starred/watches the category
8. Return the published article

**AutoCaptureController@reject:**
1. Find the draft
2. Validate the current user has permission
3. Set auto-capture status to `rejected` with rejection reason
4. Soft-delete the draft article or move it to an "archived" status
5. Notify the ticket's assigned agent that the draft was rejected (actionable feedback loop)

### 3.4 Event-Driven Flow

```
SupportTicket (status_changed to resolved)
  │
  ▼
Event: TicketResolved
  │
  ▼
Listener: KbAutoCaptureListener
  │
  ├─ Check config: is auto-capture enabled for this workspace?
  │     NO → return
  │     YES → continue
  │
  ├─ Check trigger: should we auto-capture?
  │     ON_RESOLVE → proceed immediately
  │     MANUAL → skip (user triggers via POST /generate)
  │
  ├─ Dispatch GenerateKbDraft job to queue
  │     (handles the AI extraction asynchronously)
  │
  ▼
GenerateKbDraft job executes:
  ├─ Fetch ticket data
  ├─ Call LLM with extraction prompt
  ├─ Parse response
  ├─ Create KbAutoCapture + draft article
  └─ Dispatch KbDraftReady notification
```

### 3.5 Service Layer

```
App\Services\KnowledgeBase\AutoCaptureService
  - generate(Ticket $ticket): KbAutoCapture
  - createDraft(KbAutoCapture $capture): KbArticle
  - publish(KbAutoCapture $capture, User $reviewer): KbArticle
  - reject(KbAutoCapture $capture, User $reviewer, string $reason): void
  - getStats(Workspace $ws): array

App\Services\KnowledgeBase\ExtractionService
  - extract(Ticket $ticket): ExtractionResult  // calls LLM
  - buildPrompt(Ticket $ticket): string
  - parseResponse(string $response): ExtractionResult

App\Services\KnowledgeBase\DraftReviewService
  - suggestReviewers(KbAutoCapture $capture): Collection
  - assignReviewer(KbAutoCapture $capture): User
  - escalateUnreviewed(): void  // cron: nag reviewers about stale drafts

App\Services\KnowledgeBase\ArticleVersionService
  - createVersion(KbArticle $article, User $user, string $reason): KbArticleVersion
  - getVersion(KbArticle $article, int $version): KbArticleVersion
  - restoreVersion(KbArticle $article, KbArticleVersion $version): void
```

### 3.6 Queue & Scheduler

```php
// Queue jobs
// App\Jobs\GenerateKbDraft — handles AI extraction asynchronously
// App\Jobs\EscalateStaleDrafts — weekly nag for unreviewed drafts

// Scheduler (Kernel.php)
$schedule->job(new EscalateStaleDrafts)->weekly()->mondays()->at('09:00');
```

### 3.7 Extraction Prompt Engineering (Critical Detail)

The quality of the entire feature depends on the prompt. Here's the optimized version:

```
You are extracting knowledge base articles from resolved support tickets.

TICKET: "{ticket_title}"
CATEGORY: {ticket_category}
DESCRIPTION: {ticket_description}

CONVERSATION HISTORY:
{formatted as: Agent (timestamp): message | Customer (timestamp): message}

RESOLUTION NOTES: {resolution_notes}

TASK: Create a Knowledge Base article that would help future users or agents
resolve this same issue without needing to reference this ticket.

RULES:
1. Be specific. "Restart the service" is useless. "Run `sudo systemctl restart nginx`" is useful.
2. Include error messages verbatim if mentioned.
3. If the root cause is unclear, state "Likely caused by:" and explain.
4. Omit internal team politics, blame, or unprofessional language.
5. If the solution requires multiple environments (Windows/Mac/Linux), note which this applies to.
6. If the ticket was resolved by workaround rather than a true fix, note this as "Workaround".

RESPOND WITH JSON ONLY (no markdown, no code fences):
{
  "title": "Short, searchable, problem-oriented title (max 80 chars)",
  "problem": "One-sentence description of the issue",
  "environment": "OS, version, browser, etc. if relevant",
  "root_cause": "What caused the issue. May be 'Unknown' if not determined.",
  "solution": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "workaround": "If applicable, otherwise null",
  "related_keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "suggested_category": "best-matching existing category name",
  "confidence": 85,
  "needs_human_review": true,
  "review_notes": "Specific areas the AI is uncertain about"
}
```

---

## 4. Frontend Design

### 4.1 Ticket Detail — AI Capture Tab

When a ticket is resolved, a new tab appears:

```
┌──────────────────────────────────────────────────────────┐
│  TICKET-123: Cannot connect to VPN                [Resolved]
├──────────────────────────────────────────────────────────┤
│  [Details] [Comments] [History] [🤖 AI Capture]          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  🤖 AI Knowledge Extraction                        │ │
│  │                                                    │ │
│  │  Status: ✅ Draft generated                        │ │
│  │  Confidence: 87/100                                │ │
│  │  ═══════════════════███████████████░░ 87%          │ │
│  │                                                    │ │
│  │  Extracted Solution:                               │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ Problem: VPN connection fails with error      │ │ │
│  │  │ "Authentication timed out" after password     │ │ │
│  │  │ change.                                       │ │ │
│  │  │                                               │ │ │
│  │  │ Cause: VPN client caches old credentials      │ │ │
│  │  │ in Windows Credential Manager.                │ │ │
│  │  │                                               │ │ │
│  │  │ Solution:                                     │ │ │
│  │  │ 1. Open Control Panel                         │ │ │
│  │  │ 2. Go to Credential Manager                   │ │ │
│  │  │ 3. Remove stored VPN credentials              │ │ │
│  │  │ 4. Reconnect to VPN                           │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  [📝 Save as KB Article]  [✕ Dismiss]  [🔄 Retry] │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  If not yet extracted:                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  🤖 AI Knowledge Extraction                        │ │
│  │  Status: Ready for extraction                      │ │
│  │                                                    │ │
│  │  This ticket is resolved. Generate a KB article    │ │
│  │  draft from the conversation?                      │ │
│  │                                                    │ │
│  │  [🤖 Generate KB Draft]                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  If extraction failed:                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ❌ Extraction Failed                               │ │
│  │  "No clear solution found in this conversation.    │ │
│  │   The ticket was resolved but the thread doesn't   │ │
│  │   document the resolution steps."                  │ │
│  │                                                    │ │
│  │  [Try Different Prompt]  [Dismiss]                 │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Draft Review Page

```
┌──────────────────────────────────────────────────────────┐
│  📝 Review AI-Generated Draft                     [3/23] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Source: TICKET-123 "Cannot connect to VPN"              │
│  AI Confidence: 87/100  [What's this?]                  │
│                                                          │
│  Title:                                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ VPN Connection Fails After Password Change         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Category:                                               │
│  [Networking ▼]  [Network & Connectivity]                │
│                                                          │
│  Tags:                                                   │
│  [vpn] [authentication] [credentials] [windows] [+]     │
│                                                          │
│  Content:                                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ # Problem                                          │ │
│  │ VPN connection fails with error "Authentication    │ │
│  │ timed out" immediately after changing domain        │ │
│  │ password.                                           │ │
│  │                                                    │ │
│  │ # Cause                                            │ │
│  │ Windows Credential Manager caches the old domain   │ │
│  │ credentials. The VPN client uses these cached      │ │
│  │ credentials instead of prompting for new ones.     │ │
│  │                                                    │ │
│  │ # Solution                                         │ │
│  │ 1. Open Control Panel → User Accounts →            │ │
│  │    Credential Manager                              │ │
│  │ 2. Click "Windows Credentials"                     │ │
│  │ 3. Find and remove entries related to VPN          │ │
│  │ 4. Reconnect to VPN — you will be prompted for     │ │
│  │    new credentials                                 │ │
│  │ 5. ✅ Connection successful                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  AI Notes: "Solution was confirmed by customer on        │
│  follow-up. Could also affect RDP connections."          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  [📝 Edit in Editor]  [✅ Publish]  [✕ Reject]    │ │
│  │  [⏸ Save as Draft]  [👁 Preview]                 │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Drafts List in Knowledge Base

The KB sidebar gets a new section:

```
┌──────────────────────────────────────────────────────────┐
│  📚 Knowledge Base                           [+ New]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🔍 [Search articles...]                                 │
│                                                          │
│  Categories:                                             │
│  ─────────────────────────────────────────────           │
│  📁 All Articles                         (42)            │
│  📁 Networking                           (12)            │
│  📁 Email                                (8)             │
│  📁 Billing                              (6)             │
│  📁 Account Management                   (5)             │
│  ─────────────────────────────────────────────           │
│                                                          │
│  🔵 Pending Review                      (15) ◀── NEW    │
│  ─────────────────────────────────────────────           │
│                                                          │
│  Quick Links:                                            │
│  📝 Recently Published                                  │
│  🤖 AI-Generated Drafts                                │
│  ⭐ Frequently Viewed                                   │
└──────────────────────────────────────────────────────────┘
```

### 4.4 Pending Review List

```
┌──────────────────────────────────────────────────────────┐
│  🔵 Pending Review (15)                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Filter: [All Categories ▼]  Sort: [Newest ▼]          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🤖 VPN Connection Fails After Password Change      │ │
│  │    From TICKET-123 · Networking · 87% confident    │ │
│  │    AI-generated 2 hours ago · Assigned to you      │ │
│  │    [Review] [Reassign]                             │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🤖 How to Reset Email Quota                     NEW │ │
│  │    From TICKLED-456 · Email · 92% confident        │ │
│  │    AI-generated 30 min ago · Unassigned            │ │
│  │    [Review] [Assign to me]                         │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🤖 Billing Discrepancy for Invoice INV-2024        │ │
│  │    From TICKET-789 · Billing · 45% confident      │ │
│  │    ⚠ Low confidence — review carefully            │ │
│  │    AI-generated 1 day ago · Assigned to Sarah      │ │
│  │    [Review]                                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Showing 1-10 of 15]  [Load More]                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  📊 Stats: Published 12 this week · Avg review     │ │
│  │  time 4h · Acceptance rate 68%                     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.5 Notification Types

```
# For the reviewer:
┌──────────────────────────────────────────────────────┐
│  🤖 AI-Generated KB Draft Ready for Review            │
│  "VPN Connection Fails After Password Change"         │
│  Extracted from TICKET-123 with 87% confidence        │
│                                                        │
│  [📝 Review Draft]  [⏰ Later]  [✕ Dismiss]           │
└──────────────────────────────────────────────────────┘

# For the ticket agent (when published):
┌──────────────────────────────────────────────────────┐
│  📚 Your ticket TICKET-123 was published as a KB      │
│  article: "VPN Connection Fails After Password        │
│  Change"                                              │
│                                                        │
│  [👁 View Article]                                     │
└──────────────────────────────────────────────────────┘

# Escalation (stale draft > 3 days):
┌──────────────────────────────────────────────────────┐
│  ⏰ 3 AI-generated KB drafts are waiting for review   │
│  Oldest is from May 25, 2026                          │
│                                                        │
│  [📝 Review Now]                                       │
└──────────────────────────────────────────────────────┘
```

### 4.6 Published Article — Shows Auto-Capture Badge

```
┌──────────────────────────────────────────────────────────┐
│  VPN Connection Fails After Password Change              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📂 Networking  🏷️ vpn, authentication, windows         │
│                                                          │
│  🤖 AI-generated from TICKET-123 · Published May 28     │
│     Last reviewed by Sarah Chen                          │
│                                                          │
│  ── Content ──                                           │
│  ...article body...                                      │
│                                                          │
│  Versions (2):                                           │
│  v2 — Published from AI auto-capture (current)           │
│  v1 — Initial AI draft                                   │
│                                                          │
│  [View History]                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.7 Settings — Auto-Capture Configuration

```
┌──────────────────────────────────────────────────────────┐
│  Knowledge Base Settings → AI Auto-Capture               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ☑ Enable AI Knowledge Auto-Capture                      │
│                                                          │
│  Trigger:                                                │
│  ● Auto-capture when ticket is resolved                  │
│  ○ Manual only (user clicks "Generate KB Draft")         │
│                                                          │
│  Default Category: [Networking ▼]                        │
│  Default Reviewer: [Auto-assign ▼]                       │
│    or [Sarah Chen                                    ▼] │
│                                                          │
│  Quality Threshold:                                      │
│  Minimum AI confidence to auto-create draft:             │
│  [60] ───●────────────────────────────                   │
│  Below threshold: mark as pending for manual review      │
│                                                          │
│  Excluded Categories:                                    │
│  ☐ Internal/Confidential                                 │
│  ☐ Security Incidents                                    │
│  ☐ Billing Disputes                                     │
│                                                          │
│  Reviewer Notifications:                                 │
│  ☑ Notify when new draft is ready                        │
│  ☑ Weekly reminder of pending drafts                     │
│  ☐ Notify when draft is published                        │
│                                                          │
│  [Save Settings]                                         │
└──────────────────────────────────────────────────────────┘
```

### 4.8 Stats Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  🤖 AI Auto-Capture Stats                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ 142        │  │ 89         │  │ 24h                │ │
│  │ Extracted  │  │ Published  │  │ Avg Review Time    │ │
│  │ This Month │  │ This Month │  │                    │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
│                                                          │
│  Acceptance Rate: 62.7%  ↑ 5% from last month            │
│  Avg Confidence: 74/100                                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📈 Drafts Over Time              [Month ▼]        │  │
│  │  ████████████████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁         │  │
│  │  ██████████████████████████████████████▁▁▁▁▁▁      │  │
│  │  ████████████████████████████████████████████▁▁    │  │
│  │  Published     Rejected     Pending                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Top Contributors (Auto-Capture):                        │
│  No — it's all AI. But the reviewers who publish most:  │
│  1. Sarah Chen — 34 published                           │
│  2. John Smith — 28 published                           │
│  3. Mike Lee — 12 published                             │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Complexity Analysis

| Component | Complexity | Risk | Notes |
|-----------|-----------|------|-------|
| LLM extraction prompt | MEDIUM | HIGH | This is the make-or-break component. A bad prompt produces unusable drafts. Requires iteration with real tickets. |
| KbAutoCapture models + CRUD | LOW | LOW | Standard Laravel models, migrations, controllers. Rails-level easy. |
| Draft creation pipeline | MEDIUM | LOW | Orchestrating ticket → AI → draft involves 3-4 service calls. Standard queue job pattern. |
| Review/publish workflow | LOW | LOW | Simple state machine: draft → published/rejected. |
| Article versioning | MEDIUM | LOW | Need to store full article snapshots. Simple serialization + JSON column approach. |
| Suggested reviewers | LOW | LOW | Find users who edited similar categories. Simple query. |
| Escalation cron | LOW | LOW | Weekly query for stale drafts, send notifications. |
| Auto-capture config UI | LOW | LOW | Standard settings CRUD form. |
| Stats dashboard | LOW | LOW | Aggregate queries on auto_captures table. |
| Ticket→AIChat integration | LOW | LOW | Reuse existing AI Chat service to make the LLM call. |

**Total estimated effort:** 1-2 weeks for a full-stack developer
**Ongoing cost:** LLM API calls per resolved ticket. At $0.01-0.03 per extraction (GPT-4o mini) and 1000 resolved tickets/month, approximately $10-30/month.
**Key risk:** The AI extraction quality. A 60% acceptance rate is realistic. Below that, reviewers lose trust and stop reviewing. Mitigation: iterate on the prompt aggressively in the first month. Show confidence scores. Let reviewers give feedback on why they rejected (AI can learn from rejection patterns).

**Why this is the LOWEST complexity gap:**
Most of the heavy lifting is offloaded to the existing AI Chat LLM. The backend is essentially an orchestrator: fetch ticket → call LLM → create draft. The models are straightforward. The review workflow is a simple state machine. The versioning is append-only. The only hard part is the prompt, and that's text, not code.

**Critical success metric:** If acceptance rate stays above 60% after 3 months, this feature is a net positive. If it drops below 40%, the prompt needs rework or the feature needs to be scoped down (only certain ticket categories, or only manual trigger).
