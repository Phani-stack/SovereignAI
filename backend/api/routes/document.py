from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse

from backend.core.services.document_service import (
    save_document, list_folders, create_folder, delete_folder,
    STORAGE_DIR, DEFAULT_FOLDER, sanitize_folder_name
)
from backend.core.rag.vectordb import delete_document_from_vectordb
from backend.api.schemas.document import (
    DocumentResponse, SearchRequest, SearchResponse, SearchResultItem,
    FolderListResponse, FolderItem, CreateFolderRequest
)
from backend.core.rag.embedding import embedding_chunk
from backend.infrastructure.qdrant.search import search as qdrant_search
from backend.api.routes.auth import get_current_user_from_header
from backend.core.services.auth_service import can_access_folder, can_access_document, has_ability


router = APIRouter(prefix="/documents", tags=["Documents"])

OUTPUT_DIR = Path("./data/outputs")


@router.get("/folders", response_model=FolderListResponse)
async def get_folders(current_user: dict = Depends(get_current_user_from_header)):
    folders_data = list_folders()
    # Filter folders based on current user's allowed_folders
    allowed_items = [
        FolderItem(**f) for f in folders_data 
        if can_access_folder(current_user, f["name"])
    ]
    return FolderListResponse(folders=allowed_items)


@router.post("/folders", response_model=FolderItem)
async def add_folder(
    req: CreateFolderRequest,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Folder name cannot be empty.")
    
    clean_name = sanitize_folder_name(req.name)
    if not can_access_folder(current_user, clean_name):
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: You do not have permission to access or create folder '{clean_name}'."
        )

    created = create_folder(req.name)
    return FolderItem(**created)


@router.delete("/folders/{folder_name}")
async def remove_folder(
    folder_name: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not can_access_folder(current_user, folder_name):
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: You do not have permission to delete folder '{folder_name}'."
        )
    return delete_folder(folder_name)


@router.get("/")
async def list_documents(
    folder: Optional[str] = None,
    current_user: dict = Depends(get_current_user_from_header)
):
    docs = []
    seen = set()
    target_folder = sanitize_folder_name(folder) if folder else None

    # Check if target folder is specified and user has access to it
    if target_folder and not can_access_folder(current_user, target_folder):
        return {"documents": []}

    # Scan STORAGE_DIR (uploaded documents)
    if STORAGE_DIR.exists():
        for item in STORAGE_DIR.rglob("*"):
            if item.is_file():
                rel = item.relative_to(STORAGE_DIR)
                file_folder = rel.parts[0] if len(rel.parts) > 1 else DEFAULT_FOLDER
                
                # Check user access to file_folder and filename
                if not can_access_folder(current_user, file_folder):
                    continue
                if not can_access_document(current_user, item.name):
                    continue

                if target_folder and file_folder.lower() != target_folder.lower():
                    continue

                if item.name not in seen:
                    seen.add(item.name)
                    stat = item.stat()
                    docs.append({
                        "filename": item.name,
                        "location": str(item.resolve()),
                        "size": stat.st_size,
                        "uploaded_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "status": "Indexed",
                        "category": "uploaded",
                        "folder": file_folder
                    })

    # Scan OUTPUT_DIR (AI generated documents)
    if not target_folder or target_folder.lower() == DEFAULT_FOLDER.lower():
        if can_access_folder(current_user, DEFAULT_FOLDER):
            if OUTPUT_DIR.exists():
                for item in OUTPUT_DIR.iterdir():
                    if item.is_file() and item.name not in seen:
                        if not can_access_document(current_user, item.name):
                            continue
                        seen.add(item.name)
                        stat = item.stat()
                        docs.append({
                            "filename": item.name,
                            "location": str(item.resolve()),
                            "size": stat.st_size,
                            "uploaded_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                            "status": "AI Generated",
                            "category": "generated",
                            "folder": DEFAULT_FOLDER
                        })

    return {"documents": docs}


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    folder: Optional[str] = Form(DEFAULT_FOLDER),
    current_user: dict = Depends(get_current_user_from_header)
):
    if not has_ability(current_user, "can_upload_documents"):
        raise HTTPException(status_code=403, detail="Permission 'can_upload_documents' required.")

    target_folder = folder if folder and folder.strip() else DEFAULT_FOLDER
    clean_target = sanitize_folder_name(target_folder)

    if not can_access_folder(current_user, clean_target):
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: You do not have permission to upload documents to folder '{clean_target}'."
        )

    file_path, saved_folder = await save_document(file, folder=target_folder)
    return {
        "filename": file.filename,
        "location": str(file_path),
        "message": f"Document uploaded successfully to folder '{saved_folder}'",
        "folder": saved_folder
    }


