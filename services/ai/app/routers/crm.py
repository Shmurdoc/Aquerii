from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from app.core.providers import generate_json
from app.security.auth import verify_internal_token
from app.security.sanitizer import sanitize

router = APIRouter(dependencies=[Depends(verify_internal_token)])

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
async def score_deal(body: DealScoreRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = (
        f"Deal: {sanitize(body.deal_title)}\n"
        f"Stage: {sanitize(body.stage)}\n"
    )
    if body.deal_value:
        prompt += f"Value: ${body.deal_value:,.2f}\n"
    if body.contact_name:
        prompt += f"Contact: {sanitize(body.contact_name)}\n"
    if body.company_name:
        prompt += f"Company: {sanitize(body.company_name)}\n"
    if body.days_in_stage:
        prompt += f"Days in stage: {body.days_in_stage}\n"
    if body.custom_context:
        prompt += f"Context: {sanitize(body.custom_context)}\n"

    try:
        data = await generate_json(prompt, system=SYSTEM, model="gpt-4o-mini")
        return DealScoreResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


# ── Phase 8: AI Enhancements ────────────────────────────────────────────────


class DealSummaryRequest(BaseModel):
    workspace_id: str
    deal_title: str
    deal_value: float | None = None
    stage: str
    contact_name: str | None = None
    company_name: str | None = None
    days_in_stage: int | None = None
    probability: int | None = None
    notes: str | None = None


class DealSummaryResponse(BaseModel):
    summary: str
    key_points: List[str]
    recommended_action: str


DEAL_SUMMARY_SYSTEM = """You are a CRM deal analyst. Given deal information, produce a concise executive summary.
Return ONLY valid JSON:
{"summary": "<3-5 sentence narrative>", "key_points": ["<point 1>", "<point 2>", ...], "recommended_action": "<single recommended next step>"}"""


@router.post("/deal-summary", response_model=DealSummaryResponse)
async def deal_summary(body: DealSummaryRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Deal: {sanitize(body.deal_title)}\nStage: {sanitize(body.stage)}\n"
    if body.deal_value:
        prompt += f"Value: ${body.deal_value:,.2f}\n"
    if body.contact_name:
        prompt += f"Contact: {sanitize(body.contact_name)}\n"
    if body.company_name:
        prompt += f"Company: {sanitize(body.company_name)}\n"
    if body.days_in_stage is not None:
        prompt += f"Days in stage: {body.days_in_stage}\n"
    if body.probability is not None:
        prompt += f"Probability: {body.probability}%\n"
    if body.notes:
        prompt += f"Notes: {sanitize(body.notes)}\n"

    try:
        data = await generate_json(prompt, system=DEAL_SUMMARY_SYSTEM)
        return DealSummaryResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


class ChurnRiskRequest(BaseModel):
    workspace_id: str
    contact_name: str
    company_name: str | None = None
    days_since_last_contact: int | None = None
    open_deals_value: float | None = None
    open_deals_count: int | None = None
    support_tickets_last_30d: int | None = None
    email_open_rate: float | None = None
    custom_context: str | None = None


class ChurnRiskResponse(BaseModel):
    risk_score: int
    risk_level: str
    reasoning: str
    suggested_actions: List[str]


CHURN_SYSTEM = """You are a churn risk analyst. Evaluate the risk of a customer churning based on their data.
Return ONLY valid JSON:
{"risk_score": <0-100>, "risk_level": "<low|medium|high|critical>", "reasoning": "<2-3 sentences>", "suggested_actions": ["<action 1>", "<action 2>", ...]}"""


@router.post("/churn-risk", response_model=ChurnRiskResponse)
async def churn_risk(body: ChurnRiskRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Contact: {sanitize(body.contact_name)}\n"
    if body.company_name:
        prompt += f"Company: {sanitize(body.company_name)}\n"
    if body.days_since_last_contact is not None:
        prompt += f"Days since last contact: {body.days_since_last_contact}\n"
    if body.open_deals_value is not None:
        prompt += f"Open deals value: ${body.open_deals_value:,.2f}\n"
    if body.open_deals_count is not None:
        prompt += f"Open deals count: {body.open_deals_count}\n"
    if body.support_tickets_last_30d is not None:
        prompt += f"Support tickets (30d): {body.support_tickets_last_30d}\n"
    if body.email_open_rate is not None:
        prompt += f"Email open rate: {body.email_open_rate:.1%}\n"
    if body.custom_context:
        prompt += f"Context: {sanitize(body.custom_context)}\n"

    try:
        data = await generate_json(prompt, system=CHURN_SYSTEM)
        return ChurnRiskResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


class NextActionRequest(BaseModel):
    workspace_id: str
    deal_title: str
    stage: str
    deal_value: float | None = None
    contact_name: str | None = None
    company_name: str | None = None
    days_in_stage: int | None = None
    last_action: str | None = None
    custom_context: str | None = None


class NextActionResponse(BaseModel):
    recommended_action: str
    priority: str
    reasoning: str
    suggested_message: str | None = None


NEXT_ACTION_SYSTEM = """You are a sales acceleration AI. Recommend the single most impactful next action for a deal.
Return ONLY valid JSON:
{"recommended_action": "<action name>", "priority": "<high|medium|low>", "reasoning": "<1-2 sentences>", "suggested_message": "<optional email/call script>"}"""


@router.post("/next-action", response_model=NextActionResponse)
async def next_action(body: NextActionRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Deal: {sanitize(body.deal_title)}\nStage: {sanitize(body.stage)}\n"
    if body.deal_value:
        prompt += f"Value: ${body.deal_value:,.2f}\n"
    if body.contact_name:
        prompt += f"Contact: {sanitize(body.contact_name)}\n"
    if body.company_name:
        prompt += f"Company: {sanitize(body.company_name)}\n"
    if body.days_in_stage is not None:
        prompt += f"Days in stage: {body.days_in_stage}\n"
    if body.last_action:
        prompt += f"Last action: {sanitize(body.last_action)}\n"
    if body.custom_context:
        prompt += f"Context: {sanitize(body.custom_context)}\n"

    try:
        data = await generate_json(prompt, system=NEXT_ACTION_SYSTEM)
        return NextActionResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


class EmailComposeRequest(BaseModel):
    workspace_id: str
    deal_title: str | None = None
    contact_name: str
    company_name: str | None = None
    email_type: str = "follow-up"
    tone: str = "professional"
    custom_context: str | None = None


class EmailComposeResponse(BaseModel):
    subject: str
    body: str


EMAIL_COMPOSE_SYSTEM = """You are a sales email copywriter. Compose a concise, effective email.
Return ONLY valid JSON:
{"subject": "<email subject line>", "body": "<email body plain text>"}"""


@router.post("/email-compose", response_model=EmailComposeResponse)
async def email_compose(body: EmailComposeRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Contact: {sanitize(body.contact_name)}\nEmail type: {sanitize(body.email_type)}\nTone: {sanitize(body.tone)}\n"
    if body.deal_title:
        prompt += f"Deal: {sanitize(body.deal_title)}\n"
    if body.company_name:
        prompt += f"Company: {sanitize(body.company_name)}\n"
    if body.custom_context:
        prompt += f"Context: {sanitize(body.custom_context)}\n"

    try:
        data = await generate_json(prompt, system=EMAIL_COMPOSE_SYSTEM)
        return EmailComposeResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


class DataCleanRequest(BaseModel):
    workspace_id: str
    dataset_type: str = "contacts"
    data: str


class DataCleanResponse(BaseModel):
    cleaned_data: str
    changes_made: List[str]


DATA_CLEAN_SYSTEM = """You are a data quality specialist. Clean and normalize the provided dataset.
Return ONLY valid JSON:
{"cleaned_data": "<the cleaned data as formatted text>", "changes_made": ["<change 1>", "<change 2>", ...]}"""


@router.post("/data-clean", response_model=DataCleanResponse)
async def data_clean(body: DataCleanRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Dataset type: {sanitize(body.dataset_type)}\n\nData:\n{body.data[:12000]}"

    try:
        data = await generate_json(prompt, system=DATA_CLEAN_SYSTEM)
        return DataCleanResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


class AnomalyDetectionRequest(BaseModel):
    workspace_id: str
    data_type: str = "deals"
    data: str  # JSON string of the dataset to analyze


class AnomalyDetectionResponse(BaseModel):
    anomalies: List[str]
    risk_level: str


ANOMALY_SYSTEM = """You are a fraud and anomaly detection AI. Analyse the given data for unusual patterns.
Return ONLY valid JSON:
{"anomalies": ["<description of anomaly 1>", "<description of anomaly 2>", ...], "risk_level": "<low|medium|high>"}"""


@router.post("/anomaly-detection", response_model=AnomalyDetectionResponse)
async def anomaly_detection(body: AnomalyDetectionRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Data type: {sanitize(body.data_type)}\n\nData:\n{body.data[:12000]}"

    try:
        data = await generate_json(prompt, system=ANOMALY_SYSTEM)
        return AnomalyDetectionResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
