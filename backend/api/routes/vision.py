from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from backend.core.services.vision_service import (
    save_image,
    list_images,
    get_image_path,
    analyze_image_with_vision,
    extract_document_text
)
from backend.core.services.document_service import save_document

router = APIRouter(prefix="/vision", tags=["Vision"])


@router.post("/upload")
async def upload_image_endpoint(file: UploadFile = File(...)):
    return await save_image(file)


@router.get("/images")
async def list_images_endpoint():
    return {"images": list_images()}


@router.get("/images/{filename}")
async def serve_image_endpoint(filename: str):
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
    selected_docs: Optional[str] = Form(None)
):
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
        docs_list = [d.strip() for d in selected_docs.split(",") if d.strip()]

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
