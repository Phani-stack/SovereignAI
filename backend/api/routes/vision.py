from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse

from backend.core.services.vision_service import (
    save_image,
    list_images,
    get_image_path,
    analyze_image_with_vision,
    extract_document_text
)
from backend.core.services.document_service import save_document
from backend.api.routes.auth import get_current_user_from_header
from backend.core.services.auth_service import has_ability, can_access_document

router = APIRouter(prefix="/vision", tags=["Vision"])


def _require_vision_permission(user: dict):
    if not has_ability(user, "can_use_vision"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission ('can_use_vision') to use Vision & OCR analysis."
        )


@router.post("/upload")
async def upload_image_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_from_header)
):
    _require_vision_permission(current_user)
    return await save_image(file)


@router.get("/images")
async def list_images_endpoint(current_user: dict = Depends(get_current_user_from_header)):
    _require_vision_permission(current_user)
    return {"images": list_images()}


@router.get("/images/{filename}")
async def serve_image_endpoint(
    filename: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    _require_vision_permission(current_user)
    image_path = get_image_path(filename)
    if not image_path:
        raise HTTPException(status_code=404, detail="Image file not found")
    return FileResponse(path=image_path)


@router.post("/")
async def vision_endpoint(
    query: str = Form(...),
    image: Optional[UploadFile] = File(None),
    document: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    selected_docs: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user_from_header)
):
    _require_vision_permission(current_user)

    image_bytes = None
    saved_file_info = None
    document_text = None
    document_name = None

    if image and image.filename:
        saved_file_info = await save_image(image)
        image_bytes = None
        image_path = saved_file_info["location"]

    if document and document.filename:
        document_path = await save_document(document)
        document_name = document.filename
        document_text = extract_document_text(document_path)

    docs_list = None
    if selected_docs:
        docs_list = [
            d.strip() for d in selected_docs.split(",")
            if d.strip() and can_access_document(current_user, d.strip())
        ]

    response_text = analyze_image_with_vision(
        query=query,
        image_bytes=image_bytes,
        image_path=image_path,
        document_text=document_text,
        document_name=document_name,
        model_override=model,
        selected_docs=docs_list
    )

    return {
        "query": query,
        "filename": saved_file_info["filename"] if saved_file_info else (document_name or image_path or "No file attached"),
        "url": saved_file_info["url"] if saved_file_info else (f"/vision/images/{image_path}" if image_path else None),
        "message": response_text
    }
