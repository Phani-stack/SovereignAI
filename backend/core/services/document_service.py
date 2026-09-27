import asyncio
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile, HTTPException

from backend.core.rag.vectordb import save_document_to_vectordb


DEFAULT_FOLDER = "Default"
STORAGE_DIR = Path("storage")

ALLOWED_EXTENSIONS = {
    ".txt", ".csv", ".pdf", ".docx", ".doc", ".md", 
    ".rtf", ".log", ".json", ".py", ".js", ".ts", 
    ".html", ".css", ".xlsx", ".xls", ".pptx", ".ppt"
}


def sanitize_folder_name(name: str) -> str:
    if not name or not name.strip():
        return DEFAULT_FOLDER
    clean = Path(name.strip()).name.replace("..", "").replace("/", "").replace("\\", "")
    return clean if clean else DEFAULT_FOLDER


def ensure_default_folder() -> Path:
    default_path = STORAGE_DIR / DEFAULT_FOLDER
    default_path.mkdir(parents=True, exist_ok=True)
    return default_path


def list_folders():
    ensure_default_folder()
    folders = []
    seen = set()

    # Always include Default folder first
    default_dir = STORAGE_DIR / DEFAULT_FOLDER
    default_count = 0
    if default_dir.exists():
        # Count files inside Default directory plus any loose files directly in STORAGE_DIR
        default_count += sum(1 for item in default_dir.iterdir() if item.is_file())
    for loose_item in STORAGE_DIR.iterdir():
        if loose_item.is_file():
            default_count += 1

    folders.append({
        "name": DEFAULT_FOLDER,
        "is_default": True,
        "doc_count": default_count,
        "created_at": datetime.fromtimestamp(default_dir.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S") if default_dir.exists() else None
    })
    seen.add(DEFAULT_FOLDER.lower())

    if STORAGE_DIR.exists():
        for sub in sorted(STORAGE_DIR.iterdir()):
            if sub.is_dir() and sub.name.lower() not in seen:
                seen.add(sub.name.lower())
                count = sum(1 for f in sub.iterdir() if f.is_file())
                stat = sub.stat()
                folders.append({
                    "name": sub.name,
                    "is_default": False,
                    "doc_count": count,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })

    return folders


def create_folder(folder_name: str):
    clean_name = sanitize_folder_name(folder_name)
    folder_path = STORAGE_DIR / clean_name
    folder_path.mkdir(parents=True, exist_ok=True)
    return {
        "name": clean_name,
        "is_default": clean_name == DEFAULT_FOLDER,
        "doc_count": sum(1 for f in folder_path.iterdir() if f.is_file()),
        "created_at": datetime.fromtimestamp(folder_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
    }


def delete_folder(folder_name: str):
    clean_name = sanitize_folder_name(folder_name)
    if clean_name == DEFAULT_FOLDER:
        raise HTTPException(status_code=400, detail="Cannot delete the default folder.")

    folder_path = STORAGE_DIR / clean_name
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=404, detail=f"Folder '{clean_name}' not found.")

    from backend.core.rag.vectordb import delete_document_from_vectordb
    for file in folder_path.iterdir():
        if file.is_file():
            try:
                delete_document_from_vectordb(file.name)
                file.unlink()
            except Exception:
                pass
    folder_path.rmdir()
    return {"message": f"Folder '{clean_name}' deleted successfully."}


async def save_document(file: UploadFile, folder: str = DEFAULT_FOLDER):
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail=f"Unsupported file format '{extension}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    clean_folder = sanitize_folder_name(folder)
    folder_dir = STORAGE_DIR / clean_folder
    folder_dir.mkdir(parents=True, exist_ok=True)

    path = folder_dir / file.filename

    with open(path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # Process vector embedding in background thread to prevent blocking event loop for large files
    try:
        response = await asyncio.to_thread(save_document_to_vectordb, str(path), clean_folder)
    except Exception as err:
        print(f"[RAG Indexing Warning] Error embedding {file.filename}: {err}")
        response = f"Saved file, vector indexing deferred: {err}"

    return path, clean_folder