@router.delete("/{filename:path}")
async def delete_document(
    filename: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not has_ability(current_user, "can_delete_documents"):
        raise HTTPException(status_code=403, detail="Permission 'can_delete_documents' required.")

    file_basename = Path(filename).name
    deleted = False
    
    # Check directly under STORAGE_DIR, subdirectories of STORAGE_DIR, and OUTPUT_DIR
    if STORAGE_DIR.exists():
        for target in STORAGE_DIR.rglob(file_basename):
            if target.is_file():
                rel = target.relative_to(STORAGE_DIR)
                file_folder = rel.parts[0] if len(rel.parts) > 1 else DEFAULT_FOLDER
                if not can_access_folder(current_user, file_folder):
                    raise HTTPException(status_code=403, detail=f"Access denied to folder '{file_folder}'.")
                try:
                    target.unlink()
                    deleted = True
                except Exception:
                    pass

    if OUTPUT_DIR.exists():
        target = OUTPUT_DIR / file_basename
        if target.exists() and target.is_file():
            if not can_access_folder(current_user, DEFAULT_FOLDER):
                raise HTTPException(status_code=403, detail="Access denied to Default folder.")
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
async def download_document(
    filename: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    file_basename = Path(filename).name
    candidates = []
    
    if STORAGE_DIR.exists():
        for p in STORAGE_DIR.rglob(file_basename):
            if p.is_file():
                candidates.append(p)
    
    if OUTPUT_DIR.exists():
        candidates.append(OUTPUT_DIR / file_basename)
    candidates.append(Path(filename))

    for target in candidates:
        if target.exists() and target.is_file():
            file_folder = DEFAULT_FOLDER
            if STORAGE_DIR in target.parents:
                try:
                    rel = target.relative_to(STORAGE_DIR)
                    if len(rel.parts) > 1:
                        file_folder = rel.parts[0]
                except Exception:
                    pass

            if not can_access_folder(current_user, file_folder) or not can_access_document(current_user, target.name, file_folder):
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied: You do not have permission to access or download document '{target.name}'."
                )

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


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    req: SearchRequest,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not has_ability(current_user, "can_search_rag"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission ('can_search_rag') to search the knowledge base."
        )

    query = (req.query or "").strip()
    limit = req.limit or 10
    target_folder = req.folder.strip().lower() if req.folder and req.folder.strip() else None

    if not query:
        return SearchResponse(query=query, results=[], count=0)

    results = []
    seen_snippets = set()

    # 1. Perform vector database search
    try:
        query_vector = embedding_chunk(query)
        points = qdrant_search(query_vector, limit=limit * 3)

        for idx, pt in enumerate(points):
            payload = getattr(pt, "payload", {}) or {}
            text = payload.get("text", "").strip()
            filename = payload.get("filename", "Knowledge Base Document")
            pt_folder = payload.get("folder", DEFAULT_FOLDER)
            score = getattr(pt, "score", None)

            # Check folder and document level permissions
            if not can_access_folder(current_user, pt_folder):
                continue
            if not can_access_document(current_user, filename):
                continue

            if target_folder and pt_folder.lower() != target_folder:
                continue

            if text and text not in seen_snippets:
                seen_snippets.add(text)
                first_line = text.split("\n")[0] if "\n" in text else text[:60]
                title = first_line[:57] + "..." if len(first_line) > 60 else first_line

                results.append(SearchResultItem(
                    id=str(getattr(pt, "id", idx + 1)),
                    title=title,
                    snippet=text[:300] + ("..." if len(text) > 300 else ""),
                    source=filename,
                    folder=pt_folder,
                    score=round(float(score), 4) if score is not None else None,
                    page=payload.get("page", f"Page {idx + 1}")
                ))
                if len(results) >= limit:
                    break
    except Exception as e:
        print(f"Vector search warning: {e}")

    # 2. Supplementary keyword search in local document storage if vector results are empty
    if not results:
        query_lower = query.lower()
        query_words = [w for w in query_lower.split() if len(w) > 2]

        for dir_path in [STORAGE_DIR, OUTPUT_DIR]:
            if not dir_path.exists():
                continue
            for file_path in dir_path.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in [".txt", ".md", ".json", ".csv", ".pdf", ".docx"]:
                    rel = file_path.relative_to(dir_path) if dir_path == STORAGE_DIR and len(file_path.relative_to(dir_path).parts) > 1 else None
                    file_folder = rel.parts[0] if rel else DEFAULT_FOLDER

                    if target_folder and file_folder.lower() != target_folder:
                        continue

                    try:
                        content = ""
                        if file_path.suffix.lower() in [".txt", ".md", ".json", ".csv"]:
                            content = file_path.read_text(encoding="utf-8", errors="ignore")
                        
                        is_match = query_lower in file_path.name.lower() or (content and (query_lower in content.lower() or any(w in content.lower() for w in query_words)))
                        
                        if is_match:
                            lines = [line.strip() for line in content.splitlines() if line.strip()] if content else []
                            matched_lines = [l for l in lines if query_lower in l.lower() or any(w in l.lower() for w in query_words)]
                            snippet = " ".join(matched_lines[:3]) if matched_lines else (" ".join(lines[:3]) if lines else f"Match found in document {file_path.name}")
                            
                            if snippet and snippet not in seen_snippets:
                                seen_snippets.add(snippet)
                                results.append(SearchResultItem(
                                    id=f"file-{len(results)+1}",
                                    title=file_path.stem.replace("_", " ").title(),
                                    snippet=snippet[:300] + ("..." if len(snippet) > 300 else ""),
                                    source=file_path.name,
                                    folder=file_folder,
                                    score=0.80,
                                    page="Indexed Document"
                                ))
                    except Exception:
                        pass



    return SearchResponse(query=query, results=results, count=len(results))

