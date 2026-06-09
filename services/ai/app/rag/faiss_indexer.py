import pickle
import logging
from pathlib import Path
from typing import Optional

import numpy as np

from app.core.config import settings
from app.core.providers import generate_embedding

logger = logging.getLogger(__name__)

try:
    import faiss
except ImportError:
    faiss = None
    logger.warning("faiss not installed; FAISS indexer disabled")


class FaissIndexManager:
    MANIFEST_FILE = 'manifest.pkl'

    def __init__(self, storage_path: str | None = None):
        self._storage_path = storage_path or getattr(settings, 'FAISS_STORAGE_PATH', '/data/faiss')
        self._indices: dict[str, '_IndexEntry'] = {}

    def _workspace_path(self, workspace_id: str) -> Path:
        safe = workspace_id.replace('-', '_')
        return Path(self._storage_path) / safe

    def _rebuild_from_chunks(self, workspace_id: str, documents: list[str],
                             metadatas: list[dict], ids: list[str]) -> None:
        if faiss is None:
            logger.error("FAISS not available, cannot rebuild index")
            return

        embeddings = []
        valid_docs = []
        valid_metas = []
        valid_ids = []

        for i, doc in enumerate(documents):
            try:
                emb = generate_embedding(doc)
                embeddings.append(emb)
                valid_docs.append(doc)
                valid_metas.append(metadatas[i] if i < len(metadatas) else {})
                valid_ids.append(ids[i] if i < len(ids) else f'chunk_{i}')
            except Exception as exc:
                logger.warning("Embedding failed for chunk %d: %s", i, exc)

        if not embeddings:
            logger.warning("No valid embeddings for workspace %s", workspace_id)
            return

        embeddings_np = np.array(embeddings, dtype=np.float32)
        dimension = embeddings_np.shape[1]

        index = faiss.IndexHNSWFlat(dimension, 16, faiss.METRIC_INNER_PRODUCT)
        index.hnsw.efSearch = 128
        index.train(embeddings_np)
        index.add(embeddings_np)

        entry = _IndexEntry(
            index=index,
            documents=valid_docs,
            metadatas=valid_metas,
            ids=valid_ids,
        )
        self._indices[workspace_id] = entry

        wpath = self._workspace_path(workspace_id)
        wpath.mkdir(parents=True, exist_ok=True)

        faiss.write_index(index, str(wpath / 'embedding.faiss'))
        with open(wpath / self.MANIFEST_FILE, 'wb') as f:
            pickle.dump({
                'documents': valid_docs,
                'metadatas': valid_metas,
                'ids': valid_ids,
            }, f)

        logger.info("Rebuilt FAISS index for workspace %s (%d chunks)", workspace_id, len(valid_docs))

    def load_index(self, workspace_id: str) -> bool:
        if workspace_id in self._indices:
            return True
        if faiss is None:
            return False

        wpath = self._workspace_path(workspace_id)
        index_file = wpath / 'embedding.faiss'
        manifest_file = wpath / self.MANIFEST_FILE

        if not index_file.exists() or not manifest_file.exists():
            return False

        try:
            index = faiss.read_index(str(index_file))
            with open(manifest_file, 'rb') as f:
                data = pickle.load(f)

            self._indices[workspace_id] = _IndexEntry(
                index=index,
                documents=data['documents'],
                metadatas=data.get('metadatas', [{}] * len(data['documents'])),
                ids=data.get('ids', [f'chunk_{i}' for i in range(len(data['documents']))]),
            )
            logger.info("Loaded FAISS index for workspace %s (%d chunks)", workspace_id, len(data['documents']))
            return True
        except Exception as exc:
            logger.warning("Failed to load FAISS index for workspace %s: %s", workspace_id, exc)
            return False

    def search(self, workspace_id: str, query: str, k: int = 10,
               threshold: float = -1.0) -> list[dict]:
        if workspace_id not in self._indices and not self.load_index(workspace_id):
            return []

        entry = self._indices[workspace_id]
        if entry.index.ntotal == 0:
            return []

        try:
            query_emb = generate_embedding(query)
            query_np = np.array([query_emb], dtype=np.float32)

            scores, indices = entry.index.search(query_np, min(k, entry.index.ntotal))

            results = []
            for j, idx in enumerate(indices[0]):
                if idx == -1:
                    continue
                score = float(scores[0][j])
                if threshold < 0 or score >= threshold:
                    results.append({
                        'id': entry.ids[idx],
                        'document': entry.documents[idx],
                        'metadata': entry.metadatas[idx],
                        'score': max(0.0, min(1.0, (score + 1.0) / 2.0)),
                    })
            return results
        except Exception as exc:
            logger.warning("FAISS search failed for workspace %s: %s", workspace_id, exc)
            return []

    def add_item(self, workspace_id: str, item_id: str, title: str,
                 description: str = '', metadata: dict | None = None) -> None:
        if faiss is None:
            return
        if workspace_id not in self._indices and not self.load_index(workspace_id):
            return

        text = f'{title}\n{description}'.strip()
        if not text:
            return

        try:
            emb = generate_embedding(text)
            emb_np = np.array([emb], dtype=np.float32)

            entry = self._indices[workspace_id]
            entry.index.add(emb_np)
            entry.documents.append(text)
            entry.metadatas.append(metadata or {'type': 'item', 'item_id': item_id, 'workspace_id': workspace_id})
            entry.ids.append(f'item:{item_id}')

            self._persist(workspace_id)
        except Exception as exc:
            logger.warning("FAISS add_item failed for %s/%s: %s", workspace_id, item_id, exc)

    def add_document(self, workspace_id: str, doc_id: str, title: str,
                     content_text: str = '', metadata: dict | None = None) -> None:
        if faiss is None:
            return
        if workspace_id not in self._indices and not self.load_index(workspace_id):
            return

        text = f'{title}\n{content_text}'[:8000]
        if not text:
            return

        try:
            emb = generate_embedding(text)
            emb_np = np.array([emb], dtype=np.float32)

            entry = self._indices[workspace_id]
            entry.index.add(emb_np)
            entry.documents.append(text)
            entry.metadatas.append(metadata or {'type': 'document', 'doc_id': doc_id, 'workspace_id': workspace_id})
            entry.ids.append(f'doc:{doc_id}')

            self._persist(workspace_id)
        except Exception as exc:
            logger.warning("FAISS add_document failed for %s/%s: %s", workspace_id, doc_id, exc)

    def delete_item(self, workspace_id: str, item_id: str) -> None:
        if workspace_id not in self._indices and not self.load_index(workspace_id):
            return
        entry = self._indices[workspace_id]
        target = f'item:{item_id}'
        found = [i for i, id_ in enumerate(entry.ids) if id_ == target]
        if found:
            self._remove_ids(workspace_id, found)

    def delete_document(self, workspace_id: str, doc_id: str) -> None:
        if workspace_id not in self._indices and not self.load_index(workspace_id):
            return
        entry = self._indices[workspace_id]
        target = f'doc:{doc_id}'
        found = [i for i, id_ in enumerate(entry.ids) if id_ == target]
        if found:
            self._remove_ids(workspace_id, found)

    def delete_workspace(self, workspace_id: str) -> None:
        self._indices.pop(workspace_id, None)
        wpath = self._workspace_path(workspace_id)
        if wpath.exists():
            import shutil
            shutil.rmtree(wpath)

    def _remove_ids(self, workspace_id: str, indices_to_remove: list[int]) -> None:
        entry = self._indices[workspace_id]
        keep = [i for i in range(len(entry.ids)) if i not in indices_to_remove]
        if len(keep) == len(entry.ids):
            return

        remaining_docs = [entry.documents[i] for i in keep]
        remaining_metas = [entry.metadatas[i] for i in keep]
        remaining_ids = [entry.ids[i] for i in keep]

        self._rebuild_from_chunks(workspace_id, remaining_docs, remaining_metas, remaining_ids)

    def _persist(self, workspace_id: str) -> None:
        entry = self._indices.get(workspace_id)
        if not entry:
            return
        wpath = self._workspace_path(workspace_id)
        wpath.mkdir(parents=True, exist_ok=True)
        faiss.write_index(entry.index, str(wpath / 'embedding.faiss'))
        with open(wpath / self.MANIFEST_FILE, 'wb') as f:
            pickle.dump({
                'documents': entry.documents,
                'metadatas': entry.metadatas,
                'ids': entry.ids,
            }, f)

    def sync_from_chromadb(self, workspace_id: str) -> None:
        try:
            from app.rag.indexer import search as chroma_search
            results = chroma_search(workspace_id, '', n_results=1000)
            if not results:
                logger.info("No ChromaDB results to sync for workspace %s", workspace_id)
                return

            documents = [r['document'] for r in results]
            metadatas = [r['metadata'] for r in results]
            ids = [r['id'] for r in results]

            self._rebuild_from_chunks(workspace_id, documents, metadatas, ids)
            logger.info("Synced FAISS from ChromaDB for workspace %s (%d chunks)", workspace_id, len(documents))
        except Exception as exc:
            logger.warning("Failed to sync FAISS from ChromaDB for %s: %s", workspace_id, exc)


class _IndexEntry:
    def __init__(self, index, documents: list[str], metadatas: list[dict], ids: list[str]):
        self.index = index
        self.documents = documents
        self.metadatas = metadatas
        self.ids = ids


_index_manager: Optional[FaissIndexManager] = None


def get_faiss_manager() -> FaissIndexManager:
    global _index_manager
    if _index_manager is None:
        _index_manager = FaissIndexManager()
    return _index_manager
