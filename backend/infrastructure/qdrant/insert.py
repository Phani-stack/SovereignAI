from .client import client
from .collection import COLLECTION_NAME
from qdrant_client.models import PointStruct
import uuid


def insert(vector, text, filename=None, folder=None):
    payload = {"text": text}
    if filename:
        payload["filename"] = filename
    if folder:
        payload["folder"] = folder

    point = PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)
    client.upsert(collection_name=COLLECTION_NAME, points=[point])


def insert_batch(vectors, chunks, filename=None, folder=None, batch_size=100):
    """Upsert vectors in batches to Qdrant for high-performance indexing."""
    total = len(chunks)
    for i in range(0, total, batch_size):
        batch_vectors = vectors[i:i + batch_size]
        batch_chunks = chunks[i:i + batch_size]
        points = []
        for vec, chunk in zip(batch_vectors, batch_chunks):
            payload = {"text": chunk}
            if filename:
                payload["filename"] = filename
            if folder:
                payload["folder"] = folder
            points.append(PointStruct(id=str(uuid.uuid4()), vector=vec, payload=payload))
        
        client.upsert(collection_name=COLLECTION_NAME, points=points)


