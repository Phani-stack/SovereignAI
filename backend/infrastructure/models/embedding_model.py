from langchain_ollama import OllamaEmbeddings

from backend.config import get_settings

settings = get_settings()

model = OllamaEmbeddings(
    model=settings["embedding_model"],
    base_url=settings["ollama_base_url"],
)
