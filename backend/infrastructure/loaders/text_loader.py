from langchain_community.document_loaders import TextLoader


def load_text(path):
    loader = TextLoader(path)
    return loader.load()
