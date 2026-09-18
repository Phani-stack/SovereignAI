from pydantic import BaseModel


class AgentState(BaseModel):
    query: str

    model: str = ""

    needs_rag: bool = False

    needs_tools: bool = False

    output_type: str = "text"

    context: str = ""

    response: str = ""

    image_path: str = ""

    has_image: bool = False
