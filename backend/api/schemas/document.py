from typing import List, Optional
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    filename: str
    location: str
    message: str
    folder: Optional[str] = "Default"


class FolderItem(BaseModel):
    name: str
    is_default: bool = False
    doc_count: int = 0
    created_at: Optional[str] = None


class FolderListResponse(BaseModel):
    folders: List[FolderItem]


class CreateFolderRequest(BaseModel):
    name: str


class SearchRequest(BaseModel):
    query: str
    folder: Optional[str] = None
    limit: Optional[int] = 10


class SearchResultItem(BaseModel):
    id: str
    title: str
    snippet: str
    source: str
    folder: Optional[str] = "Default"
    score: Optional[float] = None
    page: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    count: int

