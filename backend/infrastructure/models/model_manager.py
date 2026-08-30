from langchain_ollama import ChatOllama

from backend.config import get_settings


settings = get_settings()


def get_general_model():
    return ChatOllama(
        model=settings["general_model"],
        base_url=settings["ollama_base_url"],
        temperature=settings["temperature"],
        num_ctx=settings["num_ctx"],
        num_predict=settings["num_predict"],
    )


def get_coding_model():
    return ChatOllama(
        model=settings["coding_model"],
        base_url=settings["ollama_base_url"],
        temperature=settings["temperature"],
        num_ctx=settings["num_ctx"],
        num_predict=settings["num_predict"],
    )


def get_vision_model():
    return ChatOllama(
        model=settings["vision_model"],
        base_url=settings["ollama_base_url"],
        temperature=settings["temperature"],
        num_ctx=settings["num_ctx"],
        num_predict=settings["num_predict"],
    )


def get_model(name: str):
    if name == "general":
        return get_general_model()

    if name == "coding":
        return get_coding_model()

    if name == "vision":
        return get_vision_model()

    raise ValueError(f"Unknown model: {name}")
