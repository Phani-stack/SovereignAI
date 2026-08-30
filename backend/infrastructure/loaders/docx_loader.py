from langchain_community.document_loaders import Docx2txtLoader


def load_docx(path):
    loader = Docx2txtLoader(path)
    return loader.load()
