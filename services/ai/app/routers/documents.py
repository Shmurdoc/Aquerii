# app/routers/documents.py — AI document assistant
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import anthropic
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits

router = APIRouter()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

ACTIONS = {
    "improve":   "Improve the writing quality, clarity, and flow of this text. Return only the improved text.",
    "summarise": "Summarise this text in 3-5 bullet points. Return only the bullet points.",
    "expand":    "Expand this text with more detail and examples. Return only the expanded text.",
    "simplify":  "Simplify this text for a general audience. Return only the simplified text.",
    "fix":       "Fix any grammar, spelling, and punctuation errors. Return only the corrected text.",
}


class DocumentAssistRequest(BaseModel):
    workspace_id: str
    content: str
    action: str   # improve | summarise | expand | simplify | fix


class DocumentAssistResponse(BaseModel):
    result: str


@router.post("/assist", response_model=DocumentAssistResponse)
async def document_assist(
    body: DocumentAssistRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
):
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.action not in ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action. Choose from: {list(ACTIONS.keys())}")

    if len(body.content) > 50_000:
        raise HTTPException(status_code=400, detail="Content too long (max 50,000 characters)")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    system = ACTIONS[body.action]

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": body.content}],
        )
        return DocumentAssistResponse(result=response.content[0].text)
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
