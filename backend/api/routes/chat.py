from fastapi import APIRouter

from backend.api.schemas.chat import ChatRequest, ChatResponse

from backend.core.services.chat_service import chat


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):

    response = chat(request.message)

    return ChatResponse(response=response)
