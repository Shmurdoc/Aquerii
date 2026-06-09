# 13 — Email, Documents, HR

---

## EmailPage

### Route

```
/email → EmailPage
```

### 3-Panel Layout

```
┌──────────────┬──────────────────────────────────┬──────────────────────────┐
│  Folders     │  Message List                     │  Message Viewer          │
│              │                                    │                          │
│  [Compose]   │  Search messages...                │  Subject: RE: Q2 Budget  │
│──────────────│────────────────────────────────────│─────────────────────────│
│  📥 Inbox 24 │  John Doe     RE: Q2 Budget   2h  │  From: John Doe          │
│  📤 Sent     │  Acme Corp   Invoice INV-042  1d  │  To: me, alice@...       │
│  📋 Drafts 3 │  Jane Smith  Sprint Review    2d  │  Date: May 1, 2026       │
│  🗑 Trash    │  ...                              │                          │
│              │                                    │  ┌──────────────────┐   │
│  Accounts    │                                    │  │  Message body     │   │
│  ──────────  │                                    │  │  (HTML rendered)  │   │
│  user@acme   │                                    │  │                   │   │
│  + Add Acct  │                                    │  └──────────────────┘   │
│              │                                    │                          │
│  Signatures  │                                    │  [Reply] [Reply All]    │
│  ──────────  │                                    │  [Forward] [Delete]     │
│  Default     │                                    │                          │
│  + Add Sig   │                                    │                          │
└──────────────┴──────────────────────────────────┴──────────────────────────┘
```

Backend: GET/POST /api/email/messages, GET/PUT/DELETE .../{messageId}, GET/POST /api/email/accounts, GET/PUT/DELETE .../{accountId}, GET/POST /api/email/signatures, GET/PUT/DELETE .../{signatureId} — all fully implemented.

### Left Panel (Folders, Accounts, Signatures)
- **Folder list**: hardcoded labels (Inbox, Sent, Drafts, Trash) with unread count badges. Active folder highlighted.
- **Account management**: list of connected email accounts. "Add Account" button opens modal with IMAP/SMTP fields.
  - Add Account modal: Email, Display Name, IMAP Host/Port/Secure, SMTP Host/Port/Secure, Username, Password. Test connection button before save.
  - Each account row has edit/delete actions in a "..." menu.
- **Signatures**: list of saved signatures. "Add Signature" opens modal with name + rich text editor (TinyMCE or TipTap). Each signature has edit/delete.

### Middle Panel (Message List)
- Search bar at top: full-text search within messages. Debounced 300ms. Filters message list.
- Message rows: Sender avatar (32px, first letter fallback), Sender name, Subject, Preview snippet (first 50 chars of body), Date/Time (relative: "2h", "1d", "May 1"), attachment icon if has attachments, unread indicator (blue dot).
- Click row: mark as read (PATCH if read status endpoint existed — see callouts), populate viewer.
- Selected row: blue left border, light blue background.
- **Empty state**: "No messages in this folder."
- **Loading state**: skeleton list rows.

### Right Panel (Message Viewer)
- Header: Subject, From, To, Cc, Date, attachment list (with download links).
- Body rendered as HTML in an iframe (sanitized via DOMPurify to prevent XSS).
- Action buttons: Reply, Reply All, Forward, Delete.
  - Reply/Reply All: opens compose modal pre-filled with original subject ("RE: ..."), quoted body.
  - Forward: opens compose modal with "FW: ..." subject, forwarded body.
  - Delete: confirm dialog, DELETE /api/email/messages/{messageId}. On success: remove from list, show next message.

### Compose Modal (full-screen slide-over)
- Fields: To (email chips input, autocomplete from contacts), Cc, Bcc, Subject.
- Body: Rich text editor (TipTap recommended — lightweight). Toolbar: bold, italic, underline, bullet list, ordered list, link insert, image embed.
- Attachments: drag-drop zone or file picker. Shows file name, size, progress bar during upload.
- Signature selector: dropdown at bottom. Selected signature appended to body on open.
- Actions: Send (POST /api/email/messages), Save Draft (POST with status=draft), Discard (confirm dialog).
- On send: validate at least one recipient, subject required (warn but not block), body not empty.

---

### BRUTAL CALL-OUTS — Email

