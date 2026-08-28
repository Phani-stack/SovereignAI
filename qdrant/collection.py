from qdrant_client.models import VectorParams, Distance
from .client import client

COLLECTION_NAME = "documents"


def create_collection(vector_size):
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )
