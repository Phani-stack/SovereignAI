from langchain_ollama import ChatOllama

from backend.config import get_settings

settings = get_settings()

model = ChatOllama(
    model=settings["coding_model"],
    base_url=settings["ollama_base_url"],
    temperature=settings["temperature"],
    num_ctx=settings["num_ctx"],
    num_predict=settings["num_predict"],
)
