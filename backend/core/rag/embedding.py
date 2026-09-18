from backend.infrastructure.models import general_model, embedding_model
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.infrastructure.loaders import loader_router


def text_content_from_document(path):
    docs = loader_router.load_document(str(path))
    if not docs:
        return ""
    return "\n\n".join(doc.page_content for doc in docs if hasattr(doc, "page_content") and doc.page_content)



def chunking(content):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_text(content)
    return chunks


def embedding(chunks, batch_size=32):
    if not chunks:
        return []
    all_vectors = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        batch_vectors = embedding_model.model.embed_documents(batch)
        all_vectors.extend(batch_vectors)
    return all_vectors


def embedding_chunk(chunk):
    vector = embedding_model.model.embed_query(chunk)
    return vector


def embed(path):
    content = text_content_from_document(path=path)
    chunks = chunking(content=content)
    vectors = embedding(chunks=chunks)
    return vectors
