import logging
from backend.infrastructure.qdrant.search import search
from backend.core.rag.embedding import embedding_chunk
from backend.infrastructure.models.general_model import model
from backend.core.services.auth_service import can_access_folder, can_access_document

logger = logging.getLogger(__name__)


def get_context(query_str, selected_docs=None, limit=10, user=None):
    if not query_str or not query_str.strip():
        return ""

    q_clean = query_str.strip().lower()
    conversational_patterns = [
        "who are you", "what is your name", "who made you", "who created you",
        "hello", "hi", "hey", "good morning", "good evening", "how are you", "what can you do"
    ]
    if any(p in q_clean for p in conversational_patterns):
        return ""

    text_chunks = []
    seen_texts = set()

    # User document restriction check
    user_allowed_docs = None
    if user and isinstance(user, dict):
        allowed = user.get("allowed_documents", [])
        if allowed:  # Non-empty list means restricted document access
            user_allowed_docs = set(allowed)

    # 1. Vector Search via Qdrant
    try:
        vector = embedding_chunk(query_str)
        results = search(vector, limit=limit, score_threshold=0.35)

        for result in results:
            if hasattr(result, "payload") and result.payload and "text" in result.payload:
                fname = result.payload.get("filename", "")
                ffolder = result.payload.get("folder", "Default")

                if user and isinstance(user, dict):
                    if not can_access_folder(user, ffolder):
                        continue
                    if not can_access_document(user, fname):
                        continue

                if selected_docs and len(selected_docs) > 0 and fname and fname not in selected_docs:
                    continue
                if user_allowed_docs is not None and fname and fname not in user_allowed_docs:
                    continue
                score = getattr(result, "score", 1.0)
                if score is not None and score < 0.35:
                    continue
                content = result.payload["text"].strip()
                if content and content not in seen_texts:
                    seen_texts.add(content)
                    header = f"[Source: {fname}]" if fname else "[Document Context]"
                    text_chunks.append(f"{header}\n{content}")

    except Exception as e:
        logger.warning(f"RAG get_context vector search warning: {e}")


    # 2. Storage Fallback Search if vector database returned no chunks
    if not text_chunks:
        try:
            from pathlib import Path
            from backend.core.services.document_service import STORAGE_DIR
            q_lower = query_str.lower()
            q_words = [w for w in q_lower.split() if len(w) > 2]

            if STORAGE_DIR.exists():
                for file_path in STORAGE_DIR.iterdir():
                    if not file_path.is_file():
                        continue
                    if selected_docs and len(selected_docs) > 0 and file_path.name not in selected_docs:
                        continue

                    try:
                        content = ""
                        if file_path.suffix.lower() in [".txt", ".md", ".json", ".csv", ".log"]:
                            content = file_path.read_text(encoding="utf-8", errors="ignore")
                        elif file_path.suffix.lower() in [".pdf", ".docx", ".doc"]:
                            from backend.core.rag.embedding import text_content_from_document
                            content = text_content_from_document(str(file_path))

                        if content:
                            lines = [line.strip() for line in content.splitlines() if line.strip()]
                            matched = [l for l in lines if q_lower in l.lower() or any(w in l.lower() for w in q_words)]
                            if matched:
                                matched_text = " ".join(matched[:5])
                                if matched_text and matched_text not in seen_texts:
                                    seen_texts.add(matched_text)
                                    text_chunks.append(f"[Source: {file_path.name}]\n{matched_text[:1000]}")
                    except Exception as f_err:
                        logger.debug(f"Document fallback read error for {file_path.name}: {f_err}")
        except Exception as fb_err:
            logger.warning(f"RAG storage fallback error: {fb_err}")


    return "\n\n".join(text_chunks).strip()




def generate(query, context):
    prompt = f"""
                Answer the question using the context below.
                Context: {context}
                Question: {query}
            """

    resposne = model.invoke(prompt).content
    return resposne


def query(query):
    context = get_context(query)
    model_response = generate(query, context)
    return model_response
