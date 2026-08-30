from .pdf_loader import load_pdf
from .docx_loader import load_docx
from .text_loader import load_text
from .csv_loader import load_csv


def load_document(path):

    if path.endswith(".pdf"):
        return load_pdf(path)

    elif path.endswith(".docx"):
        return load_docx(path)

    elif path.endswith(".txt"):
        return load_text(path)

    elif path.endswith(".csv"):
        return load_csv(path)

    else:
        raise ValueError("Unsupported file type")
