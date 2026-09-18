from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.api.schemas.chat import ChatRequest
from backend.core.services.chat_service import chat_stream


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/")
async def chat_endpoint(request: ChatRequest):

    return StreamingResponse(
        chat_stream(
            request.message,
            model=request.model,
            selected_docs=request.selected_docs,
            image_path=request.image_path
        ),
        media_type="text/plain; charset=utf-8",
    )

