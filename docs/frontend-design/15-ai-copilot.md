# 15 — AI Copilot

---

## AIChatPage

### Route

```
/workspaces/{workspaceId}/ai → AIChatPage
```

### Layout

Split-panel layout: left sidebar (session list, 320px) + right main area (chat panel). Responsive: on <768px, sidebar becomes a slide-over drawer.

### Component Tree

```
AIChatPage
├── AISidebar
│   ├── SidebarHeader ("Copilot" title, New Chat button)
│   ├── SessionSearchInput (local filter, debounced 200ms)
│   ├── SessionList (scrollable)
│   │   └── SessionListItem (x N)
│   │       ├── SessionTitle (truncated, click to select)
│   │       ├── LastMessagePreview (gray, 1 line)
│   │       ├── Timestamp (relative: "2m ago")
│   │       └── ContextMenu (rename, delete)
│   └── CreditsFooter
│       ├── CreditBar (used / limit, visual progress bar)
│       └── UpgradeCTA (button → billing page)
├── ChatPanel
│   ├── ChatHeader
│   │   ├── CurrentSessionTitle (editable, inline rename)
│   │   └── OnlineIndicator (green dot + "AI Online")
│   ├── MessageList (scrollable, reverse-chronological)
│   │   └── MessageBubble (x N)
│   │       ├── UserMessage (right-aligned, user avatar + content)
│   │       ├── AIMessage (left-aligned, AI avatar + streaming content)
│   │       ├── TaskCreateMessage (AI card + "Create Task" action button)
│   │       ├── SummaryCardMessage (AI card with structured summary)
│   │       └── DataQueryResultMessage (table/chart rendering)
│   ├── StreamingIndicator (animated dots while AI responds)
│   ├── SuggestedPromptsBar (horizontal scrollable chips)
│   └── ChatInput
│       ├── TextArea (auto-resize, 1-4 lines, Enter to send, Shift+Enter newline)
│       ├── AttachmentButton (clip icon — file upload)
│       └── VoiceButton (microphone icon — placeholder, shows "Coming Soon" tooltip)
├── CreditLimitModal (shown when credits exhausted)
└── SessionDeleteConfirmDialog
```

### Data Flow

#### API Integration

| Action | Endpoint | Optimistic | Notes |
|--------|----------|------------|-------|
| List sessions | GET /api/ai/sessions | No | Sorted by updated_at desc |
| Create session | POST /api/ai/sessions | Yes | Temp ID, body: {title} |
| Rename session | PUT /api/ai/sessions/{id} | Yes | body: {title} |
| Delete session | DELETE /api/ai/sessions/{id} | Yes | Remove from list immediately |
| List messages | GET /api/ai/sessions/{id}/messages | No | Pageable, newest last |
| Send message | POST /api/ai/sessions/{id}/messages | Partial | Add user message immediately; AI response streams in |
| Get credits | GET /api/ai/credits | No | {used, limit, is_premium} |

### State Management

```typescript
type AIChatState = {
  sessions: AISession[];
  activeSessionId: string | null;
  messages: Message[];
  streamingContent: string; // partial text being received
  streaming: boolean;
  credits: { used: number; limit: number; is_premium: boolean };
  loading: 'idle' | 'loading-sessions' | 'loading-messages' | 'error';
  error: string | null;
  sessionSearchQuery: string;
  suggestedPrompts: string[];
};
```

Use `useReducer` with context. `streamingContent` is the key piece — it holds the partial response text while the SSE/stream is active, then is appended to `messages` on completion.

### Session Management

- **New Chat**: POST /api/ai/sessions → create with default title "New Chat" → switch to new session → focus input.
- **Rename**: Click title → inline edit → PUT on blur or Enter. Escape cancels. If session is <2 messages, auto-generate title from first AI response (backend should return generated title, not "New Chat").
- **Delete**: Context menu → confirm dialog → DELETE → remove from list. If deleted session was active, switch to most recent remaining session.
- **List**: Fetched on mount. Poll every 30s or rely on socket event `ai:session_updated`.
- **Auto-title**: Backend should generate a title from the first user message. If backend returns `title: null` on create, frontend shows "New Chat" until backend updates it. **BRUTAL CALL-OUT: If the backend doesn't auto-generate titles, every session appears as "New Chat" until the user manually renames it. This creates confusion with 10+ sessions. Request backend generate titles from message content.**

### Message Types

#### UserMessage

