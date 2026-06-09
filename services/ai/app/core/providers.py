"""Unified provider abstraction for OpenAI, Anthropic, and Gemini.

Auto-selects the best available provider based on API key presence
and AI_PROVIDER_PREFERENCE config.  Graceful fallback chain.
"""
import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Helpers ──────────────────────────────────────────────────────────────────────

_PROVIDER_ORDER = ["openai", "anthropic", "gemini"]


def _available_providers() -> list[str]:
    """Return providers in preference order that have an API key configured."""
    keys = {
        "openai":    settings.OPENAI_API_KEY,
        "anthropic": settings.ANTHROPIC_API_KEY,
        "gemini":    settings.GEMINI_API_KEY,
    }
    preferred = settings.AI_PROVIDER_PREFERENCE
    ordered = [p for p in _PROVIDER_ORDER if p != preferred]
    ordered.insert(0, preferred)
    return [p for p in ordered if keys.get(p)]


def _best_provider() -> str:
    providers = _available_providers()
    if not providers:
        raise RuntimeError("No AI provider configured")
    return providers[0]


# ── Text generation ──────────────────────────────────────────────────────────────


async def generate_text(
    prompt: str,
    *,
    system: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
    response_json: bool = False,
    provider: str | None = None,
) -> str:
    """Generate text using the best available provider.

    Args:
        prompt: The user message / prompt.
        system: Optional system prompt.
        model:  Provider-specific model override.
        max_tokens: Maximum output tokens.
        response_json: If True, request structured JSON output.
        provider: Force a specific provider ("openai", "anthropic", "gemini").

    Returns:
        The generated text string.
    """
    providers = [provider] if provider else _available_providers()
    last_exc: Exception | None = None

    for prov in providers:
        try:
            if prov == "openai":
                return _generate_openai(prompt, system=system, model=model, max_tokens=max_tokens, response_json=response_json)
            elif prov == "anthropic":
                return _generate_anthropic(prompt, system=system, model=model, max_tokens=max_tokens)
            elif prov == "gemini":
                return _generate_gemini(prompt, system=system, model=model, max_tokens=max_tokens, response_json=response_json)
        except Exception as exc:
            logger.warning("Provider %s failed: %s", prov, exc)
            last_exc = exc
            continue

    raise RuntimeError("All AI providers failed") from last_exc


def _generate_openai(
    prompt: str, *, system: str | None = None, model: str | None = None,
    max_tokens: int = 1024, response_json: bool = False,
) -> str:
    import openai as openai_mod

    client = openai_mod.OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": model or "gpt-4o-mini",
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if response_json:
        kwargs["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def _generate_anthropic(
    prompt: str, *, system: str | None = None, model: str | None = None,
    max_tokens: int = 1024,
) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    kwargs: dict[str, Any] = {
        "model": model or "claude-3-5-haiku-20241022",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    resp = client.messages.create(**kwargs)
    return resp.content[0].text


def _generate_gemini(
    prompt: str, *, system: str | None = None, model: str | None = None,
    max_tokens: int = 1024, response_json: bool = False,
) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    gen_model = genai.GenerativeModel(
        model or "gemini-1.5-flash",
        system_instruction=system,
    )
    kwargs: dict[str, Any] = {
        "max_output_tokens": max_tokens,
    }
    if response_json:
        kwargs["response_mime_type"] = "application/json"

    resp = gen_model.generate_content(prompt, generation_config=kwargs)
    return resp.text


# ── JSON generation (convenience wrapper) ───────────────────────────────────────


async def generate_json(
    prompt: str,
    *,
    system: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
    provider: str | None = None,
) -> dict:
    """Generate a JSON object using the best available provider."""
    text = await generate_text(
        prompt, system=system, model=model, max_tokens=max_tokens,
        response_json=True, provider=provider,
    )
    # Strip accidental markdown fences
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ── Embeddings ───────────────────────────────────────────────────────────────────


def generate_embedding(text: str, provider: str | None = None) -> list[float]:
    """Generate an embedding vector for the given text.

    Uses OpenAI text-embedding-3-small by default (supports 3072 dims,
    cheaper than Gemini).  Falls back to Gemini text-embedding-004.
    """
    providers = [provider] if provider else _available_providers()
    last_exc: Exception | None = None

    for prov in providers:
        try:
            if prov == "openai":
                return _embed_openai(text)
            elif prov in ("gemini", "anthropic"):
                return _embed_gemini(text)
        except Exception as exc:
            logger.warning("Embedding provider %s failed: %s", prov, exc)
            last_exc = exc
            continue

    raise RuntimeError("All embedding providers failed") from last_exc


def _embed_openai(text: str) -> list[float]:
    import openai as openai_mod

    client = openai_mod.OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding


def _embed_gemini(text: str) -> list[float]:
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    result = genai.embed_content(model="models/text-embedding-004", content=text)
    return result["embedding"]