| Issue | Detail |
|-------|--------|
| **No mark-read endpoint** | The design assumes PATCH /api/email/messages/{id}/read or similar. Backend has PUT .../{messageId} only. Read status must be updated via PUT with the full message body, or a new endpoint must be added. |
| **No attachment upload endpoint** | Compose modal allows file attachments, but there's no dedicated attachment endpoint. Attachments would need to be sent as multipart/form-data in the POST /api/email/messages request, or a separate upload-then-reference flow is needed. |
| **No contacts autocomplete** | The To/Cc/Bcc fields use a contacts autocomplete. The backend reference does not include a Contacts API. This must come from somewhere (CRM leads? Employees? New contacts endpoint?). |
| **IMAP/SMTP test connection** | Add Account modal includes "Test Connection." No backend endpoint exists for this. A new POST /api/email/accounts/test is needed. |
| **HTML sanitization** | DOMPurify is mandatory before rendering email HTML. Backend does not sanitize — that's a frontend responsibility. Failure to sanitize is an XSS vulnerability. |

---

## DocumentsPage

### Route

```
/documents → DocumentsPage
```

### Layout

```
┌──────────────┬──────────────────────────────────────────┐
│  Folders     │  Document List                           │
│              │                                          │
│  📁 /        │  [+ New Document]  [Upload Files]        │
│  📁 Projects │                                          │
│    📁 Q2     │  Name             Updated      Size      │
│    📁 Q3     │  ─────────────────────────────────────  │
│  📁 Templates│  Specs.docx       May 1        245 KB    │
│  📁 Archive  │  Notes.md         Apr 30       12 KB     │
│              │  Wireframes.fig   Apr 28       8 MB      │
│  + New Folder│  ...                                      │
└──────────────┴──────────────────────────────────────────┘
```

Backend: GET/POST /api/workspaces/{id}/documents, GET/PUT/DELETE .../{docId} — fully implemented.

### Folder Sidebar (left, 240px)
- Tree structure with expand/collapse arrows.
- "New Folder" button at bottom: text input appears inline, creates folder via POST (if backend supports folder hierarchy — see callouts).
- Right-click context menu: Rename, Delete, New Document.
- Active folder highlighted. Root folder ("/") shows all documents.

### Document List (center, flexible)
- Table columns: Name (with file type icon), Last Updated (relative), Size (human-readable), Actions.
- Actions: Rename (inline edit on name), Delete (confirm dialog), Download (GET).
- **New Document**: Modal with name input + template dropdown (blank/markdown/docx) + folder selector.
- **Upload Files**: Drag-drop zone or file picker. Multi-file upload. Shows progress per file. POST each file to /api/workspaces/{id}/documents.
- **Empty state**: "No documents yet. Drag files here or create one."

### Document Editor/Viewer
- Clicking a document opens it in a detail view replacing the list (breadcrumb at top to go back).
- **Text documents**: TipTap or CodeMirror editor (monaco), depending on file type. Auto-save with debounce (500ms), save indicator in corner.
- **PDFs/Images**: Viewer component (PDF.js for PDFs, <img> for images).
- **Other files**: Download link with file type icon.
- Document title editable in header (inline, autosave).

### Drag-and-Drop Upload
- Entire document list area is a drop target.
- Visual overlay on drag: dashed border, "Drop files here" text, semi-transparent background.
- File type validation: accept common doc types (pdf, docx, xlsx, txt, md, png, jpg, svg). Rejected files shown in toast with reason.
- Max file size: 50MB (configurable, enforced client-side before upload).

---

### BRUTAL CALL-OUTS — Documents

| Issue | Detail |
|-------|--------|
| **Missing update/delete mutations** | The backend reference only lists GET/POST. PUT/DELETE endpoints must be added for the frontend to work. The design correctly includes edit, rename, delete operations. This is a backend gap. |
| **Folder hierarchy** | Backend has no folder/collection concept beyond GET/POST .../documents. The entire folder tree sidebar is aspirational unless a categories or folders endpoint is added. Workaround: use a `folder` field on the document model and group client-side. |
| **File upload endpoint** | POST /api/workspaces/{id}/documents may or may not accept file uploads (multipart). The current design assumes it does. If documents are currently JSON-only (title, body), this needs backend changes. |
| **Rich document editing** | TipTap/CodeMirror editing assumes the document content is stored as a JSON string or raw text. Confirm backend stores document body as text. If not, a conversion layer is needed. |
| **Auto-save** | 500ms debounce auto-save means many PUT requests. Backend must handle concurrent save requests gracefully (last-write-wins is acceptable for MVP). |

---

## EmployeePage

### Route

```
/employees → EmployeePage
/employees/leave → LeaveRequestsPage
/employees/departments → DepartmentsPage
```

Backend: GET/POST /api/employees, GET/PUT/DELETE .../{id}, GET/POST /api/leave-requests, GET/PUT/DELETE .../{id}, GET/POST /api/departments, GET/PUT/DELETE .../{id} — all fully implemented.

### Employee Directory

