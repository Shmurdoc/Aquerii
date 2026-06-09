# 17 — Knowledge Base & File Management

---

This file covers two related but distinct features: the **Knowledge Base** (structured articles with rich content, categories, versioning) and **File Management** (a universal file hub for all uploaded assets across the system). They share the upload/attachment infrastructure but serve different user needs.

---

## Knowledge Base

### Route

```
/workspaces/{workspaceId}/kb               → KBHomePage (article gallery)
/workspaces/{workspaceId}/kb/{articleId}    → KBArticlePage (viewer)
/workspaces/{workspaceId}/kb/new            → KBArticleEditPage (creator)
/workspaces/{workspaceId}/kb/{articleId}/edit → KBArticleEditPage (editor)
```

### Data Source

No dedicated KB endpoints exist in the current API. The closest available endpoints are the generic document endpoints: `GET/POST /api/workspaces/{id}/documents` and `GET/PUT/DELETE .../{docId}`. These can be repurposed for KB articles if the document model supports `type: "kb_article"` and a `category` field.

**Backend requirements (if repurposing documents):** The document schema must support:
- `type: "kb_article"` (discriminator)
- `content` as rich text JSON (Tiptap output)
- `category_id` (foreign key to a categories table)
- `tags: string[]`
- `version: number` (auto-incremented on every update)
- `version_history: VersionEntry[]` (stored as JSON or separate table)
- `author_id` (the user who created/updated)

If the current document schema doesn't support these fields, the frontend cannot build a proper KB.

### KBHomePage (Article Gallery)

```
┌───────────────────────────────────────────────────────────┐
│  Knowledge Base                    [+ New Article] [⚙]   │
│                                                           │
│  [Search articles...                           🔍]        │
│  [All Categories ▼]  [All Tags ▼]  [Sort: Newest ▼]      │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Getting  │ │ API Ref  │ │ Deploy   │ │ Onboard  │    │
│  │ Started  │ │ Guide    │ │ Playbook │ │ Checklist│    │
│  │ 12 arts  │ │ 8 arts   │ │ 3 arts   │ │ 5 arts   │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 📄 How to deploy to production                   │    │
│  │    Step-by-step deployment guide for DevOps      │    │
│  │    Category: Deploy   Tags: [devops] [guide]     │    │
│  │    Updated 2 days ago by Jane Smith              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ 📄 API authentication overview                   │    │
│  │    How API keys, JWT, and OAuth work in Aquerii  │    │
│  │    Category: API Ref   Tags: [auth] [api]        │    │
│  │    Updated 1 week ago by John Doe                │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ 📄 Setting up your first workspace               │    │
│  │    ...                                           │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

#### Component Tree

```
KBHomePage
├── KBHeader (title, New Article button, Settings)
├── KBSearchBar (input + filters)
├── CategoryCardGrid (visual category cards with article count)
├── ArticleList (paginated, 20 per page)
│   └── ArticleListItem (x N)
│       ├── Title (linked to viewer)
│       ├── Excerpt (2 lines, truncated)
│       ├── MetaLine (category, tags, updated date, author)
│       └── ContextMenu (edit, delete, copy link)
├── PaginationControls
└── EmptyState / LoadingState / ErrorState
```

#### Category Cards

- Up to 6 categories displayed as cards at the top. Each card has: icon (emoji or custom), category name, article count.
- Click a card → filter articles by that category.
- Categories managed via settings gear: add, rename, reorder, delete.
- **BRUTAL CALL-OUT: Categories require a `GET/POST/PUT/DELETE /api/workspaces/{id}/kb-categories` endpoint. This does not exist even in the document API.**

#### Search & Filter

- Global search across KB: `GET /api/workspaces/{id}/search?q=...&type=kb_article` or dedicated `GET /api/workspaces/{id}/kb/search?q=...`.
- Category dropdown: all categories, "All Categories" default.
- Tags: multi-select. Tags are extracted from all articles' `tags` arrays.
- Sort: Newest, Oldest, Most Viewed, Alphabetical.
- **BRUTAL CALL-OUT: If search doesn't support `type` filtering, all results are polluted with tasks, tickets, documents, and meetings. Search needs a `type` query parameter.**

### KBArticlePage (Viewer)

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Knowledge Base    Edit    [···]    🔖      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  # How to Deploy to Production                          │
│                                                          │
│  Category: Deploy   Tags: devops, guide, deployment     │
│  Last updated: May 26, 2026 by Jane Smith    v1.3       │
│                                                          │
│  ── Table of Contents ──                                │
│  • Prerequisites                                        │
│  • Environment Setup                                    │
│  • Deployment Steps                                     │
│  • Rollback Procedure                                   │
│  • Verification                                         │
│                                                          │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  ## Prerequisites                                        │
│                                                          │
│  Before deploying, ensure you have:                      │
│  - Access to the production cluster                      │
│  - Valid deployment credentials                          │
│  - The latest release artifact                           │
│                                                          │
│  ## Environment Setup                                   │
│                                                          │
│  Configure your production environment variables...      │
│                                                          │
│  [Rich content rendered as HTML — code blocks, images,   │
│   tables, lists, embedded videos]                        │
│                                                          │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  Was this helpful?  [👍 Yes] [👎 No]                    │
│                                                          │
│  ── Comments (3) ──                                     │
│  [Comment input...]                                      │
│                                                          │
│  Jane Smith — "Added the rollback section."  2d ago     │
│  John Doe — "Can we add screenshots?"        1d ago     │
└─────────────────────────────────────────────────────────┘
```

