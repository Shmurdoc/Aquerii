"""
Additional AI routes matching API_CONTRACTS.md §8:
- POST /ai/task/generate-description
- POST /ai/document/generate
- POST /ai/automation/generate
- POST /internal/index  (internal only — called by Laravel jobs)
"""
import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import google.generativeai as genai
from app.core.config import settings
from app.security.sanitizer import sanitize, PromptInjectionError

router = APIRouter()


class TaskDescriptionRequest(BaseModel):
    workspace_id: str
    title: str
    context: str = ''


class DocumentGenerateRequest(BaseModel):
    workspace_id: str
    prompt: str
    style: str = 'professional'


class AutomationGenerateRequest(BaseModel):
    workspace_id: str
    description: str


class IndexRequest(BaseModel):
    model_type: str
    model_id: str


def _gemini(model_name: str = 'gemini-1.5-flash') -> genai.GenerativeModel:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(model_name)


def _injection_error() -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={'code': 'INJECTION_DETECTED', 'message': 'Invalid input.'},
    )


@router.post('/ai/task/generate-description')
async def generate_task_description(req: TaskDescriptionRequest):
    try:
        title = sanitize(req.title)
        context = sanitize(req.context)
    except PromptInjectionError:
        raise _injection_error()

    model = _gemini()
    prompt = (
        "You are a project management assistant. Write a clear, concise task description.\n\n"
        f"Task title: {title}\n"
        f"Context: {context}\n\n"
        "Write 2-3 sentences describing what this task involves, the expected outcome, "
        "and any important considerations. Be specific and actionable."
    )
    response = model.generate_content(prompt)
    return {'data': {'description': response.text.strip()}}


@router.post('/ai/document/generate')
async def generate_document(req: DocumentGenerateRequest):
    try:
        prompt_text = sanitize(req.prompt)
    except PromptInjectionError:
        raise _injection_error()

    model = _gemini()
    system_prompt = (
        f"You are a professional document writer. Generate a well-structured document based on the user's request.\n"
        f"Style: {req.style}\n"
        "Format the response as clean markdown with proper headings, sections, and content.\n\n"
        f"User request: {prompt_text}"
    )
    response = model.generate_content(system_prompt)
    return {'data': {'content': response.text.strip(), 'format': 'markdown'}}


@router.post('/ai/automation/generate')
async def generate_automation(req: AutomationGenerateRequest):
    try:
        description = sanitize(req.description)
    except PromptInjectionError:
        raise _injection_error()

    model = _gemini('gemini-1.5-pro')
    prompt = (
        "You are an automation builder. Convert this natural language description into a structured automation rule.\n\n"
        f"Description: {description}\n\n"
        "Return ONLY valid JSON with this structure:\n"
        "{\n"
        '  "name": "automation name",\n'
        '  "trigger_type": "item.created|item.updated|item.status_changed|due_date_approaching",\n'
        '  "trigger_config": {},\n'
        '  "actions": [\n'
        '    {\n'
        '      "type": "change_status|assign_user|send_notification|move_item|create_item",\n'
        '      "config": {}\n'
        '    }\n'
        '  ]\n'
        '}'
    )
    response = model.generate_content(prompt)

    try:
        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]
        automation = json.loads(text.strip())
        return {'data': automation}
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail={'code': 'AI_PARSE_ERROR', 'message': 'Failed to parse AI response.'},
        )


@router.post('/internal/index')
async def index_content(req: IndexRequest, request: Request):
    """Called internally by Laravel UpdateAIEmbedding job."""
    secret = request.headers.get('X-Internal-Secret', '')
    if secret != settings.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail='Forbidden')

    # TODO: fetch content from DB and index via app.rag.indexer
    return {'data': {'indexed': True, 'model_type': req.model_type, 'model_id': req.model_id}}