```
┌──────────────────────────────────────┐
│  How do I set up a recurring task?   │
│                             10:32 AM │
│                              [Avatar]│
└──────────────────────────────────────┘
```
- Right-aligned. User avatar on the right. Content as markdown (text only — user cannot send rich content).
- Timestamp below content.

#### AIMessage

```
┌──────────────────────────────────────┐
│ [Avatar]  You can set up a recurring │
│           task by going to...        │
│                        10:32 AM      │
└──────────────────────────────────────┘
```
- Left-aligned. AI avatar on the left (robot icon or workspace logo).
- Content rendered as markdown (code blocks with syntax highlighting, bold, lists, links).
- Streaming: characters appear in real-time. See "Streaming Response Handling" below.

#### TaskCreateMessage

```
┌──────────────────────────────────────┐
│ [Avatar]  I found these action items │
│           from your message:         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📋 Design login page mockup   │  │
│  │    Priority: High             │  │
│  │    Due: Tomorrow              │  │
│  │                              │  │
│  │    [Create Task]              │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 📋 Write API integration      │  │
│  │    Priority: Medium           │  │
│  │    Due: Friday                │  │
│  │                              │  │
│  │    [Create Task]              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```
- AI response contains structured action items with title, priority, due date.
- Each item is a card with a "Create Task" button.
- Click "Create Task": POST /api/workspaces/{id}/items with prefilled data → button changes to "Created ✓" (disabled) → show success toast.
- **CRITIQUE: This requires the AI to output structured JSON that the frontend parses. Backend must return tasks as `{type: "task_suggestion", tasks: [...]}` in the response. Without structured output, the frontend would need to regex-parse markdown, which is fragile. v1: ship without this until backend supports structured AI responses.**

#### SummaryCardMessage

```
┌──────────────────────────────────────┐
│ [Avatar]  Here's a summary of your  │
│           sprint progress:          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Sprint Summary — Sprint 12    │  │
│  │                                │  │
│  │ ✅ Completed: 8 tasks (47%)   │  │
│  │ 🔄 In Progress: 5 tasks (29%) │  │
│  │ ⏳ Pending: 4 tasks (24%)     │  │
│  │                                │  │
│  │  [View in Reports]             │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```
- Rendered as a structured card with data visualizations (simple CSS bar charts, colored status indicators).
- Action button links to the relevant page (Reports, Board, etc.).

#### DataQueryResultMessage

```
┌──────────────────────────────────────┐
│ [Avatar]  Here are your top tickets:│
│                                      │
│  ┌────────────────────────────────┐  │
│  │ #  │ Title           │ Status │  │
│  │ ───┼────────────────┼────────│  │
│  │ 1  │ Login broken   │ Open   │  │
│  │ 2  │ API timeout    │ InProg │  │
│  │ 3  │ UI glitch      │ Open   │  │
│  │                                │  │
│  │  [View All Tickets]            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```
- Simple data table rendered as HTML table within the chat bubble.
- Max 10 rows (pagination note: "Showing 10 of 47 results").

### Streaming Response Handling

The AI response endpoint (POST /api/ai/sessions/{id}/messages) MUST support Server-Sent Events (SSE) or WebSocket streaming. The response is incremental:

```
// SSE event stream:
data: {"type": "token", "content": "Sure"}
data: {"type": "token", "content": ", I can"}
data: {"type": "token", "content": " help with that."}
data: {"type": "done", "full_content": "Sure, I can help with that."}
```

Frontend behavior:
1. On send, immediately render the user message in the MessageList.
2. Create a placeholder AI message at the bottom of the list with `streamingContent: ""`.
3. As SSE events arrive, append each `token.content` to `streamingContent`. React re-renders the message bubble on each token.
4. When `type: "done"` arrives, replace `streamingContent` with `full_content`, add the AI message to the `messages` array, set `streaming: false`, remove the placeholder.
5. If SSE connection drops mid-stream, set `streaming: false`, show error state on the partial message ("Response incomplete — try again"), keep the partial text visible.
6. **Rate limiting**: If the user sends another message while streaming, cancel the current stream, append the partial AI response as-is with a note "[interrupted]", and start the new conversation turn.

### Credit Display

The `CreditsFooter` component shows:

