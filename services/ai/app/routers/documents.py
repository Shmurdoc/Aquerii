from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits
from app.core.providers import generate_text
from app.security.auth import verify_internal_token

router = APIRouter(dependencies=[Depends(verify_internal_token)])

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
    action: str


class DocumentAssistResponse(BaseModel):
    result: str


@router.post("/assist", response_model=DocumentAssistResponse)
async def document_assist(body: DocumentAssistRequest):
    if body.action not in ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action. Choose from: {list(ACTIONS.keys())}")

    if len(body.content) > 50_000:
        raise HTTPException(status_code=400, detail="Content too long (max 50,000 characters)")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    try:
        result = await generate_text(
            body.content,
            system=ACTIONS[body.action],
            max_tokens=4096,
        )
        return DocumentAssistResponse(result=result)
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_DOCUMENT)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
