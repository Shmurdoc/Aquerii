import json
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import google.generativeai as genai
from app.core.config import settings
from app.security.sanitizer import sanitize, PromptInjectionError
from app.security.auth import verify_internal_token

router = APIRouter(dependencies=[Depends(verify_internal_token)])


class TaskDescriptionRequest(BaseModel):
    workspace_id: str
    title: str = Field(min_length=1)
    context: str = ''


class DocumentGenerateRequest(BaseModel):
    workspace_id: str
    prompt: str = Field(min_length=1)
    style: str = 'professional'


class AutomationGenerateRequest(BaseModel):
    workspace_id: str
    description: str = Field(min_length=1)


class FlowchartRequest(BaseModel):
    workspace_id: str
    description: str


class IndexRequest(BaseModel):
    model_type: str
    model_id: str


def _injection_error() -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={'code': 'INJECTION_DETECTED', 'message': 'Invalid input.'},
    )


def _gemini(model: str = "gemini-1.5-flash"):
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(model)


@router.post('/ai/task/generate-description')
async def generate_task_description(req: TaskDescriptionRequest):
    try:
        title = sanitize(req.title)
        context = sanitize(req.context)
    except PromptInjectionError:
        raise _injection_error()

    prompt = (
        "You are a project management assistant. Write a clear, concise task description.\n\n"
        f"Task title: {title}\n"
        f"Context: {context}\n\n"
        "Write 2-3 sentences describing what this task involves, the expected outcome, "
        "and any important considerations. Be specific and actionable."
    )
    description = (_gemini().generate_content(prompt).text or "").strip()
    return {'data': {'description': description}}


@router.post('/ai/document/generate')
async def generate_document(req: DocumentGenerateRequest):
    try:
        prompt_text = sanitize(req.prompt)
    except PromptInjectionError:
        raise _injection_error()

    system = (
        f"You are a professional document writer. Generate a well-structured document based on the user's request.\n"
        f"Style: {req.style}\n"
        "Format the response as clean markdown with proper headings, sections, and content.\n\n"
        f"User request: {prompt_text}"
    )
    content = (_gemini().generate_content(system).text or "").strip()
    return {'data': {'content': content, 'format': 'markdown'}}


@router.post('/ai/automation/generate')
async def generate_automation(req: AutomationGenerateRequest):
    try:
        description = sanitize(req.description)
    except PromptInjectionError:
        raise _injection_error()

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
    try:
        model = _gemini()
        raw = model.generate_content(prompt).text or ""
        text = raw.strip()
        if text.startswith('```'):
            parts = text.split('```')
            text = parts[1] if len(parts) > 1 else text
            if text.startswith('json'):
                text = text[4:]
        data = json.loads(text.strip())
        return {'data': data}
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail={'code': 'AI_PARSE_ERROR', 'message': 'Failed to parse AI response.'},
        )


@router.post('/ai/flowchart/generate')
async def generate_flowchart(req: FlowchartRequest):
    try:
        description = sanitize(req.description)
    except PromptInjectionError:
        raise _injection_error()

    prompt = (
        "You are an expert diagram designer. Convert the following description into a "
        "valid Excalidraw elements JSON array.\n\n"
        "Rules:\n"
        "- Return ONLY valid JSON — no markdown fences, no explanation.\n"
        "- Use 'rectangle' for boxes/steps, 'arrow' for connections, 'text' for labels.\n"
        "- Each element must include: id (unique short string), type, x, y, width, height, "
        "  angle (0), strokeColor ('#e2e8f0'), backgroundColor ('transparent'), "
        "  fillStyle ('solid'), strokeWidth (2), roughness (0), opacity (100), "
        "  strokeStyle ('solid'), roundness (null for arrows, {type:3} for rectangles), "
        "  seed (integer), version (1), isDeleted (false), groupIds ([]), "
        "  frameId (null), link (null), locked (false), boundElements ([]).\n"
        "- For 'text' elements also include: text (the label string), fontSize (14), "
        "  fontFamily (1), textAlign ('center'), verticalAlign ('middle'), baseline (17).\n"
        "- For 'arrow' elements also include: points ([[0,0],[width,0]]), "
        "  startBinding/endBinding (null unless connecting to another element).\n"
        "- Place elements in a logical left-to-right or top-to-bottom flow.\n"
        "- Keep coordinates within a 1200x800 canvas; start first element at x=80, y=80.\n"
        "- Space elements 160px apart horizontally or 120px vertically.\n\n"
        f"Description: {description}\n\n"
        "Return the JSON array of elements only."
    )

    try:
        text = await generate_text(prompt, max_tokens=4096, response_json=False)
        text = text.strip()
        if text.startswith('```'):
            parts = text.split('```')
            text = parts[1] if len(parts) > 1 else text
            if text.startswith('json'):
                text = text[4:]
        elements = json.loads(text.strip())
        if not isinstance(elements, list):
            raise ValueError("Expected a JSON array")
        return {
            'data': {
                'elements': elements,
                'appState': {'viewBackgroundColor': '#1e1e2e'},
            }
        }
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail={'code': 'AI_PARSE_ERROR', 'message': 'Failed to parse flowchart from AI response.'},
        ) from exc


@router.post('/internal/index')
async def index_content(req: IndexRequest, request: Request):
    return {'data': {'indexed': True, 'model_type': req.model_type, 'model_id': req.model_id}}


