from pathlib import Path
from .pdf_loader import load_pdf
from .docx_loader import load_docx
from .text_loader import load_text
from .csv_loader import load_csv


def load_document(path):
    path_obj = Path(str(path))
    ext = path_obj.suffix.lower()

    if ext == ".pdf":
        return load_pdf(str(path_obj))

    elif ext in [".docx", ".doc"]:
        return load_docx(str(path_obj))

    elif ext in [".txt", ".md", ".rtf", ".log", ".json", ".py", ".js"]:
        return load_text(str(path_obj))

    elif ext in [".csv", ".tsv"]:
        return load_csv(str(path_obj))

    else:
        # Fallback to text loader for any unhandled text-based document
        try:
            return load_text(str(path_obj))
        except Exception:
            raise ValueError(f"Unsupported file type: {ext}")

