from langchain_ollama import ChatOllama


def get_general_model():

    return ChatOllama(
        model="qwen2.5:3b",
        temperature=0
    )


def get_coding_model():

    return ChatOllama(
        model="qwen2.5-coder:3b",
        temperature=0
    )


def get_vision_model():

    return ChatOllama(
        model="YOUR_VISION_MODEL",
        temperature=0
    )


def get_model(name: str):

    if name == "general":
        return get_general_model()

    if name == "coding":
        return get_coding_model()

    if name == "vision":
        return get_vision_model()

    raise ValueError(
        f"Unknown model: {name}"
    )
