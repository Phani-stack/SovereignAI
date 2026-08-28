from rag import retrive

def rag(query):
    model_response = retrive.query(query=query)
    return model_response
