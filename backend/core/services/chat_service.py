from backend.core.agent.graph import agent


def chat(message: str) -> str:

    result = agent.invoke({"query": message})

    return result.get("response", "No response generated.")
