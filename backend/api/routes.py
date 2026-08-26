from fastapi import APIRouter

from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.chat_service import process_chat

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "sovereign-ai-backend"
    }


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    response = process_chat(request.message)

    return ChatResponse(
        response=response
    )
