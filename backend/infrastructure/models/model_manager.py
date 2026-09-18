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


def get_engineering_model():
    """Model tuned through prompting for engineering and quantitative work."""
    return ChatOllama(
        model=settings["engineering_model"],
        base_url=settings["ollama_base_url"],
        # Qwen3 otherwise spends a long time producing hidden reasoning before
        # the first visible stream token. The UI already provides a concise
        # processing trace, so return the answer stream immediately.
        reasoning=False,
        temperature=settings["temperature"],
        num_ctx=settings["num_ctx"],
        num_predict=min(settings["num_predict"], 1200),
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
    normalized = (name or "general").strip().lower()
    if normalized in {"general", "qwen3", "chat"}:
        return get_general_model()

    if normalized in {"coding", "coder"}:
        return get_coding_model()

    if normalized in {"engineering", "engineer", "math", "maths", "calc", "cal", "qwen3:4b"}:
        return get_engineering_model()

    if normalized == "vision":
        return get_vision_model()

    raise ValueError(f"Unknown model: {name}")
