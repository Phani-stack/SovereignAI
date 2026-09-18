from .file_tools import (
    read_file,
    write_file,
    list_files,
)

from .knowledge_tool import (
    search_knowledge_base,
)

from .document_tools import (
    create_docx,
    create_pdf,
    create_pptx,
    create_xlsx,
)


TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "list_files": list_files,
    "search_knowledge_base": search_knowledge_base,
    "create_docx": create_docx,
    "create_pdf": create_pdf,
    "create_pptx": create_pptx,
    "create_xlsx": create_xlsx,
}


def get_tools():
    return list(TOOLS.values())


def get_tool(name: str):

    if name not in TOOLS:
        raise ValueError(f"Unknown tool: {name}")

    return TOOLS[name]
