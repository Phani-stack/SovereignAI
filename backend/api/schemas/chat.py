from pydantic import BaseModel


from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    selected_docs: Optional[List[str]] = None
    image_path: Optional[str] = None
    image_url: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
