from typing import Any, Optional
from app.core.config import settings
from app.core.providers import generate_embedding


async def embed_text(text: str) -> list[float]:
    return generate_embedding(text)


def get_chroma_client() -> Any:
    import chromadb

    headers = {"X-Chroma-Token": settings.CHROMADB_AUTH_TOKEN} if settings.CHROMADB_AUTH_TOKEN else {}
    return chromadb.AsyncHttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        headers=headers,
    )


def collection_name(workspace_id: str) -> str:
    return f'workspace_{workspace_id.replace("-", "_")}'


async def get_or_create_collection(workspace_id: str) -> Any:
    client = get_chroma_client()
    name = collection_name(workspace_id)
    return await client.get_or_create_collection(
        name=name,
        metadata={'hnsw:space': 'cosine'},
    )


async def index_item(workspace_id: str, item_id: str, title: str, description: str = '') -> None:
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

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        fm = get_faiss_manager()
        fm.add_item(workspace_id, item_id, title, description,
                    metadata={'type': 'item', 'item_id': item_id, 'workspace_id': workspace_id})


async def index_document(workspace_id: str, doc_id: str, title: str, content_text: str = '') -> None:
    text = f'{title}\n{content_text}'.strip()[:8000]
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

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        fm = get_faiss_manager()
        fm.add_document(workspace_id, doc_id, title, content_text,
                        metadata={'type': 'document', 'doc_id': doc_id, 'workspace_id': workspace_id})


async def search(workspace_id: str, query: str, n_results: int = 5,
                 filter_type: Optional[str] = None) -> list[dict]:
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
                'score':    1 - results['distances'][0][i],
            })
    return output


async def hybrid_search(workspace_id: str, query: str, top_k: int = 5,
                        filter_type: Optional[str] = None) -> list[dict]:
    chroma_results = await search(workspace_id, query, n_results=top_k * 2, filter_type=filter_type)

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        fm = get_faiss_manager()
        faiss_results = fm.search(workspace_id, query, k=top_k * 2)
    else:
        faiss_results = []

    if not faiss_results:
        return chroma_results[:top_k]

    if not chroma_results:
        return faiss_results[:top_k]

    seen_ids = set()
    merged = []

    for r in faiss_results + chroma_results:
        rid = r['id']
        if rid not in seen_ids:
            seen_ids.add(rid)
            merged.append(r)

    merged.sort(key=lambda x: x['score'], reverse=True)
    return merged[:top_k]


async def rebuild_faiss(workspace_id: str) -> None:
    if not settings.FAISS_ENABLED:
        return
    from app.rag.faiss_indexer import get_faiss_manager
    fm = get_faiss_manager()
    fm.sync_from_chromadb(workspace_id)


async def delete_item(workspace_id: str, item_id: str) -> None:
    collection = await get_or_create_collection(workspace_id)
    await collection.delete(ids=[f'item:{item_id}'])

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        get_faiss_manager().delete_item(workspace_id, item_id)


async def delete_workspace_collection(workspace_id: str) -> None:
    client = get_chroma_client()
    await client.delete_collection(collection_name(workspace_id))

    if settings.FAISS_ENABLED:
        from app.rag.faiss_indexer import get_faiss_manager
        get_faiss_manager().delete_workspace(workspace_id)
