from qdrant.collection import create_collection
from qdrant.insert import insert

from rag import embedding


def save_document_to_vectordb(document):
    content = embedding.text_content_from_document(document)
    chunks = embedding.chunking(content=content)
    vectors = embedding.embedding(chunks=chunks)
    
    create_collection(len(vectors[0]))

    for chunk, vector in zip(chunks, vectors):
        insert(vector=vector, text=chunk)

    return "Document saved successfully"
