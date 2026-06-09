from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any
from app.core.config import settings
from app.core.providers import generate_text, generate_embedding
from app.security.auth import verify_internal_token
from app.rag.reranker import rerank_batch
from app.rag.relevance import filter_relevant_chunks

router = APIRouter(dependencies=[Depends(verify_internal_token)])

_chroma: Any | None = None


def _service_unavailable(detail: str) -> HTTPException:
    return HTTPException(status_code=503, detail={"code": "RAG_UNAVAILABLE", "message": detail})


def _get_chroma() -> Any:
    global _chroma
    if _chroma is None:
        try:
            import chromadb

            headers = {"X-Chroma-Token": settings.CHROMADB_AUTH_TOKEN} if settings.CHROMADB_AUTH_TOKEN else {}
            _chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT, headers=headers)
        except Exception as exc:
            raise _service_unavailable(f"ChromaDB is unavailable: {exc}") from exc
    return _chroma


def _collection(workspace_id: str):
    return _get_chroma().get_or_create_collection(
        name=f"ws_{workspace_id.replace('-', '_')}",
        metadata={"hnsw:space": "cosine"},
    )


def _rag_indexer():
    try:
        from app.rag import indexer
    except Exception as exc:
        raise _service_unavailable(f"RAG backend is unavailable: {exc}") from exc

    return indexer


class IngestRequest(BaseModel):
    workspace_id: str
    document_id: str
    chunks: list[str]


class QueryRequest(BaseModel):
    workspace_id: str
    query: str
    top_k: int = 5


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]


class RebuildIndexRequest(BaseModel):
    workspace_id: str


@router.post("/ingest")
async def ingest(body: IngestRequest):
    col = _collection(body.workspace_id)

    embeddings = []
    for chunk in body.chunks:
        embeddings.append(generate_embedding(chunk))

    ids = [f"{body.document_id}_{i}" for i in range(len(body.chunks))]
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=body.chunks,
        metadatas=[{"document_id": body.document_id}] * len(body.chunks),
    )

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        fm = get_faiss_manager()
        for i, chunk in enumerate(body.chunks):
            fm.add_document(
                body.workspace_id,
                f"{body.document_id}_{i}",
                f"Chunk from {body.document_id}",
                chunk,
                metadata={"document_id": body.document_id, "workspace_id": body.workspace_id},
            )

    return {"ingested": len(body.chunks)}


@router.post("/rebuild-index")
async def rebuild_index_endpoint(body: RebuildIndexRequest):
    if settings.FAISS_ENABLED:
        await _rag_indexer().rebuild_faiss(body.workspace_id)
        return {"status": "ok", "message": "FAISS index rebuilt from ChromaDB"}
    return {"status": "skipped", "message": "FAISS not enabled"}


@router.post("/query", response_model=QueryResponse)
async def query(body: QueryRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    try:
        if settings.RAG_HYBRID_SEARCH and settings.FAISS_ENABLED:
            results = await _rag_indexer().hybrid_search(
                body.workspace_id, body.query, top_k=body.top_k * 3
            )
        else:
            query_embedding = generate_embedding(body.query)
            col = _collection(body.workspace_id)
            results_raw = col.query(
                query_embeddings=[query_embedding],
                n_results=min(body.top_k * 3, 30),
            )
            results = []
            if results_raw.get("documents"):
                for i, doc_id in enumerate(results_raw["ids"][0]):
                    results.append({
                        "id": doc_id,
                        "document": results_raw["documents"][0][i],
                        "metadata": results_raw["metadatas"][0][i] if results_raw.get("metadatas") else {},
                        "score": 1 - results_raw["distances"][0][i] if results_raw.get("distances") else 0,
                    })

        chunks = [r["document"] for r in results]
        sources = list(set(
            r["metadata"].get("document_id") or r["id"]
            for r in results if r.get("metadata")
        ))

        if not chunks:
            return QueryResponse(answer="No relevant information found in the knowledge base.", sources=[])

        reranked = rerank_batch(body.query, chunks, top_k=body.top_k, score_threshold=0.1)
        relevant = await filter_relevant_chunks(
            body.query, reranked, threshold=0.3, use_llm_check=False
        )

        if not relevant:
            return QueryResponse(answer="No relevant information found in the knowledge base.", sources=[])

        context = "\n\n".join(f"[{i+1}] {c['document']}" for i, c in enumerate(relevant))
        prompt  = f"Using the following context, answer the question concisely.\n\nContext:\n{context}\n\nQuestion: {body.query}"

        answer = await generate_text(prompt, max_tokens=512)
        return QueryResponse(answer=answer, sources=sources)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc


@router.post("/query-direct", response_model=QueryResponse)
async def query_direct(body: QueryRequest):
    # Credits are charged by the API gateway; the AI service trusts the caller
    # (internal-token protected) and does not modify credit counters.

    try:
        query_embedding = generate_embedding(body.query)
        col = _collection(body.workspace_id)
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(body.top_k * 3, 30),
        )

        chunks  = results["documents"][0] if results["documents"] else []
        sources = [m["document_id"] for m in results["metadatas"][0]] if results["metadatas"] else []

        if not chunks:
            return QueryResponse(answer="No relevant information found in the knowledge base.", sources=[])

        reranked = rerank_batch(body.query, chunks, top_k=body.top_k, score_threshold=0.1)
        relevant = await filter_relevant_chunks(
            body.query, reranked, threshold=0.3, use_llm_check=False
        )

        if not relevant:
            return QueryResponse(answer="No relevant information found in the knowledge base.", sources=[])

        context = "\n\n".join(f"[{i+1}] {c['document']}" for i, c in enumerate(relevant))
        prompt  = f"Using the following context, answer the question concisely.\n\nContext:\n{context}\n\nQuestion: {body.query}"

        answer = await generate_text(prompt, max_tokens=512)
        return QueryResponse(answer=answer, sources=list(set(sources)))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