```
┌──────────────────────────────────┐
│  AI Credits                      │
│  ████████░░░░░░░░░░ 150/500     │
│  [Upgrade to Premium →]          │
└──────────────────────────────────┘
```
- Visual progress bar: green (<60%), yellow (60-85%), red (>85%).
- Tooltip on hover: "Resets on May 1, 2026" (from backend `reset_date`).
- Click "Upgrade" → navigate to /workspaces/{id}/settings/billing.
- When credits <= 0: disable input, show "Out of credits" toast, offer upgrade modal.
- **BRUTAL CALL-OUT: GET /api/ai/credits must return `reset_date` and `is_premium`. If backend only returns `used`/`limit`, the progress bar works but upgrade flow has no context. Request at minimum: `{ used: number, limit: number, is_premium: boolean, reset_date: string }`.**

### Suggested Prompts / Quick Actions

Below the chat input, a horizontal scrollable chip bar:

```
[Summarize my day] [What's overdue?] [Create a task] [Help with...]
```

- Chips are contextual: on first load show onboarding prompts ("How do I use boards?", "What can the AI do?").
- After a conversation, show context-aware prompts ("Summarize this board", "Find tasks assigned to me").
- Chips are hardcoded in frontend config (no backend endpoint for suggestions).
- **CRITIQUE: Superprompt calls for "proactive AI suggestions" based on user behavior. This is not possible without a backend recommendation engine. v1 uses static, hardcoded prompts. v2 would need a `POST /api/ai/suggestions` endpoint that takes workspace context and returns personalized prompts.**

### Loading State

- **Session list skeleton**: 8 rows of 3-line skeleton blocks (shimmer animation).
- **Chat skeleton**: Empty state — no skeleton needed for message area (user sees session skeletons first, then empty chat).
- **Message list loading**: If switching to an existing session, show 5 skeleton message bubbles (alternating user/AI) while messages load.
- **Send loading**: User message appears immediately (optimistic). AI placeholder shows streaming dots within 500ms. If no response after 10s, show "Still thinking..." subtitle below dots. After 30s, timeout with error.

### Empty State

```
┌──────────────────────────────────┐
│         🤖                        │
│                                 │
│    How can I help you today?     │
│                                 │
│  [Summarize my day]             │
│  [Create a new task]            │
│  [What's on my plate?]          │
│  [How do I use Kanban boards?]  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Ask me anything...       │  │
│  └──────────────────────────┘  │
└──────────────────────────────────┘
```
- Centered layout. Robot icon (72px).
- Title: "How can I help you today?"
- Suggested prompt chips (4-6) in a grid below the title.
- Empty input field at bottom.

### Error State

- **Session load error**: Red banner "Failed to load conversations" + Retry button. Input still works — new messages create a new session.
- **Message send error**: Toast "Failed to send message. [Retry]" — the user message stays in the list with a red "Failed" badge. Click Retry to re-send.
- **Streaming error**: Partial message shows "Connection lost — [Retry]" at the bottom of the partial content.
- **Credit error**: "Could not load credit info" shown inline in the credits footer (no green/yellow/red bar, just gray text).
- **Network offline**: Input disabled, persistent banner "You're offline. AI Copilot requires an internet connection."

### Voice Input Button

The microphone icon button in the ChatInput is a **placeholder**. On click:

- If browser supports `webkitSpeechRecognition` or `SpeechRecognition`: show "Coming Soon" tooltip. Do NOT implement voice-to-text yet — the superprompt's voice features require audio streaming to backend, storage of voice recordings, and integration with AI transcription. None of this exists.
- If browser doesn't support: button is grayed out with "Not available" tooltip.

---

## CRITIQUE: Missing Backend Features

### 1. Voice Commands — Zero Backend Support

The superprompt describes: "Voice commands for task creation, navigation, and data queries."

**Reality:** No audio upload endpoint, no STT (speech-to-text) service, no voice intent parser, no WebSocket audio stream endpoint. This is not just "not implemented" — the entire infrastructure is missing. Audio processing requires:
- A WebSocket endpoint for real-time audio streaming
- Integration with a STT provider (Whisper, Deepgram, Google STT)
- An NLP pipeline to parse transcribed text into intents
- A voice activity detection (VAD) system on the server to know when the user stopped speaking

**v1:** Ship text-only. Voice button shows "Coming Soon." No audio capture at all.

**v2 estimate:** 4-6 weeks backend + AI work, plus frontend audio capture library (e.g., `react-media-recorder`).

### 2. Proactive AI Intervention — Zero Backend Support

The superprompt describes: "AI proactively flags risks, suggests optimizations, and intervenes when patterns are detected."

