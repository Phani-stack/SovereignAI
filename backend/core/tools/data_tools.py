from pathlib import Path

import pandas as pd

from langchain_core.tools import tool


BASE_DIR = Path("./data").resolve()


def safe_path(path: str) -> Path:

    target = (BASE_DIR / path).resolve()

    if not str(target).startswith(str(BASE_DIR)):
        raise ValueError("Access outside approved directory is not allowed")

    return target


@tool
def read_csv(path: str) -> str:
    """Read and preview a CSV file."""

    try:
        file_path = safe_path(path)

        df = pd.read_csv(file_path)

        return df.head(20).to_string(index=False)

    except Exception as e:
        return f"CSV error: {e}"


@tool
def read_excel(path: str) -> str:
    """Read and preview an Excel file."""

    try:
        file_path = safe_path(path)

        sheets = pd.read_excel(file_path, sheet_name=None)

        output = []

        for sheet_name, df in sheets.items():
            output.append(f"--- {sheet_name} ---")

            output.append(df.head(20).to_string(index=False))

        return "\n\n".join(output)

    except Exception as e:
        return f"Excel error: {e}"


@tool
def excel_summary(path: str) -> str:
    """Generate a basic summary of an Excel file."""

    try:
        file_path = safe_path(path)

        sheets = pd.read_excel(file_path, sheet_name=None)

        output = []

        for name, df in sheets.items():
            output.append(f"Sheet: {name}")

            output.append(f"Rows: {len(df)}")

            output.append(f"Columns: {list(df.columns)}")

        return "\n".join(output)

    except Exception as e:
        return f"Excel error: {e}"