```
┌──────────────────────────────────────────────────────────────────┐
│  Employees                                              [+ Add]  │
├────────────┬─────────────────────────────────────────────────────┤
│  Department│  Search name, email...                              │
│  Filter    │                                                     │
│  ──────────│  ┌──────────────────────────────────────────────┐  │
│  All       │  │  [Avatar] Jane Smith  jane@acme.com         │  │
│  Eng       │  │            Engineering • Senior Developer   │  │
│  Sales     │  │  [Avatar] John Doe    john@acme.com         │  │
│  HR        │  │            Sales • Account Executive        │  │
│  + Add Dept│  │  ...                                        │  │
│            │  └──────────────────────────────────────────────┘  │
└────────────┴─────────────────────────────────────────────────────┘
```

- **Department filter** (left): list of departments from GET /api/departments. Click to filter. "All" selected by default. "Add Department" button at bottom.
- **Employee cards** (grid, 3 columns on large screens, 2 on medium, 1 on small):
  - Avatar (48px, circular, fallback initials).
  - Name (14px semibold), Role (12px gray), Department badge, Email (linked `mailto:`), Phone (linked `tel:`).
  - Actions dropdown: Edit, Delete (with confirmation).
- **Add Employee**: slide-over modal with fields: First Name*, Last Name*, Email*, Phone, Department (dropdown), Role/Title*, Avatar upload. Submit POST /api/employees.
- **Edit Employee**: same modal, pre-filled, PUT /api/employees/{id}.
- **Empty state**: "No employees yet. Add your first team member."
- **Search**: text input at top. Debounced 300ms. Filters by name and email.

### Leave Requests Tab (sub-tab within EmployeePage or separate route)

```
┌─────────────────────────────────────────────────────────┐
│  Leave Requests                         [+ New Request]  │
├──────────┬──────────┬────────┬───────────┬───────────────┤
│  Filter: │  Pending │ Approved │ Rejected │ All           │
├──────────┼──────────┼────────┼───────────┼───────────────┤
│  Employee│  Type    │  Dates  │  Status   │  Actions      │
│  Jane    │  Vacation│ 05/10  │  ● Pending│  [Approve]     │
│          │          │  →05/14│           │  [Reject]      │
│  John    │  Sick    │ 05/01  │  ● Approved│              │
└──────────┴──────────┴────────┴───────────┴───────────────┘
```

- Filter tabs: All, Pending, Approved, Rejected.
- Table: Employee name, Leave Type (vacation/sick/personal/other), Start Date → End Date, Duration (business days), Status badge, Actions.
- Actions: Approve, Reject (only for pending). Confirm dialog for reject with reason textarea.
- **New Request**: Modal with employee dropdown (pre-filled if viewing from employee profile), type, start date, end date, reason (textarea). Submit POST /api/leave-requests.
- **BRUTAL CALL-OUT: No leave balance/accrual endpoint exists.** The design above shows remaining PTO or sick days. This data would need to be computed from leave requests, or a new endpoint added.
- **Approval workflow**: Approve/Reject actions require a PATCH endpoint to update status. Backend only has PUT .../{id}. Use PUT with full payload for now.

### Department Management

- **List**: GET /api/departments returns list. Shown as card grid (name, head count, manager name).
- **Add Department**: Modal with Name*, Manager (employee dropdown), Description.
- **Edit/Delete**: Per-department actions. Delete blocked if employees are assigned to department. Warning tooltip explains.
- Empty state: "No departments yet. Organize your team."

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Email messages CRUD | ✅ Full backend | None |
| Email accounts CRUD | ✅ Full backend | None |
| Email signatures CRUD | ✅ Full backend | None |
| **Mark message read** | ❌ **No endpoint** | Needs PATCH endpoint or use PUT |
| **Attachment upload** | ❌ **Unclear** | Needs multipart support or separate endpoint |
| **IMAP/SMTP test** | ❌ **No endpoint** | Needs new endpoint |
| **Contacts autocomplete** | ❌ **No contacts API** | Needs new endpoint or use existing data |
| Documents CRUD | ✅ GET/POST | ❌ **PUT/DELETE missing** |
| **Folder hierarchy** | ❌ **No endpoint** | Not supported — group client-side by folder field |
| Employees CRUD | ✅ Full backend | None |
| Leave requests CRUD | ✅ Full backend | None |
| **Leave balance** | ❌ **No endpoint** | Compute from requests or new endpoint |
| **Leave approve/reject** | ⚠️ Partial | Use PUT with status change |
| Departments CRUD | ✅ Full backend | None |
| **HTML sanitization** | Frontend responsibility | DOMPurify required before rendering email body |