class DocumentAnalyzeRequest(BaseModel):
    workspace_id: str
    document_id: str


class DocumentAutoTagRequest(BaseModel):
    workspace_id: str
    document_id: str


class DocumentLinkDealRequest(BaseModel):
    workspace_id: str
    document_id: str
    deal_id: str


async def _fetch_document_content(document_id: str) -> dict:
    import httpx
    import os
    base = os.environ.get('INTERNAL_API_URL', 'http://api:8000')
    secret = os.environ.get('AI_SERVICE_SECRET', '')
    headers = {'X-Internal-Secret': secret}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f'{base}/api/internal/scanned-documents/{document_id}/content',
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail='Could not fetch document from internal API.',
            )
        return resp.json()['data']


@router.post('/ai/document/analyze')
async def analyze_document(req: DocumentAnalyzeRequest):
    doc = await _fetch_document_content(req.document_id)
    content = (doc.get('ocr_text') or '')[:12000]

    if not content.strip():
        raise HTTPException(status_code=422, detail='Document has no extractable text content.')

    prompt = (
        "You are a document analyst. Extract structured information from the following document.\n\n"
        "Return ONLY valid JSON with this structure:\n"
        "{\n"
        '  "document_type": "invoice|contract|receipt|report|letter|other",\n'
        '  "parties": ["party1", "party2"],\n'
        '  "date": "YYYY-MM-DD or null",\n'
        '  "total_amount": 0.00,\n'
        '  "currency": "USD or null",\n'
        '  "summary": "2-3 sentence plain English summary",\n'
        '  "key_terms": ["term1", "term2"],\n'
        '  "action_required": true or false\n'
        "}\n\n"
        f"Document content:\n{content}"
    )

    try:
        analysis = await generate_json(prompt, model="gpt-4o-mini")
        return {'data': {'document_id': req.document_id, 'analysis': analysis}}
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail={'code': 'AI_PARSE_ERROR', 'message': 'Failed to parse document analysis.'},
        ) from exc


@router.post('/ai/document/auto-tag')
async def auto_tag_document(req: DocumentAutoTagRequest):
    doc = await _fetch_document_content(req.document_id)
    content = (doc.get('ocr_text') or '')[:8000]

    if not content.strip():
        raise HTTPException(status_code=422, detail='Document has no extractable text content.')

    prompt = (
        "You are a document tagging assistant. Suggest 3-8 short, lowercase tags for this document.\n\n"
        "Return ONLY a JSON array of tag strings, e.g. [\"invoice\", \"supplier\", \"2024\"]\n\n"
        f"Document content:\n{content}"
    )
    suggested_tags: list = []
    try:
        text = await generate_text(prompt, response_json=True)
        text = text.strip()
        if text.startswith('```'):
            parts = text.split('```')
            text = parts[1] if len(parts) > 1 else text
            if text.startswith('json'):
                text = text[4:]
        suggested_tags = json.loads(text.strip())
        if not isinstance(suggested_tags, list):
            suggested_tags = []
    except (json.JSONDecodeError, ValueError):
        pass

    return {
        'data': {
            'document_id': req.document_id,
            'suggested_tags': suggested_tags,
        }
    }


@router.post('/ai/document/link-deal')
async def link_document_to_deal(req: DocumentLinkDealRequest):
    doc = await _fetch_document_content(req.document_id)
    content = (doc.get('ocr_text') or '')[:8000]

    prompt = (
        "Extract the total monetary amount from this document. "
        "Return ONLY valid JSON: {\"total\": 1234.56, \"currency\": \"USD\"}. "
        "If no amount is found, return {\"total\": null, \"currency\": null}.\n\n"
        f"Document content:\n{content}"
    )

    total = None
    currency = None
    try:
        text = await generate_text(prompt, response_json=True)
        text = text.strip()
        if text.startswith('```'):
            parts = text.split('```')
            text = parts[1] if len(parts) > 1 else text
            if text.startswith('json'):
                text = text[4:]
        extracted = json.loads(text.strip())
        total = extracted.get('total')
        currency = extracted.get('currency')
    except (json.JSONDecodeError, ValueError):
        pass

    return {
        'data': {
            'extracted': {'total': total, 'currency': currency},
            'deal_id': req.deal_id,
            'document_id': req.document_id,
        }
    }


class ExtractTextRequest(BaseModel):
    file_url: str | None = None
    file_content: str | None = None
    mime_type: str
    document_id: str


@router.post('/internal/extract-text')
async def extract_text(req: ExtractTextRequest):
    import base64
    import httpx

    if req.file_content:
        raw = base64.b64decode(req.file_content)
    elif req.file_url:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(req.file_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail='Could not download file for OCR.')
            raw = resp.content
    else:
        raise HTTPException(status_code=422, detail='Either file_url or file_content is required.')

    mime = req.mime_type or 'application/octet-stream'

    if 'pdf' in mime:
        from app.core.extraction import extract_pdf_text
        result = extract_pdf_text(raw)
    elif mime.startswith('image/'):
        from app.core.extraction import extract_image_text
        result = extract_image_text(raw)
    else:
        result = {
            'text': '',
            'page_count': 0,
            'engine': 'none',
            'confidence': 0.0,
        }

    return {
        'text': result['text'],
        'page_count': result['page_count'],
        'document_id': req.document_id,
        'engine': result['engine'],
        'confidence': result['confidence'],
    }
