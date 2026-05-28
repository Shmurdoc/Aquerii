# app/routers/rag.py — RAG knowledge base query (ChromaDB per workspace)
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import chromadb
import google.generativeai as genai
from app.core.config import settings
from app.core.credits import consume_credits, rollback_credits

router = APIRouter()
genai.configure(api_key=settings.GEMINI_API_KEY)
_gen_model  = genai.GenerativeModel("gemini-1.5-flash")
_embed_model = "models/text-embedding-004"

_chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)


def _collection(workspace_id: str):
    return _chroma.get_or_create_collection(
        name=f"ws_{workspace_id.replace('-', '_')}",
        metadata={"hnsw:space": "cosine"},
    )


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


@router.post("/ingest")
async def ingest(
    body: IngestRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
):
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    col = _collection(body.workspace_id)

    embeddings = []
    for chunk in body.chunks:
        result = genai.embed_content(model=_embed_model, content=chunk)
        embeddings.append(result["embedding"])

    ids = [f"{body.document_id}_{i}" for i in range(len(body.chunks))]
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=body.chunks,
        metadatas=[{"document_id": body.document_id}] * len(body.chunks),
    )
    return {"ingested": len(body.chunks)}


@router.post("/query", response_model=QueryResponse)
async def query(
    body: QueryRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
):
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = await consume_credits(body.workspace_id, settings.CREDIT_COST_RAG)
    if not ok:
        raise HTTPException(status_code=402, detail="AI_CREDITS_EXHAUSTED")

    try:
        query_embedding = genai.embed_content(model=_embed_model, content=body.query)["embedding"]
        col = _collection(body.workspace_id)
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(body.top_k, 10),
        )

        chunks  = results["documents"][0] if results["documents"] else []
        sources = [m["document_id"] for m in results["metadatas"][0]] if results["metadatas"] else []

        if not chunks:
            return QueryResponse(answer="No relevant information found in the knowledge base.", sources=[])

        context = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks))
        prompt  = f"Using the following context, answer the question concisely.\n\nContext:\n{context}\n\nQuestion: {body.query}"

        response = _gen_model.generate_content(prompt)
        return QueryResponse(answer=response.text, sources=list(set(sources)))
    except Exception as exc:
        await rollback_credits(body.workspace_id, settings.CREDIT_COST_RAG)
        raise HTTPException(status_code=502, detail=f"AI_PROVIDER_ERROR: {exc}") from exc
