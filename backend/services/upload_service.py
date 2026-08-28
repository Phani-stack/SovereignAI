from rag import vectordb

def upload_document(path):
    response = vectordb.save_document_to_vectordb(path)
    return response

