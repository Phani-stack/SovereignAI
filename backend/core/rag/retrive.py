import logging
from backend.infrastructure.qdrant.search import search
from .embedding import embedding_chunk
from backend.infrastructure.models.general_model import model

logger = logging.getLogger(__name__)


def get_context(query_str, selected_docs=None, limit=10):
    try:
        vector = embedding_chunk(query_str)
        results = search(vector, limit=limit)

        text_chunks = []
        for result in results:
            if hasattr(result, "payload") and result.payload and "text" in result.payload:
                fname = result.payload.get("filename", "")
                if selected_docs and len(selected_docs) > 0 and fname and fname not in selected_docs:
                    continue
                content = result.payload["text"].strip()
                if content:
                    header = f"[Source: {fname}]" if fname else "[Document Context]"
                    text_chunks.append(f"{header}\n{content}")

        return "\n\n".join(text_chunks).strip()
    except Exception as e:
        logger.warning(f"RAG get_context search error: {e}")
        return ""



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
