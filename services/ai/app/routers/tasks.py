from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.config import settings
from app.core.providers import generate_json
from app.security.auth import verify_internal_token

router = APIRouter(dependencies=[Depends(verify_internal_token)])

SYSTEM = """You are a helpful project management assistant for Aquerii.
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
async def task_assist(body: TaskAssistRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    prompt = f"Task: {body.title}\n"
    if body.description:
        prompt += f"Description: {body.description}\n"

    try:
        data = await generate_json(prompt, system=SYSTEM)
        return TaskAssistResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
