from pydantic import BaseModel


class DocumentResponse(BaseModel):
    filename: str
    location: str
    message: str
