import base64
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import UploadFile, HTTPException
from langchain_core.messages import HumanMessage

from backend.config import get_settings

logger = logging.getLogger(__name__)

IMAGE_STORAGE_DIR = Path("storage/images")
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}


def ensure_image_storage_dir() -> Path:
    IMAGE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return IMAGE_STORAGE_DIR


async def save_image(file: UploadFile) -> Dict[str, Any]:
    ensure_image_storage_dir()
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image extension '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    target_path = IMAGE_STORAGE_DIR / file.filename
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    return {
        "filename": file.filename,
        "location": str(target_path),
        "url": f"/vision/images/{file.filename}",
        "message": "Image saved successfully"
    }


def list_images() -> List[Dict[str, Any]]:
    ensure_image_storage_dir()
    images = []
    for file_path in IMAGE_STORAGE_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS:
            stat = file_path.stat()
            images.append({
                "filename": file_path.name,
                "url": f"/vision/images/{file_path.name}",
                "location": str(file_path),
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            })
    # Sort newest first
    images.sort(key=lambda x: x["created_at"], reverse=True)
    return images


def get_image_path(filename: str) -> Optional[Path]:
    target_path = IMAGE_STORAGE_DIR / filename
    if target_path.exists() and target_path.is_file():
        return target_path
    return None


def encode_image_to_b64(image_path: Path) -> str:
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")


def extract_text_from_image(image_path: Path) -> Dict[str, Any]:
    text_content = ""
    metadata = {}
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            metadata["format"] = img.format
            metadata["size"] = img.size
            metadata["mode"] = img.mode

            try:
                import pytesseract
                text_content = pytesseract.image_to_string(img).strip()
            except Exception as ocr_err:
                logger.warning(f"pytesseract OCR engine unavailable/failed: {ocr_err}")

    except Exception as img_err:
        logger.warning(f"PIL image inspection failed: {img_err}")

    return {
        "text": text_content,
        "metadata": metadata
    }


def extract_document_text(document_path: Path) -> str:
    try:
        from backend.core.rag.embedding import text_content_from_document
        return text_content_from_document(document_path)
    except Exception as err:
        logger.warning(f"Document text extraction failed: {err}")
        return ""


