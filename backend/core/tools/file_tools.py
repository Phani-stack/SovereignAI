from pathlib import Path

from langchain_core.tools import tool


BASE_DIR = Path("./data").resolve()


def safe_path(path: str) -> Path:

    target = (BASE_DIR / path).resolve()

    if not str(target).startswith(str(BASE_DIR)):
        raise ValueError("Access outside approved directory is not allowed")

    return target


@tool
def list_files(path: str = ".") -> str:
    """List files inside the approved data directory."""

    try:
        directory = safe_path(path)

        if not directory.exists():
            return "Directory does not exist."

        return "\n".join(
            str(item.relative_to(BASE_DIR)) for item in directory.iterdir()
        )

    except Exception as e:
        return f"Error: {e}"


@tool
def read_file(path: str) -> str:
    """Read a text file from the approved data directory."""

    try:
        file_path = safe_path(path)

        if not file_path.is_file():
            return "File does not exist."

        return file_path.read_text(encoding="utf-8")

    except Exception as e:
        return f"Error: {e}"


@tool
def write_file(path: str, content: str) -> str:
    """Write a text file inside the approved data directory."""

    try:
        file_path = safe_path(path)

        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_text(content, encoding="utf-8")

        return f"File written successfully: {file_path.relative_to(BASE_DIR)}"

    except Exception as e:
        return f"Error: {e}"
