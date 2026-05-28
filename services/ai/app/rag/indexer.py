"""
Per-workspace ChromaDB indexer.
Indexes items and documents as embeddings for semantic search.
"""
from typing import Optional
import chromadb
import google.generativeai as genai
from app.core.config import settings


def get_chroma_client() -> chromadb.AsyncHttpClient:
    return chromadb.AsyncHttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
    )


def collection_name(workspace_id: str) -> str:
    """Each workspace gets its own ChromaDB collection."""
    return f'workspace_{workspace_id.replace("-", "_")}'


async def get_or_create_collection(workspace_id: str) -> chromadb.Collection:
    client = get_chroma_client()
    name = collection_name(workspace_id)
    return await client.get_or_create_collection(
        name=name,
        metadata={'hnsw:space': 'cosine'},
    )


async def embed_text(text: str) -> list[float]:
    """Generate embedding using Gemini text-embedding model."""
    genai.configure(api_key=settings.GEMINI_API_KEY)
    result = genai.embed_content(
        model='models/text-embedding-004',
        content=text,
        task_type='retrieval_document',
    )
    return result['embedding']


async def index_item(workspace_id: str, item_id: str, title: str, description: str = '') -> None:
    """Index an item (task/card) into the workspace collection."""
    text = f'{title}\n{description}'.strip()
    if not text:
        return

    embedding = await embed_text(text)
    collection = await get_or_create_collection(workspace_id)
    await collection.upsert(
        ids=[f'item:{item_id}'],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{'type': 'item', 'item_id': item_id, 'workspace_id': workspace_id}],
    )


async def index_document(workspace_id: str, doc_id: str, title: str, content_text: str = '') -> None:
    """Index a document into the workspace collection."""
    text = f'{title}\n{content_text}'.strip()[:8000]  # truncate to avoid token limits
    if not text:
        return

    embedding = await embed_text(text)
    collection = await get_or_create_collection(workspace_id)
    await collection.upsert(
        ids=[f'doc:{doc_id}'],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{'type': 'document', 'doc_id': doc_id, 'workspace_id': workspace_id}],
    )


async def search(workspace_id: str, query: str, n_results: int = 5, filter_type: Optional[str] = None) -> list[dict]:
    """Semantic search within a workspace."""
    query_embedding = await embed_text(query)
    collection = await get_or_create_collection(workspace_id)

    where = {'type': filter_type} if filter_type else None
    results = await collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where,
        include=['documents', 'metadatas', 'distances'],
    )

    output = []
    if results and results.get('ids'):
        for i, doc_id in enumerate(results['ids'][0]):
            output.append({
                'id':       doc_id,
                'document': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'score':    1 - results['distances'][0][i],  # cosine → similarity
            })
    return output


async def delete_item(workspace_id: str, item_id: str) -> None:
    collection = await get_or_create_collection(workspace_id)
    await collection.delete(ids=[f'item:{item_id}'])


async def delete_workspace_collection(workspace_id: str) -> None:
    client = get_chroma_client()
    await client.delete_collection(collection_name(workspace_id))
