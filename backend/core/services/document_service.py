from pathlib import Path

from fastapi import UploadFile, HTTPException

from backend.core.rag.vectordb import save_document_to_vectordb


STORAGE_DIR = Path("storage")

ALLOWED_EXTENSIONS = {".txt", ".csv", ".pdf", ".docx"}


async def save_document(file: UploadFile):
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Only .txt, .csv, .pdf and .docx files are allowed"
        )

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    path = STORAGE_DIR / file.filename

    with open(path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)
    response = save_document_to_vectordb(str(path))

    return path