#### Component Tree

```
KBArticlePage
├── ArticleToolbar (back link, Edit button, context menu, bookmark)
├── ArticleMetadata (category, tags, version, last updated, author)
├── TableOfContents (auto-generated from headings, sticky on scroll)
├── ArticleContent (rendered rich text — Tiptap JSON → HTML)
│   ├── CodeBlock (syntax-highlighted, copy button)
│   ├── ImageEmbed (lightbox on click)
│   ├── TableRenderer (responsive, horizontal scroll on mobile)
│   └── EmbeddedLink (opens in new tab)
├── FeedbackSection (thumbs up/down with counter)
├── CommentSection
│   ├── CommentInput (textarea + submit)
│   └── CommentList
│       └── Comment (avatar, name, timestamp, content, edit/delete menu)
└── VersionHistoryDrawer
    └── VersionEntry (x N — version number, date, author, changelog, restore button)
```

#### Table of Contents

- Auto-generated from the article's heading elements (`h1`–`h3`).
- Sticky sidebar on desktop (320px wide, positioned right of content).
- Collapsed by default on mobile (hamburger TOC button).
- Click a TOC item → smooth scroll to heading with 80px offset (for sticky toolbar).
- Active heading highlighted as user scrolls (IntersectionObserver).

#### Version History

Opened via a drawer/panel triggered by clicking the version badge ("v1.3"):

```
┌────────────────────────────────────────┐
│  Version History              [×] Close │
├────────────────────────────────────────┤
│  v1.3 — May 26, 2026 by Jane Smith    │
│  "Added rollback procedure section"    │
│  [Restore this version]                │
│                                         │
│  v1.2 — May 20, 2026 by John Doe      │
│  "Updated prerequisites"               │
│  [Restore this version]                │
│                                         │
│  v1.1 — May 15, 2026 by Jane Smith    │
│  "Initial deployment guide"            │
│  [Restore this version]                │
│                                         │
│  v1.0 — May 10, 2026 by Jane Smith    │
│  "Created"                             │
│  [Restore this version]                │
└────────────────────────────────────────┘
```

- Restore: PUT /api/workspaces/{id}/documents/{docId} with the version's content and `version` set to current + 1.
- **BRUTAL CALL-OUT: Version history requires the backend to store all previous versions of a document. The current document API has no versioning mechanism. This requires either: (1) a `document_versions` table with full content snapshots, or (2) JSON diff storage. Without this, version history is a fake UI with no data.**

### KBArticleEditPage (Create/Edit)

