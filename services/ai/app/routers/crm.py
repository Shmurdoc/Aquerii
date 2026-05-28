# app/routers/crm.py — AI CRM deal scoring
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import json
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits

router = APIRouter()
genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel("gemini-1.5-pro")

SYSTEM = """You are a CRM deal scoring AI.
Given deal information, score the deal likelihood from 0-100 and provide reasoning.
Return ONLY valid JSON:
{"score": <0-100>, "reasoning": "<2-3 sentences>", "next_action": "<recommended next step>"}"""


class DealScoreRequest(BaseModel):
    workspace_id: str
    deal_title: str
    deal_value: float | None = None
    stage: str
    contact_name: str | None = None
    company_name: str | None = None
    days_in_stage: int | None = None
    custom_context: str | None = None


class DealScoreResponse(BaseModel):
    score: int
    reasoning: str
    next_action: str


@router.post("/score", response_model=DealScoreResponse)
async def score_deal(
    body: DealScoreRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
):
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_CRM_SCORE)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    prompt = (
        f"Deal: {body.deal_title}\n"
        f"Stage: {body.stage}\n"
    )
    if body.deal_value:
        prompt += f"Value: ${body.deal_value:,.2f}\n"
    if body.contact_name:
        prompt += f"Contact: {body.contact_name}\n"
    if body.company_name:
        prompt += f"Company: {body.company_name}\n"
    if body.days_in_stage:
        prompt += f"Days in stage: {body.days_in_stage}\n"
    if body.custom_context:
        prompt += f"Context: {body.custom_context}\n"

    try:
        response = _model.generate_content(
            SYSTEM + "\n\n" + prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        data = json.loads(response.text)
        return DealScoreResponse(**data)
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_CRM_SCORE)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
