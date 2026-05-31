# FlowOS — AI Strategy (Gemini + Claude)

**Version**: 1.0  
**Models**: Google Gemini 1.5 Pro/Flash + Anthropic Claude 3.5 Sonnet  
**Service**: Python FastAPI (`services/ai/`)  
**Principle**: AI is ambient — every feature surface has an AI enhancement. No separate "AI mode."

---

## 1. Model Assignment Strategy

| Use Case | Model | Reason |
|----------|-------|--------|
| Task description generation | Gemini Flash | Fast, cheap, real-time |
| Subtask generation from title | Gemini Flash | < 1s response needed |
| Board summary | Gemini Pro | Needs broader context |
| Automation rule generation | Claude 3.5 Sonnet | Complex conditional logic |
| Document writing assistant | Claude 3.5 Sonnet | Long-context, structured output |
| Document summarization (long) | Claude 3.5 Sonnet | 200k context window |
| CRM deal intelligence | Claude 3.5 Sonnet | Multi-turn, nuanced analysis |
| Lead scoring | Claude 3.5 Sonnet | Reasoning over activity timeline |
| Sprint retrospective | Gemini Pro | Fast, structured output |
| Real-time typing suggestions | Gemini Flash | Latency-critical |
| Knowledge base Q&A | Gemini Flash + RAG | Fast retrieval + generation |
| Flowchart from document | Gemini Pro + pdfplumber | Visual + structured output |
| AI service desk response | Claude 3.5 Sonnet | Accurate, customer-facing |
| Anomaly detection in boards | Gemini Pro | Pattern recognition |
| Email draft (CRM) | Claude 3.5 Sonnet | Tone, persuasion, accuracy |

---

## 2. AI Credit System

### Credit Costs (approximate, calibrated to API costs + margin)

| Action | Credits Used | Model |
|--------|------------|-------|
| Task description generation | 2 | Gemini Flash |
| Subtask generation (5 subtasks) | 5 | Gemini Flash |
| Board summary | 10 | Gemini Pro |
| Short document section (~500 words) | 15 | Claude |
| Long document summary (< 10k words) | 30 | Claude |
| Automation generation | 10 | Claude |
| CRM deal summary | 20 | Claude |
| Lead scoring (single deal) | 15 | Claude |
| Email draft | 10 | Claude |
| Knowledge base query | 5 | Gemini Flash |
| Flowchart generation | 25 | Gemini Pro |
| Sprint retrospective | 20 | Gemini Pro |

### Credit Metering Code Pattern

```python
# services/ai/middleware/credit_meter.py
async def check_and_consume_credits(
    workspace_id: str,
    action: str,
    db: AsyncSession
) -> None:
    cost = AI_CREDIT_COSTS[action]
    workspace = await db.get(Workspace, workspace_id)
    
    if workspace.ai_credits_used + cost > workspace.ai_credits_quota:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "AI_CREDITS_EXHAUSTED",
                "used": workspace.ai_credits_used,
                "quota": workspace.ai_credits_quota,
                "upgrade_url": "https://flowos.app/settings/billing"
            }
        )
    
    # Atomic increment
    await db.execute(
        update(Workspace)
        .where(Workspace.id == workspace_id)
        .values(ai_credits_used=Workspace.ai_credits_used + cost)
    )
```

---

## 3. Feature-by-Feature AI Implementation

### 3.1 AI Task Assistant (Inline, every task)

**Trigger**: User right-clicks item → "Ask AI" or types `/ai` in description

**Capabilities**:
- **Generate description**: Given title "Q3 Product Launch" → writes detailed task description
- **Generate subtasks**: Given title → suggests 5–10 actionable subtasks
- **Summarize thread**: Summarizes all comments + activity into 3-bullet summary
- **Suggest due date**: Based on similar past items + workload → suggests realistic date
- **Risk flag**: "This item is blocking 4 others and is 3 days overdue" → shows alert

```python
# services/ai/routes/task.py
@router.post("/task/generate-description")
async def generate_description(
    payload: TaskDescriptionRequest,
    workspace_id: str = Depends(get_workspace_id),
    _: None = Depends(check_credits("task_description"))
):
    prompt = f"""
    You are a project management assistant.
    Generate a clear, actionable task description for:
    Title: {payload.title}
    Board context: {payload.board_context}
    Team size: {payload.team_size}
    
    Write 2-3 sentences. Be specific and actionable. No fluff.
    """
    response = await gemini_flash.generate_content(prompt)
    return {"description": response.text}
```

---

### 3.2 AI Document Writing Assistant

**Trigger**: Type `/ai` in BlockNote editor → menu appears

**Capabilities**:
- **Continue writing**: extends current paragraph in the same tone
- **Fix spelling & grammar**: corrects the selected block
- **Make shorter / longer**: rewrite at different length
- **Change tone**: professional / casual / technical / friendly
- **Summarize selected text**: condense to 1-2 sentences
- **Translate**: to any language
- **Generate from outline**: user writes bullet points → Claude expands to full sections
- **Insert table**: "Create a comparison table of our 3 competitors"

```python
@router.post("/document/generate")
async def document_generate(
    payload: DocumentGenerateRequest,
    _: None = Depends(check_credits("document_short"))
):
    system = """You are a professional writing assistant embedded in a document editor.
    Write in clear, structured prose. Return only the content, no preamble."""
    
    response = await claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        system=system,
        messages=[{
            "role": "user",
            "content": f"Action: {payload.action}\nContext: {payload.context}\nSelected text: {payload.selected_text}"
        }]
    )
    return {"content": response.content[0].text}
```

---

### 3.3 AI Automation Generator