```
┌──────────────────────────────────────────────────────────┐
│  [← Cancel]  Editing: How to Deploy    [Save]  [💾]     │
├──────────────────────────────────────────────────────────┤
│  Title*:  [How to Deploy to Production              ]    │
│  Category: [Deploy ▼]  [+ New Category]                 │
│  Tags:     [devops] [x] [guide] [x] [+ Add tag]         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [B] [I] [U] [H1] [H2] [H3] [• List] [1. List]  │   │
│  │  [Link] [Image] [Code] [Table] [Quote] [Divider] │   │
│  ├──────────────────────────────────────────────────┤   │
│  │                                                   │   │
│  │  # Prerequisites                                  │   │
│  │                                                   │   │
│  │  Before deploying, ensure you have:               │   │
│  │  - Access to the production cluster               │   │
│  │  - Valid deployment credentials                   │   │
│  │                                                   │   │
│  │  ## Environment Setup                             │   │
│  │                                                   │   │
│  │  ...                                              │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Save Draft]  [Publish]  [Schedule Publish ▼]         │
└──────────────────────────────────────────────────────────┘
```

- Rich text editor: Tiptap (consistent with boards task description editor). Output is Tiptap JSON.
- Title: required, max 200 chars. Shows character count.
- Category: dropdown of existing categories. "+ New Category" opens inline text input.
- Tags: chips input. Type + Enter to add. Autocomplete from existing tags.
- Toolbar: Bold, Italic, Underline, H1/H2/H3, Bullet list, Ordered list, Link, Image, Code block, Table, Blockquote, Horizontal divider.
- Image upload: opens file upload modal (reuses upload infrastructure from File Management below).
- Save: PUT /api/workspaces/{id}/documents/{docId}. Content saved as Tiptap JSON.
- Publish: same endpoint but with `status: "published"`.
- Schedule Publish: sets `publish_at` field (requires backend support).
- Auto-save: every 30 seconds if unsaved changes exist. Shows "Draft saved" indicator.

### Loading / Empty / Error States — KB

- **Loading (gallery)**: 6 category skeleton cards + 8 article skeleton rows. Shimmer animation.
- **Loading (article)**: Article skeleton (title bar, metadata line, 6 content lines of varying width, TOC skeleton).
- **Loading (edit)**: Full editor skeleton is unnecessary — show empty fields with placeholder text.
- **Empty (gallery)**: "No articles yet. Create your first knowledge base article to share knowledge with your team." + "Create Article" CTA.
- **Empty (search)**: "No articles match your search." + "Create an article about this topic."
- **Empty (category)**: "No articles in this category." + "Create the first one."
- **Error (list)**: "Failed to load articles" + Retry button.
- **Error (article)**: "This article could not be loaded. It may have been deleted." + "Back to Knowledge Base" link.
- **Error (save)**: Toast "Failed to save. [Retry] [Discard changes]".

---

## CRITIQUE: KB Missing Features

### 1. Auto-Capture from Resolved Issues — Zero Backend Support

The superprompt describes: "When a support ticket is resolved, the solution is automatically captured as a KB article."

**Reality:** There is no endpoint for extracting solutions from tickets, no pipeline that connects ticket resolution to KB creation, no deduplication logic, no AI summarization of the resolution thread. This is vaporware.

**v1:** Manual KB creation only. Users write articles themselves.

**v2:** A `POST /api/ai/kb/extract-from-ticket/{ticketId}` endpoint that:
- Reads the ticket's comment thread
- Identifies the solution (last comment by assignee? marked as "solution"?)
- Summarizes the resolution
- Creates a draft KB article for review

**v3:** Automatic extraction on ticket close (webhook → AI summary → draft article → notification to author).

### 2. Rich Text Content vs Document Model

The current document endpoints may store content as plain text or markdown, not Tiptap JSON. If the backend only accepts plain text, the rich text editor is useless — the formatting will be stripped on save.

**Requirement:** Verify that PUT /api/workspaces/{id}/documents/{docId} accepts `content` as JSON object (`{type: "doc", content: [...]}`) and stores it verbatim. If not, the KB feature requires a backend schema change.

