"""
Unit tests for app.rag.indexer.

Covers:
- collection_name() format and determinism
- index_item(): calls collection.upsert with correct args
- index_item(): skips upsert when title+description are both empty
- index_document(): calls collection.upsert with doc: prefix
- index_document(): skips upsert when title+content are both empty
- index_document(): truncates text to 8000 chars before embedding
- search(): maps distances to scores (1 - distance)
- search(): handles filter_type by passing where clause
- search(): returns empty list when results are empty
- delete_item(): calls collection.delete with correct id
- delete_workspace_collection(): calls client.delete_collection
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# collection_name()
# ---------------------------------------------------------------------------

def test_collection_name_format():
    from app.rag.indexer import collection_name
    name = collection_name("550e8400-e29b-41d4-a716-446655440000")
    assert name.startswith("workspace_")
    # Hyphens replaced with underscores in the uuid part
    uuid_part = name.split("workspace_")[1]
    assert "-" not in uuid_part
    assert "550e8400" in uuid_part


def test_collection_name_deterministic():
    from app.rag.indexer import collection_name
    ws_id = "abc-123"
    assert collection_name(ws_id) == collection_name(ws_id)


def test_collection_name_no_hyphens():
    from app.rag.indexer import collection_name
    name = collection_name("ws-id-with-many-hyphens")
    assert "-" not in name


def test_collection_name_simple_id():
    from app.rag.indexer import collection_name
    assert collection_name("abc123") == "workspace_abc123"


# ---------------------------------------------------------------------------
# index_item()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_index_item_calls_upsert():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_embedding = [0.1] * 768

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=mock_embedding):
        await indexer.index_item(
            workspace_id="ws-123",
            item_id="item-456",
            title="Fix login bug",
            description="The login form fails on Safari",
        )

    mock_collection.upsert.assert_called_once()
    kwargs = mock_collection.upsert.call_args.kwargs
    assert kwargs["ids"] == ["item:item-456"]
    assert kwargs["embeddings"] == [mock_embedding]
    assert "Fix login bug" in kwargs["documents"][0]
    assert "The login form fails on Safari" in kwargs["documents"][0]


@pytest.mark.asyncio
async def test_index_item_metadata_contains_type_and_ids():
    from app.rag import indexer

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        await indexer.index_item("ws-meta", "item-meta", title="Test", description="desc")

    kwargs = mock_collection.upsert.call_args.kwargs
    meta = kwargs["metadatas"][0]
    assert meta["type"] == "item"
    assert meta["item_id"] == "item-meta"
    assert meta["workspace_id"] == "ws-meta"


@pytest.mark.asyncio
async def test_index_item_skips_empty_text():
    from app.rag import indexer

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection):
        await indexer.index_item("ws-123", "item-456", title="", description="")

    mock_collection.upsert.assert_not_called()


@pytest.mark.asyncio
async def test_index_item_title_only_is_indexed():
    """A non-empty title with no description should still be indexed."""
    from app.rag import indexer

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        await indexer.index_item("ws-123", "item-789", title="Standalone title", description="")

    mock_collection.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_index_item_passes_combined_text_to_embed():
    """embed_text must receive title + '\n' + description."""
    from app.rag import indexer

    captured = {}

    async def fake_embed(text):
        captured["text"] = text
        return [0.0] * 768

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", side_effect=fake_embed):
        await indexer.index_item("ws-1", "i-1", title="Title", description="Desc")

    assert captured["text"] == "Title\nDesc"


# ---------------------------------------------------------------------------
# index_document()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_index_document_calls_upsert():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_embedding = [0.2] * 768

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=mock_embedding):
        await indexer.index_document(
            workspace_id="ws-doc",
            doc_id="doc-001",
            title="Onboarding Guide",
            content_text="This guide explains the onboarding process.",
        )

    mock_collection.upsert.assert_called_once()
    kwargs = mock_collection.upsert.call_args.kwargs
    assert kwargs["ids"] == ["doc:doc-001"]
    assert kwargs["embeddings"] == [mock_embedding]
    meta = kwargs["metadatas"][0]
    assert meta["type"] == "document"
    assert meta["doc_id"] == "doc-001"


@pytest.mark.asyncio
async def test_index_document_skips_empty():
    from app.rag import indexer

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection):
        await indexer.index_document("ws-doc", "doc-empty", title="", content_text="")

    mock_collection.upsert.assert_not_called()


@pytest.mark.asyncio
async def test_index_document_truncates_at_8000():
    """Long documents must be truncated to 8000 chars before embedding."""
    from app.rag import indexer

    captured = {}

    async def fake_embed(text):
        captured["text"] = text
        return [0.0] * 768

    mock_collection = AsyncMock()
    long_content = "x" * 10_000

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", side_effect=fake_embed):
        await indexer.index_document("ws-trunc", "doc-trunc", title="T", content_text=long_content)

    assert len(captured["text"]) <= 8000


# ---------------------------------------------------------------------------
# search()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_returns_results():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {
        "ids": [["item:abc", "doc:xyz"]],
        "documents": [["Fix login bug", "Onboarding guide"]],
        "metadatas": [[{"type": "item"}, {"type": "document"}]],
        "distances": [[0.1, 0.3]],
    }

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.5] * 768):
        results = await indexer.search("ws-123", "login bug")

    assert len(results) == 2
    assert results[0]["score"] == pytest.approx(0.9)   # 1 - 0.1
    assert results[1]["score"] == pytest.approx(0.7)   # 1 - 0.3
    assert results[0]["id"] == "item:abc"
    assert results[1]["id"] == "doc:xyz"


@pytest.mark.asyncio
async def test_search_maps_distance_to_similarity():
    """score = 1 - distance for cosine similarity."""
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {
        "ids": [["item:x"]],
        "documents": [["content"]],
        "metadatas": [[{"type": "item"}]],
        "distances": [[0.0]],  # perfect match
    }

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[1.0] * 768):
        results = await indexer.search("ws-123", "perfect query")

    assert results[0]["score"] == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_search_returns_empty_list_on_no_results():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        results = await indexer.search("ws-empty", "anything")

    assert results == []


@pytest.mark.asyncio
async def test_search_passes_filter_type_as_where():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {
        "ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]
    }

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        await indexer.search("ws-filter", "query", filter_type="item")

    call_kwargs = mock_collection.query.call_args.kwargs
    assert call_kwargs["where"] == {"type": "item"}


@pytest.mark.asyncio
async def test_search_no_filter_type_passes_none_where():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {
        "ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]
    }

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        await indexer.search("ws-no-filter", "query")

    call_kwargs = mock_collection.query.call_args.kwargs
    assert call_kwargs["where"] is None


@pytest.mark.asyncio
async def test_search_includes_document_and_metadata():
    from app.rag import indexer

    mock_collection = AsyncMock()
    mock_collection.query.return_value = {
        "ids": [["item:z"]],
        "documents": [["some document text"]],
        "metadatas": [[{"type": "item", "item_id": "z"}]],
        "distances": [[0.2]],
    }

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection), \
         patch.object(indexer, "embed_text", return_value=[0.0] * 768):
        results = await indexer.search("ws-123", "query")

    assert results[0]["document"] == "some document text"
    assert results[0]["metadata"]["type"] == "item"


# ---------------------------------------------------------------------------
# delete_item()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_item_calls_collection_delete():
    from app.rag import indexer

    mock_collection = AsyncMock()

    with patch.object(indexer, "get_or_create_collection", return_value=mock_collection):
        await indexer.delete_item("ws-del", "item-del")

    mock_collection.delete.assert_called_once_with(ids=["item:item-del"])


# ---------------------------------------------------------------------------
# delete_workspace_collection()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_workspace_collection_calls_client():
    from app.rag import indexer

    mock_client = AsyncMock()

    with patch.object(indexer, "get_chroma_client", return_value=mock_client):
        await indexer.delete_workspace_collection("ws-nuke")

    mock_client.delete_collection.assert_called_once_with("workspace_ws_nuke")
