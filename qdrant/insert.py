from .client import client
from .collection import COLLECTION_NAME
from qdrant_client.models import PointStruct
import uuid


def insert(vector, text):

    point = PointStruct(
        id=str(uuid.uuid4()),
        vector=vector,
        payload={
            "text": text
        }
    )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[point]
    )
