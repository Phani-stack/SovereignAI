from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from backend.api.schemas.chat import ChatRequest
from backend.core.services.chat_service import chat_stream
from backend.api.routes.auth import get_current_user_from_header
from backend.core.services.auth_service import has_ability, can_access_document


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/")
async def chat_endpoint(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not has_ability(current_user, "can_use_chat"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission ('can_use_chat') to use AI Chat."
        )

    allowed_docs = None
    if request.selected_docs:
        allowed_docs = [
            doc for doc in request.selected_docs
            if can_access_document(current_user, doc)
        ]

    return StreamingResponse(
        chat_stream(
            request.message,
            model=request.model,
            selected_docs=allowed_docs,
            image_path=request.image_path,
            user=current_user
        ),
        media_type="text/plain; charset=utf-8",
    )