**Reality:** The backend has no event pipeline, no pattern detection system, no anomaly detection service, no proactive notification mechanism. This requires:
- A real-time event bus that streams all workspace actions to a detection service
- An ML pipeline or rule engine that identifies patterns (stale tasks, scope creep, missed deadlines)
- A notification system that can push proactive messages into the AI chat ("Hey, I noticed 3 tasks are overdue. Want me to ...")
- Permission to act: the AI cannot proactively modify data without user authorization — this requires escalation UX

**v1:** AI only responds when asked. No proactive behavior.

**v2 estimate:** 6-10 weeks. This is a major feature requiring data science + backend + ML infrastructure.

### 3. Natural Language Action Engine — Zero Backend Support

The superprompt describes: "Users can type 'Move the high-priority tasks to the Review column and assign them to Jane' and the AI executes it."

**Reality:** This requires:
- An intent classification system that maps natural language to API actions
- A parameter extraction system (NER) to pull entities ("high-priority", "Review column", "Jane")
- A multi-step action executor with rollback on failure
- User confirmation UI ("I'll move 3 tasks. Proceed?")
- The backend AI is a basic Q&A chat — no function calling, no tool use, no structured output contract.

**v1:** Chat-only. AI explains how to do things but cannot execute them.

**v2 estimate:** 8-12 weeks. Needs a structured action schema, function-calling LLM integration, and a trust-but-verify execution engine.

### 4. AI Scoring Transparency

The superprompt / CRM section references "AI lead scoring" and "AI deal insights." **These produce a magic number with zero explainability.** A salesperson who sees "Score: 87" has no idea why — is it because they opened the email? Because their company matches the ICP? Because they visited the pricing page?

**Requirement:** Every AI score must include a breakdown:
```typescript
type AIScoreBreakdown = {
  total: number; // 0-100
  factors: Array<{
    name: string;        // "Email engagement"
    value: number;       // 23
    weight: number;      // 0.3
    description: string; // "Opened 3 of 5 emails in the last 7 days"
  }>;
};
```
Without this, the score is meaningless and untrustworthy. Do not ship AI scoring without explainability.

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Session CRUD** | ✅ Full backend | None |
| **Message list** | ✅ Full backend | None |
| **Send message (basic)** | ✅ Full backend | Must support SSE streaming |
| **SSE streaming** | ⚠️ Unknown | Backend must implement SSE or WS for token-by-token output |
| **Credit tracking** | ✅ Basic | Needs `reset_date` and `is_premium` in response |
| **Auto-title sessions** | ⚠️ Unknown | Backend should generate title from first message |
| **Structured AI output** | ❌ Not exist | Needed for TaskCreateMessage, SummaryCard, DataQuery types |
| **Voice commands** | ❌ Not exist | Full audio pipeline needed — not a v1 feature |
| **Proactive AI intervention** | ❌ Not exist | Event bus + pattern detection + notification pipeline needed |
| **Natural language action engine** | ❌ Not exist | Function calling + intent classification + executor needed |
| **AI scoring explainability** | ❌ Not exist | Score breakdown required — magic number is unacceptable |
| **Suggested prompts API** | ❌ Not exist | v1 uses hardcoded prompts; v2 needs personalization endpoint |

---

## Build Status

### Built (v0.1)
| Component | Files | Tests | Status |
|-----------|-------|-------|--------|
| `ChatInput` | `src/components/ai/ChatInput.tsx` | 9 tests | ✅ All pass |
| `ChatThread` | `src/components/ai/ChatThread.tsx` | 7 tests | ✅ All pass |
| `SuggestedPrompts` | `src/components/ai/SuggestedPrompts.tsx` | 4 tests | ✅ All pass |
| `AIChatPage` | `src/pages/ai/AIChatPage.tsx` | — | ✅ Rewritten, 0 new TS errors |

### Architecture
- **ChatInput**: Auto-growing textarea, Enter to send / Shift+Enter newline, loading spinner, disabled state with reason
- **ChatThread**: Role-aligned bubbles (user right, AI left), animated typing indicator (3 bouncing dots), auto-scroll, whitespace-preserving content, empty state slot
- **SuggestedPrompts**: 2×2 grid of clickable prompt chips, disabled state, empty array guard
- **AIChatPage**: Uses all 3 components, credit bar with color-coded threshold (green/yellow/red), retry last response, low-credit and out-of-credit UX

### Backend Gaps
- No session CRUD (sessions, messages, session rename) — full-page single conversation only
- No SSE streaming — all responses wait for full completion
- No `reset_date` / `is_premium` on credits endpoint
- No session auto-titling