**Trigger**: In Automation Builder → "Describe what you want to automate"

**Example**:
- User types: "When a task is marked done, notify the client via email and move it to the archive board"
- Claude generates:
```json
{
  "trigger": {"type": "status_changed", "config": {"to": "Done"}},
  "filters": [],
  "actions": [
    {"type": "send_email", "config": {"to": "{{item.contact_email}}", "template": "task_complete"}},
    {"type": "move_item", "config": {"board_id": "archive-board-id"}}
  ]
}
```

```python
@router.post("/automation/generate")
async def generate_automation(payload: AutomationGenerateRequest):
    system = """You are an automation builder for a project management tool.
    Available triggers: {TRIGGERS_LIST}
    Available actions: {ACTIONS_LIST}
    Return valid JSON matching the automation schema. No explanation, JSON only."""
    
    response = await claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        system=system.format(
            TRIGGERS_LIST=json.dumps(AVAILABLE_TRIGGERS),
            ACTIONS_LIST=json.dumps(AVAILABLE_ACTIONS)
        ),
        messages=[{"role": "user", "content": payload.description}]
    )
    automation_json = json.loads(response.content[0].text)
    return {"automation": automation_json}
```

---

### 3.4 AI CRM Intelligence

**Lead Scoring**:
- Claude reads full deal activity timeline (emails, meetings, comments, status changes)
- Outputs score 0–100 + 3-bullet reasoning
- Refresh: on every deal update + daily background refresh

**Next Action Engine**:
- Analyzes: deal stage + days since last activity + contact response pattern
- Outputs: "Suggested: Send proposal. They haven't responded in 5 days and went quiet after the demo call."

**Email Draft**:
- Context: deal title + contact name + stage + last note
- Claude writes personalized follow-up email
- User can edit before sending

---

### 3.5 AI Sprint Retrospective (Dev Plan)

**Trigger**: Sprint ends → "Generate Retrospective" button

**Claude reads**:
- All completed items (with descriptions, time tracked)
- All incomplete items (moved to next sprint)
- Velocity vs. estimate
- Team members who were assigned

**Outputs a retrospective document**:
```markdown
## Sprint 12 Retrospective (generated by FlowOS AI)

### What went well
- Delivered authentication module 2 days ahead of schedule
- Team velocity improved 18% from Sprint 11

### What could improve  
- 3 items moved to next sprint due to scope creep on API design
- 2 bugs found in production that weren't caught in QA

### Action items
1. Add integration tests for API endpoints before sprint review
2. Break large epics into smaller stories (≤ 3 days each)
```

---

### 3.6 AI Knowledge Base (RAG)

**Per-workspace vector store** (ChromaDB, isolated collections per workspace):

**Sources indexed**:
- All documents in workspace wiki
- All board descriptions and item descriptions
- Uploaded files (PDF text extracted via pdfplumber)
- Meeting notes (items with type = 'note')

**Query**: User types question in "Ask FlowOS AI" search bar

```python
@router.post("/rag/query")
async def rag_query(payload: RAGQueryRequest, workspace_id: str):
    # 1. Vector similarity search
    docs = chroma_client.query(
        collection_name=f"workspace_{workspace_id}",
        query_texts=[payload.question],
        n_results=5
    )
    
    # 2. Gemini Flash with retrieved context
    context = "\n\n".join([d["document"] for d in docs["documents"][0]])
    prompt = f"""Answer the question based only on this context:
    
    {context}
    
    Question: {payload.question}
    Answer concisely. If the answer isn't in the context, say so."""
    
    response = await gemini_flash.generate_content(prompt)
    return {"answer": response.text, "sources": docs["metadatas"][0]}
```

---

### 3.7 AI Flowchart Generator

**Trigger**: `POST /api/documents/analyze` with PDF upload (or pasted text)

**Pipeline**:
```
PDF uploaded
    ↓
pdfplumber extracts text + tables
    ↓
Gemini Pro: "Extract the process steps from this document as a structured list"
    ↓
flowchart-ai/GenFlowchart.py: converts steps → Mermaid/Excalidraw JSON
    ↓
Return: flowchart JSON (importable to Canvas view or doc embed)
```

---

## 4. AI Agent Personas (Agency Agents)

Pre-configured AI agents available in every workspace (inspired by `agency-agents-main/`):

| Agent | Trigger | What it does |
|-------|---------|-------------|
| **Project Manager** | Weekly | Reviews all boards, flags at-risk items, drafts status report |
| **Sprint Coach** | On sprint start | Reviews backlog, suggests sprint scope based on velocity |
| **Sales Coach** | Daily | Reviews CRM pipeline, flags stale deals, drafts follow-ups |
| **Support Agent** | On new ticket | Suggests response from knowledge base, assigns priority |
| **Finance Watcher** | Weekly | Reviews any finance/budget boards, summarizes spend vs. budget |
| **Onboarding Guide** | On workspace creation | Walks new users through setup with contextual tips |

---

## 5. AI Safety & Guardrails

- All AI outputs shown with "AI-generated" label
- User must explicitly accept before AI content is saved
- No PII sent to AI APIs (strip email addresses, phone numbers from prompts)
- AI credit exhaustion: graceful degradation (feature shows, button disabled with upgrade prompt)
- Rate limiting: max 10 AI requests/minute per user (prevents runaway usage)
- Prompt injection protection: sanitize all user input before inserting into prompts
- All AI calls logged (model, tokens used, workspace_id, action type) — no prompt content logged

---

*Owner: AI Lead*  
*Cross-reference: ARCHITECTURE.md §3.3 (AI service), PRICING_AND_BILLING.md §3 (AI credits add-ons)*
