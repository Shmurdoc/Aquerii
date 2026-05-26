from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits
from app.core.providers import generate_text
from app.security.auth import verify_internal_token
import json

router = APIRouter(dependencies=[Depends(verify_internal_token)])


class EmailProcessRequest(BaseModel):
    workspace_id: str
    email_id: str
    subject: str
    from_address: str
    from_name: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None


class ExtractedTask(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"


class EmailProcessResponse(BaseModel):
    reply_draft: str
    summary: str
    extracted_tasks: List[ExtractedTask]


@router.post("/process", response_model=EmailProcessResponse)
async def process_email(body: EmailProcessRequest):
    """
    Analyse an inbound email and return:
      - A suggested reply draft
      - A short summary
      - A list of extracted action items / tasks
    """
    content = body.body_text or body.body_html or ""
    if not content.strip():
        raise HTTPException(status_code=400, detail="Email body is empty")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    prompt = f"""You are an AI assistant helping a professional handle their email inbox.

Analyse the following email and return a JSON object with three keys:
1. "reply_draft" — a polite, professional reply to this email (plain text, 2-4 sentences)
2. "summary" — a single sentence summary of what the email is about
3. "extracted_tasks" — an array of action items found in the email. Each item has:
   - "title": short task title (max 80 chars)
   - "description": optional detail
   - "priority": "high", "medium", or "low"

Return ONLY valid JSON, no markdown fences.

---
From: {body.from_name or body.from_address} <{body.from_address}>
Subject: {body.subject}

{content[:8000]}
"""

    try:
        raw = await generate_text(prompt, max_tokens=1024)
        # strip markdown code fences if present
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        return EmailProcessResponse(
            reply_draft=data.get("reply_draft", ""),
            summary=data.get("summary", ""),
            extracted_tasks=[ExtractedTask(**t) for t in data.get("extracted_tasks", [])],
        )
    except json.JSONDecodeError as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {exc}") from exc
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
