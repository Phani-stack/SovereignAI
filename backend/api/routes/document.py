from fastapi import APIRouter, UploadFile, File

from backend.core.services.document_service import save_document
from backend.api.schemas.document import DocumentResponse


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    file_path = await save_document(file)
    return {
        "filename": file.filename,
        "location": str(file_path),
        "message": "Document uploaded successfully",
    }
