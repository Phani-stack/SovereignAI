from langchain_community.document_loaders import CSVLoader


def load_csv(path):
    loader = CSVLoader(path)
    return loader.load()
