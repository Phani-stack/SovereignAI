import asyncio
from pathlib import Path

from fastapi import UploadFile, HTTPException

from backend.core.rag.vectordb import save_document_to_vectordb


STORAGE_DIR = Path("storage")

ALLOWED_EXTENSIONS = {
    ".txt", ".csv", ".pdf", ".docx", ".doc", ".md", 
    ".rtf", ".log", ".json", ".py", ".js", ".ts", 
    ".html", ".css", ".xlsx", ".xls", ".pptx", ".ppt"
}


async def save_document(file: UploadFile):
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail=f"Unsupported file format '{extension}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    path = STORAGE_DIR / file.filename

    with open(path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # Process vector embedding in background thread to prevent blocking event loop for large files
    try:
        response = await asyncio.to_thread(save_document_to_vectordb, str(path))
    except Exception as err:
        print(f"[RAG Indexing Warning] Error embedding {file.filename}: {err}")
        response = f"Saved file, vector indexing deferred: {err}"

    return path
