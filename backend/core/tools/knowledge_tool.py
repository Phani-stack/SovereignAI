from langchain_core.tools import tool

from backend.core.rag.retrive import query as retrieve


@tool
def search_knowledge_base(question: str) -> str:
    """Search the local organizational knowledge base."""

    try:
        result = retrieve(question)

        if not result:
            return "No relevant knowledge found."

        return str(result)

    except Exception as e:
        return f"Knowledge search error: {e}"