def analyze_image_with_vision(
    query: str,
    image_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
    document_text: Optional[str] = None,
    document_name: Optional[str] = None,
    model_override: Optional[str] = None,
    selected_docs: Optional[List[str]] = None
) -> str:
    settings = get_settings()
    if not model_override or model_override.lower() == "auto":
        vision_model_name = settings["vision_model"]
    else:
        vision_model_name = model_override

    # 1. Base64 encoding
    base64_img = ""
    mime_type = "image/jpeg"

    if image_bytes:
        base64_img = base64.b64encode(image_bytes).decode("utf-8")
    elif image_path:
        p = Path(image_path)
        if not p.is_absolute():
            p = IMAGE_STORAGE_DIR / p.name
        if p.exists():
            ext = p.suffix.lower().lstrip(".")
            mime_type = f"image/{'png' if ext == 'png' else 'webp' if ext == 'webp' else 'jpeg'}"
            base64_img = encode_image_to_b64(p)

    # 2. RAG Context Synthesis if requested
    context = None
    if selected_docs:
        try:
            from backend.core.rag.retrive import get_context
            context = get_context(query, selected_docs=selected_docs)
        except Exception as r_err:
            logger.warning(f"RAG retrieval warning for vision query: {r_err}")

    # 3. Build Prompt with Context & Query
    prompt_text = "Analyze the attached file and answer the request accurately and directly.\n\n"
    if document_text:
        prompt_text += f"Attached document ({document_name or 'file'}) content:\n{document_text}\n\n"
    if context:
        prompt_text += f"Knowledge Base Context:\n{context}\n\n"
        prompt_text += "Instructions: Use the Knowledge Base Context if relevant. If the query asks for general knowledge not in the context, answer directly using your general knowledge.\n\n"

    prompt_text += f"User Request: {query}\n"

    if any(k in query.lower() for k in ["code", "python", "script", "program", "function", "fix"]):
        prompt_text += "\nIf the user asks for code, provide executable, clean code blocks with clear explanations."

    # 4. Invoke LLM Vision model
    try:
        from langchain_ollama import ChatOllama
        llm = ChatOllama(
            model=vision_model_name,
            base_url=settings["ollama_base_url"],
            temperature=settings["temperature"],
            num_ctx=settings["num_ctx"],
            num_predict=settings["num_predict"],
        )

        content_payload = [{"type": "text", "text": prompt_text}]
        if base64_img:
            content_payload.append({
                "type": "image_url",
                "image_url": f"data:{mime_type};base64,{base64_img}"
            })

        message = HumanMessage(content=content_payload)
        response = llm.invoke([message])
        full_text = response.content

        # Handle document tool generation if document requested in query
        msg_lower = query.lower()
        if any(k in msg_lower for k in ["ppt", "pptx", "presentation", "docx", "pdf", "xlsx", "excel"]):
            try:
                from backend.core.agent.nodes import extract_document_title
                from backend.core.tools.registry import get_tool

                output_tool = None
                doc_file = "generated_analysis_report"
                if "ppt" in msg_lower or "presentation" in msg_lower:
                    output_tool = "create_pptx"
                    doc_file += ".pptx"
                elif "docx" in msg_lower or "document" in msg_lower:
                    output_tool = "create_docx"
                    doc_file += ".docx"
                elif "pdf" in msg_lower:
                    output_tool = "create_pdf"
                    doc_file += ".pdf"
                elif "xlsx" in msg_lower or "excel" in msg_lower:
                    output_tool = "create_xlsx"
                    doc_file += ".xlsx"

                if output_tool:
                    tool = get_tool(output_tool)
                    title, content = extract_document_title(full_text)
                    doc_res = tool.invoke({"title": title, "content": content, "filename": doc_file})
                    full_text += f"\n\n{doc_res}"
            except Exception as t_err:
                logger.error(f"Failed to generate document for vision query: {t_err}")

        return full_text

    except Exception as err:
        err_str = str(err)
        logger.warning(f"Vision model LLM fallback due to error: {err_str}")

        # If LLM model is text-only (e.g. qwen2.5) or Ollama multimodal fails, use OCR text extraction
        ocr_result = {"text": "", "metadata": {}}
        if image_path:
            p = Path(image_path)
            if not p.is_absolute():
                p = IMAGE_STORAGE_DIR / p.name
            if p.exists():
                ocr_result = extract_text_from_image(p)

        extracted_text = ocr_result.get("text", "")
        img_meta = ocr_result.get("metadata", {})

        try:
            from backend.infrastructure.models.model_manager import get_model
            text_llm = get_model("general")

            text_prompt = f"User Request: {query}\n\n"
            if context:
                text_prompt += f"Knowledge Base Context:\n{context}\n\n"

            text_prompt += f"Image File: {Path(image_path).name if image_path else 'uploaded_image'}\n"
            if img_meta:
                text_prompt += f"Image Dimensions: {img_meta.get('size')}, Format: {img_meta.get('format')}\n"

            if extracted_text:
                text_prompt += f"\nExtracted Text Content from Image (OCR):\n\"\"\"\n{extracted_text}\n\"\"\"\n\n"
                text_prompt += "Analyze the extracted content above and thoroughly answer the user's request."
            else:
                text_prompt += "\nThe image was saved locally. Answer the user query clearly and accurately."

            resp = text_llm.invoke(text_prompt)
            full_text = resp.content
            if extracted_text and "extracted" not in full_text.lower():
                full_text = f"**SOVAI Vision Assistant**\n\n**Extracted Image Content (OCR):**\n```text\n{extracted_text}\n```\n\n" + full_text
            elif not full_text.startswith("**SOVAI Vision Assistant"):
                full_text = f"**SOVAI Vision Assistant**\n\n" + full_text
            return full_text
        except Exception as fallback_err:
            logger.error(f"OCR LLM text-only fallback failed: {fallback_err}")
            if extracted_text:
                return f"**Extracted Content from Image (OCR):**\n```text\n{extracted_text}\n```"

            ctx_str = f"\n• Context attached: {', '.join(selected_docs)}" if selected_docs else ""
            img_str = f" [Image attached]" if base64_img else ""
            return (
                f"**SOVAI Vision Assistant**{img_str}\n\n"
                f"Processed vision query: *\"{query}\"*{ctx_str}\n\n"
                f"*(Note: Ollama vision model ({vision_model_name}) is offline or initializing. "
                f"Image was saved successfully.)*"
            )
