from .client import client
from .collection import COLLECTION_NAME


def search(vector, limit=3):
    results = client.query_points(
        collection_name=COLLECTION_NAME, query=vector, limit=limit
    )

    return results.points
