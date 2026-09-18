from pathlib import Path
import logging
from backend.infrastructure.qdrant.collection import create_collection, COLLECTION_NAME
from backend.infrastructure.qdrant.insert import insert
from backend.infrastructure.qdrant.client import client
from backend.core.rag import embedding

logger = logging.getLogger(__name__)


from backend.infrastructure.qdrant.insert import insert, insert_batch


def save_document_to_vectordb(document):
    filename = Path(document).name
    content = embedding.text_content_from_document(document)
    if not content or not content.strip():
        return "No text content extracted to index"

    chunks = embedding.chunking(content=content)
    if not chunks:
        return "No content to index"

    vectors = embedding.embedding(chunks=chunks)
    if not vectors or len(vectors) == 0:
        return "Failed to generate embeddings"

    create_collection(len(vectors[0]))

    insert_batch(vectors=vectors, chunks=chunks, filename=filename, batch_size=100)

    return "Document saved successfully"


import urllib.parse


def delete_document_from_vectordb(filename: str):
    raw_basename = Path(filename).name
    unquoted_basename = urllib.parse.unquote(raw_basename)
    try:
        if not client.collection_exists(COLLECTION_NAME):
            return
        from qdrant_client.models import Filter, FieldCondition, MatchValue, FilterSelector
        target_names = list({raw_basename, unquoted_basename})
        for name in target_names:
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[
                            FieldCondition(
                                key="filename",
                                match=MatchValue(value=name)
                            )
                        ]
                    )
                )
            )
        logger.info(f"Deleted points from vector DB for document: {target_names}")
    except Exception as e:
        logger.warning(f"Vector DB deletion failed or skipped for {filename}: {e}")


