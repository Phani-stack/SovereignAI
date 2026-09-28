from .client import client
from .collection import COLLECTION_NAME
import logging

logger = logging.getLogger(__name__)


def search(vector, limit=10, score_threshold=0.35):
    try:
        if not client.collection_exists(COLLECTION_NAME):
            return []
        results = client.query_points(
            collection_name=COLLECTION_NAME, query=vector, limit=limit, score_threshold=score_threshold
        )
        return results.points
    except Exception as e:
        logger.warning(f"Vector search failed or collection empty: {e}")
        return []


