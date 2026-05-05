# app/routers/tasks.py — AI task assistant endpoint
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits

router = APIRouter()

genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = """You are a helpful project management assistant for Aquerii.
Given a task title and optional description, you must:
1. Suggest 3-5 concrete subtasks as a JSON array of strings.
2. Suggest a priority: low, medium, high, or critical.
3. Suggest a due date offset in days from today (integer).
Respond ONLY with valid JSON in this exact shape:
{"subtasks": [...], "priority": "...", "due_days": N}"""


class TaskAssistRequest(BaseModel):
    workspace_id: str
    title: str
    description: str | None = None


class TaskAssistResponse(BaseModel):
    subtasks: list[str]
    priority: str
    due_days: int


@router.post("/assist", response_model=TaskAssistResponse)
async def task_assist(
    body: TaskAssistRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
):
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_TASK_ASSIST)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    prompt = f"Task: {body.title}\n"
    if body.description:
        prompt += f"Description: {body.description}\n"

    try:
        response = _model.generate_content(
            SYSTEM_PROMPT + "\n\n" + prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        import json
        data = json.loads(response.text)
        return TaskAssistResponse(**data)
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_TASK_ASSIST)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
