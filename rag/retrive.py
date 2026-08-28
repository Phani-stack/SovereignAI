from qdrant.search import search
from .embedding import *
from models.general_model import model

def get_context(query):
    vector = embedding_chunk(query)
    results = search(vector)

    text = ""

    for result in results:
        text += result.payload["text"] + "\n"

    return text

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
