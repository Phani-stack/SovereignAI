from qdrant_client import QdrantClient

client = QdrantClient(
    host="localhost",
    port=6333,
    # Qdrant is optional for chats without attached knowledge-base files.
    # Avoid a startup network probe and warning when the service is offline.
    check_compatibility=False,
)