### 3. No Category or Tag Management Endpoints

Categories and tags are essential for KB navigation. If the backend doesn't have dedicated endpoints for these, the frontend has to:
- Store categories inline in the article document (`category: {id, name}`) — fragile, no reusability
- OR extract all tags from all articles on every page load — O(n) scan per request, O(1M) at scale

**Requirement:** Add `GET/POST/PUT/DELETE /api/workspaces/{id}/kb-categories` and a dedicated tagging system.

---

## File Management

### Route

```
/workspaces/{workspaceId}/files → FilesPage (universal file hub)
```

### Concept

A single unified view of ALL files uploaded across the entire workspace — from task attachments, ticket attachments, KB article images, message attachments, and any other file upload. This is NOT a separate storage — it's a lens over the existing upload system.

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Files                              [Upload]  [⚙]        │
│                                                           │
│  [Search files...                              🔍]       │
│  [All Types ▼]  [All Projects ▼]  [Sort: Newest ▼]      │
│                                                           │
│  ┌──────┬──────────┬────────┬────────┬────────┬────────┐ │
│  │      │ Name     │ Size   │ Type   │ Upload │ Links  │ │
│  │      │          │        │        │ ed By  │        │ │
│  ├──────┼──────────┼────────┼────────┼────────┼────────┤ │
│  │ 🖼   │ mockup   │ 2.4 MB │ PNG    │ Jane   │ Task   │ │
│  │      │ .png     │        │        │        │ #142   │ │
│  ├──────┼──────────┼────────┼────────┼────────┼────────┤ │
│  │ 📄   │ report   │ 845 KB │ PDF    │ John   │ Ticket │ │
│  │      │ .pdf     │        │        │        │ #89    │ │
│  ├──────┼──────────┼────────┼────────┼────────┼────────┤ │
│  │ 📊   │ metrics  │ 3.1 MB │ XLSX   │ Jane   │ KB Art │ │
│  │      │ .xlsx    │        │        │        │        │ │
│  ├──────┼──────────┼────────┼────────┼────────┼────────┤ │
│  │ 🔧   │ deploy   │ 156 KB │ ZIP    │ DevOps │ Task   │ │
│  │      │ .zip     │        │        │        │ #201   │ │
│  └──────┴──────────┴────────┴────────┴────────┴────────┘ │
│                                                           │
│  Showing 1-20 of 147 files                    [1] [2] ▶  │
└───────────────────────────────────────────────────────────┘
```

### Component Tree

```
FilesPage
├── FilesHeader (title, Upload button, settings)
├── FilesSearchAndFilter (search input + type/project/sort dropdowns)
├── FileTable
│   ├── FileRow (x N)
│   │   ├── FileIcon (type-based: image, pdf, doc, zip, etc.)
│   │   ├── FileName (click → preview)
│   │   ├── FileSize (human-readable: "2.4 MB")
│   │   ├── FileType (MIME category: PNG, PDF, XLSX)
│   │   ├── UploadedBy (avatar + name)
│   │   ├── LinkedEntities (chip list: task #142, ticket #89)
│   │   └── ContextMenu (download, delete, copy link, view details)
│   └── Pagination
├── FilePreviewModal (overlay)
│   ├── ImagePreview (full-resolution, zoom, pan)
│   ├── PDFPreview (embedded viewer, page navigation)
│   ├── DocumentPreview (text/code with syntax highlighting)
│   └── UnsupportedPreview ("Preview not available for this file type" + download CTA)
├── FileDetailDrawer (right panel)
│   ├── FileMetadata (name, size, type, uploaded by, date, dimensions)
│   ├── LinkedEntities (list of entities this file is attached to)
│   ├── VersionInfo (v1 — no versioning, "v1" only)
│   └── Actions (download, delete, move to folder)
├── UploadModal (drag-and-drop zone)
│   ├── DropZone (visible border dashed, drag-active highlight)
│   ├── FileList (pending files with name, size, progress bar)
│   ├── UploadButton (triggers POST /api/upload)
│   └── CancelButton (abort upload)
└── EmptyState / LoadingState / ErrorState
```

### API Integration

| Action | Endpoint | Optimistic | Notes |
|--------|----------|------------|-------|
| List all files | GET /api/workspaces/{id}/files | No | **Does not exist.** Need new endpoint returning all files with metadata |
| Upload file | POST /api/upload | No | Returns file ID and URL |
| Delete file | DELETE /api/upload/{id} | Yes | Revert on error |
| Get file metadata | GET /api/upload/{id} | No | Returns name, size, type, uploaded_by, created_at |

**BRUTAL CALL-OUT: There is no endpoint to list ALL files in a workspace.** The upload endpoint exists for uploading, but there's no way to query "give me all files across all entities in this workspace." The FilesPage requires a new backend endpoint: `GET /api/workspaces/{id}/files` that returns a paginated, filterable, searchable list of all files with their linked entities.

### Upload with Drag-and-Drop

```
┌──────────────────────────────────────────────────┐
│  Upload Files                         [×] Close  │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │  Drop files here or click to browse       │    │
│  │                                           │    │
│  │  📁 [Browse Files]                        │    │
│  │                                           │    │
│  │  Max file size: 50MB per file             │    │
│  │  Supported: PNG, JPG, PDF, DOCX, XLSX,   │    │
│  │            ZIP, CSV, MD, TXT              │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                    │
│  Pending files:                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ mockup-v2.png    2.4 MB  ████████░░░ 70% │    │
│  │                                            │    │
│  │ [Cancel]                                   │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ report-q2.pdf   1.2 MB  [Pending]         │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  [Upload 2 files]                                  │
└──────────────────────────────────────────────────┘
```

- Drag-and-drop zone with dashed border, blue highlight on drag-over.
- Click zone → OS file picker (accept multiple).
- Client-side validation: file size (50MB limit), file type (whitelist).
- After drop: file appears in pending list with progress bars.
- Multi-file upload: files upload in parallel (max 3 concurrent).
- Progress: track per-file using `XMLHttpRequest.upload.onprogress` (fetch doesn't support progress tracking — use XHR for uploads).
- On success: file appears in the file table.
- On failure: red error on the file row + retry button.

### File Preview

- **Images** (PNG, JPG, GIF, SVG, WebP): Full-resolution display in modal. Zoom with scroll wheel. Pan when zoomed. Download button.
- **PDFs**: Embedded `<iframe>` with PDF.js or Google Docs Viewer fallback. Page navigation. Download button.
- **Code/Text** (MD, TXT, JS, PY, TS, CSS, HTML, JSON, YAML, XML): Fetch and display with syntax highlighting (`highlight.js` or `prism.js`). Raw line count. Copy button.
- **Office docs** (DOCX, XLSX, PPTX): "Preview not available. Download to view." Message + download button.
- **Archives** (ZIP, RAR, 7Z, TAR, GZ): List of contents (file names + sizes) extracted client-side or from server metadata. Download button.
- **Other**: Generic file icon + metadata. Download button.

### File Details Drawer

Right-side drawer (380px wide) triggered by clicking a file row:

```
┌────────────────────────────────────┐
│  File Details          [×] Close   │
├────────────────────────────────────┤
│  🖼                                │
│  mockup-v2.png                     │
│                                    │
│  Size:       2.4 MB               │
│  Type:       PNG Image             │
│  Dimensions: 1920 × 1080          │
│  Uploaded:   May 27, 2026         │
│  By:         Jane Smith           │
│  Version:    v1 (no versioning)   │
│                                    │
│  ── Linked Entities ──            │
│  📋 Task #142 — Design login      │
│  💬 Message in Sprint Planning    │
│                                    │
│  [Download]  [Delete]  [Copy Link] │
└────────────────────────────────────┘
```

**BRUTAL CALL-OUT: "Linked Entities" requires a `file_attachments` join table in the backend that maps file IDs to entity IDs + entity types. Without this, the frontend cannot show what a file belongs to. The current upload endpoint just stores a file — there's no entity linking.**

### Loading / Empty / Error States — Files

- **Loading (table)**: 8 skeleton rows (icon + 4 columns of gray blocks with shimmer).
- **Empty**: "No files uploaded yet. Upload a file to get started." + "Upload" CTA.
- **Empty (search)**: "No files match your search." Clear search button.
- **Error (list)**: "Failed to load files" + Retry button.
- **Error (upload)**: Toast "Upload failed. [Retry]" per file. Network error: banner "Connection lost. Uploads paused."
- **Empty (preview)**: "This file could not be previewed." + download link.

---

## CRITIQUE: File Management Missing Features

### 1. No File Versioning

The superprompt describes: "File versioning with history, ability to restore previous versions."

**Reality:** The upload endpoint stores one file per ID. There is no concept of version groups, no `file_group_id` linking multiple uploads as versions of the same file, no version history endpoint.

**v1:** Every upload is a standalone file. No versioning. File detail drawer shows "v1" always.

**v2:** Require backend `file_groups` table:
```sql
CREATE TABLE file_groups (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  current_version_id UUID -- FK to uploads
);
```
Each upload belongs to a `file_group`. File detail drawer shows version list with restore.

### 2. No Cloud Storage Integration

The superprompt describes: "Google Drive, OneDrive, Dropbox integration."

**Reality:** No OAuth flows, no 3rd-party API integrations, no file picker SDKs. The only upload is direct to Aquerii's own storage.

**v1:** Direct upload only.

**v2:** Integrate with each provider's Picker API (Google Picker, OneDrive File Picker, Dropbox Chooser). This is 1-2 weeks per provider for frontend, plus backend proxy endpoints for server-side downloads.

### 3. No AI File Parsing

The superprompt describes: "AI automatically parses uploaded documents, extracts key information, and links it to relevant entities."

**Reality:** No document parsing service, no OCR, no entity extraction, no auto-linking.

**v1:** Files are stored as-is. No parsing.

**v2:** POST /api/ai/parse-file/{fileId} endpoint that:
- Extracts text from PDFs/DOCX/images (OCR if needed)
- Identifies entities (dates, people, task references)
- Suggests links to existing tasks/tickets
- Returns structured metadata stored alongside the file

### 4. No Batch Operations

The file table has no multi-select, no batch download, no batch delete. For power users managing hundreds of files, this is a pain point.

**v1:** Single-file operations only. Accept the limitation.

**v2:** Add checkbox column, selection bar with "Delete N files" and "Download N files as ZIP" actions.

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **KB article CRUD** | ⚠️ Reuse documents API | Needs `type`, `category_id`, `tags` fields on document model |
| **KB categories** | ❌ No endpoint | New categories CRUD endpoint needed |
| **KB tags** | ⚠️ Depends on tags field | Must be stored/searchable on document model |
| **KB rich text editor** | ⚠️ Depends on content format | Backend must accept/store Tiptap JSON, not plain text |
| **KB version history** | ❌ No backend | Needs `document_versions` table + restore endpoint |
| **KB auto-capture from issues** | ❌ Does not exist | AI pipeline needed — not a v1 feature |
| **KB search** | ⚠️ Depends on search API | Search must support `type` filtering |
| **File hub — list all files** | ❌ No endpoint | `GET /api/workspaces/{id}/files` required |
| **File upload** | ✅ Basic | POST /api/upload exists |
| **File delete** | ✅ Basic | DELETE /api/upload/{id} exists |
| **File preview** | ✅ Frontend only | No backend support needed for common types |
| **Linked entities** | ❌ No join table | `file_attachments` table required |
| **File versioning** | ❌ Does not exist | `file_groups` table + version endpoints needed |
| **Cloud storage integration** | ❌ Does not exist | 1-2 weeks per provider — not v1 |
| **AI file parsing** | ❌ Does not exist | Full AI pipeline needed — not v1 |
| **Batch operations** | ❌ Not designed | Add multi-select + batch actions in v2 |
