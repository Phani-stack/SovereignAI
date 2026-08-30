from backend.infrastructure.models import general_model, embedding_model
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.infrastructure.loaders import loader_router


def text_content_from_document(path):
    content = loader_router.load_document(path)[0].page_content
    return content


def chunking(content):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_text(content)
    return chunks


def embedding(chunks):
    vectors = embedding_model.model.embed_documents(chunks)
    return vectors


def embedding_chunk(chunk):
    vector = embedding_model.model.embed_query(chunk)
    return vector


def embed(path):
    content = text_content_from_document(path=path)
    chunks = chunking(content=content)
    vectors = embedding(chunks=chunks)
    return vectors
