from __future__ import annotations
import logging
from app.core.providers import generate_text

logger = logging.getLogger(__name__)

_RELEVANCE_PROMPT = """You are a relevance judge. Determine whether the provided context chunk is relevant to answering the user's question.

Context: {chunk}
Question: {query}

Reply with only one word: RELEVANT or IRRELEVANT."""


async def filter_relevant_chunks(
    query: str,
    chunks: list[dict],
    threshold: float = 0.3,
    use_llm_check: bool = False,
) -> list[dict]:
    if not chunks:
        return []

    stage1 = [c for c in chunks if c["score"] >= threshold]

    if not use_llm_check:
        return stage1

    verified = []
    for chunk in stage1:
        try:
            prompt = _RELEVANCE_PROMPT.format(chunk=chunk["document"], query=query)
            verdict = await generate_text(prompt, max_tokens=10)
            verdict = verdict.strip().upper()
            if "RELEVANT" in verdict:
                verified.append(chunk)
            else:
                logger.debug("LLM rejected chunk (score=%.2f): %s", chunk["score"], verdict)
        except Exception as exc:
            logger.warning("LLM relevance check failed, keeping chunk: %s", exc)
            verified.append(chunk)

    return verified
