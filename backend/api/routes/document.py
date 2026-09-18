from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from backend.core.services.document_service import save_document, STORAGE_DIR
from backend.core.rag.vectordb import delete_document_from_vectordb
from backend.api.schemas.document import DocumentResponse


router = APIRouter(prefix="/documents", tags=["Documents"])


OUTPUT_DIR = Path("./data/outputs")


@router.get("/")
async def list_documents():
    docs = []
    seen = set()
    for directory, category in [(STORAGE_DIR, "uploaded"), (OUTPUT_DIR, "generated")]:
        if directory.exists():
            for file in directory.iterdir():
                if file.is_file() and file.name not in seen:
                    seen.add(file.name)
                    stat = file.stat()
                    docs.append({
                        "filename": file.name,
                        "location": str(file.resolve()),
                        "size": stat.st_size,
                        "uploaded_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "status": "Indexed" if category == "uploaded" else "AI Generated",
                        "category": category
                    })
    return {"documents": docs}



@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    file_path = await save_document(file)
    return {
        "filename": file.filename,
        "location": str(file_path),
        "message": "Document uploaded successfully",
    }


@router.delete("/{filename}")
async def delete_document(filename: str):
    file_basename = Path(filename).name
    deleted = False
    for directory in [STORAGE_DIR, OUTPUT_DIR]:
        target = directory / file_basename
        if target.exists():
            try:
                target.unlink()
                deleted = True
            except Exception:
                pass

    # Delete vectors from vector database
    delete_document_from_vectordb(file_basename)

    if deleted:
        return {"filename": filename, "message": "Document deleted successfully"}
    raise HTTPException(status_code=404, detail="Document not found")



import mimetypes

mimetypes.add_type("application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx")
mimetypes.add_type("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx")
mimetypes.add_type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx")


@router.get("/download/{filename:path}")
async def download_document(filename: str):
    file_basename = Path(filename).name
    candidates = [
        STORAGE_DIR / file_basename,
        OUTPUT_DIR / file_basename,
        Path(filename),
    ]
    for target in candidates:
        if target.exists() and target.is_file():
            media_type, _ = mimetypes.guess_type(str(target))
            if not media_type:
                media_type = "application/octet-stream"

            headers = {
                "Content-Disposition": f'attachment; filename="{target.name}"'
            }

            return FileResponse(
                path=target,
                filename=target.name,
                media_type=media_type,
                headers=headers
            )
    raise HTTPException(status_code=404, detail="Document not found")
