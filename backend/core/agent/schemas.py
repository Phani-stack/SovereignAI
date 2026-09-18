from pydantic import BaseModel


class RoutingDecision(BaseModel):
    model: str
    needs_rag: bool
    needs_tools: bool
    output_type: str
