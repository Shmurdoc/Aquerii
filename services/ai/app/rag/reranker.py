from typing import Optional, TYPE_CHECKING
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_model: Optional[object] = None

def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import CrossEncoder
            model_name = settings.RERANKER_MODEL
            logger.info("Loading reranker model: %s", model_name)
            _model = CrossEncoder(model_name)
        except ImportError:
            raise RuntimeError("sentence-transformers not installed")
    return _model

RERANKER_AVAILABLE = True


def rerank(
    query: str,
    documents: list[str],
    top_k: int | None = None,
    score_threshold: float | None = None,
) -> list[dict]:
    if top_k is None:
        top_k = settings.RERANKER_TOP_K
    if score_threshold is None:
        score_threshold = settings.RERANKER_SCORE_THRESHOLD

    if not RERANKER_AVAILABLE or not documents:
        if not documents:
            return []
        return [
            {"document": d, "score": 1.0 - (i * 0.01)} for i, d in enumerate(documents)
        ][:top_k]

    try:
        model = _get_model()
        pairs = [[query, doc] for doc in documents]
        scores = model.predict(pairs, show_progress_bar=False)

        if hasattr(scores, 'cpu'):
            scores = scores.cpu()

        scored = []
        for doc, raw_score in zip(documents, scores):
            score = float(raw_score)
            norm_score = max(0.0, min(1.0, (score + 1.0) / 2.0))
            if score_threshold is None or norm_score >= score_threshold:
                scored.append({"document": doc, "score": norm_score})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    except Exception as exc:
        logger.warning("Reranker failed, falling back to original order: %s", exc)
        return [
            {"document": d, "score": 1.0 - (i * 0.01)} for i, d in enumerate(documents)
        ][:top_k]


def rerank_batch(
    query: str,
    documents: list[str],
    top_k: int | None = None,
    score_threshold: float | None = None,
    batch_size: int = 32,
) -> list[dict]:
    if top_k is None:
        top_k = settings.RERANKER_TOP_K
    if score_threshold is None:
        score_threshold = settings.RERANKER_SCORE_THRESHOLD

    if not RERANKER_AVAILABLE or not documents:
        if not documents:
            return []
        return [
            {"document": d, "score": 1.0 - (i * 0.01)} for i, d in enumerate(documents)
        ][:top_k]

    try:
        model = _get_model()
        all_scores = []

        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            pairs = [[query, doc] for doc in batch]
            batch_scores = model.predict(pairs, show_progress_bar=False)
            if hasattr(batch_scores, 'cpu'):
                batch_scores = batch_scores.cpu()
            all_scores.extend(batch_scores)

        scored = []
        for doc, raw_score in zip(documents, all_scores):
            score = float(raw_score)
            norm_score = max(0.0, min(1.0, (score + 1.0) / 2.0))
            if score_threshold is None or norm_score >= score_threshold:
                scored.append({"document": doc, "score": norm_score})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    except Exception as exc:
        logger.warning("Reranker batch failed, falling back: %s", exc)
        return [
            {"document": d, "score": 1.0 - (i * 0.01)} for i, d in enumerate(documents)
        ][:top_k]
