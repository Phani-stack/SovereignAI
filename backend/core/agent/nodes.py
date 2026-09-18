from backend.core.agent.state import AgentState

from backend.core.agent.router import ModelRouter
from backend.infrastructure.models.model_manager import get_model

from backend.core.rag.retrive import query as retrieve_context

from backend.core.tools.registry import get_tool
from backend.core.agent.prompts import ENGINEERING_RESPONSE_GUIDE


router = ModelRouter()


def route_node(state: AgentState):

    print("\n[AGENT] Routing...")

    requested_model = (state.model or "").strip().lower()
    if requested_model and requested_model != "auto":
        model_aliases = {
            "qwen3": "general", "general": "general", "chat": "general",
            "coder": "coding", "coding": "coding",
            "vision": "vision",
            "engineering": "engineering", "engineer": "engineering",
            "math": "engineering", "maths": "engineering",
            "calc": "engineering", "cal": "engineering",
            "qwen3:4b": "engineering",
        }
        decision = router.route(state.query)
        decision.model = model_aliases.get(requested_model, requested_model)
    else:
        decision = router.route(state.query)

    print(
        "[AGENT] Route:",
        decision.model,
        "| RAG:",
        decision.needs_rag,
        "| Tools:",
        decision.needs_tools,
        "| Output:",
        decision.output_type,
    )

    return {
        "model": decision.model,
        "needs_rag": decision.needs_rag,
        "needs_tools": decision.needs_tools,
        "output_type": decision.output_type,
    }


def rag_node(state: AgentState):

    print("[AGENT] Searching local knowledge base...")

    context = retrieve_context(state.query)

    print("[AGENT] RAG complete")

    return {"context": str(context)}


def llm_node(state: AgentState):

    print("[AGENT] Generating content with:", state.model)

    model = get_model(state.model)

    if state.context:
        prompt = f"""
You are a private local AI assistant.

Answer the user's request using the local
knowledge-base context below.

Context:
{state.context}

User request:
{state.query}

If the user asks to create a document,
presentation, PDF, Excel file, or other file,
generate the complete content that should go
inside that file.

Do not talk about calling tools.
Do not output function calls.
Just generate the actual content.
"""
    else:
        prompt = state.query

    if state.model == "engineering":
        prompt = ENGINEERING_RESPONSE_GUIDE + "\n\nUser problem:\n" + prompt + "\n\n/no_think"


    if state.output_type == "pptx" or any(k in state.query.lower() for k in ["slide", "ppt", "presentation"]):
        presentation_instr = """
IMPORTANT PRESENTATION INSTRUCTIONS:
The user is requesting a multi-slide presentation. You MUST format your response into separate, fully developed slides using Markdown headers for EACH slide:
# Slide 1: Executive Title & Overview
- Detailed bullet point 1...
- Detailed bullet point 2...
- Detailed bullet point 3...

# Slide 2: Key Background & Context
- Detailed bullet point 1...
- Detailed bullet point 2...
- Detailed bullet point 3...

# Slide 3: Core Features & Architecture
- Detailed bullet point 1...
- Detailed bullet point 2...
- Detailed bullet point 3...

# Slide 4: Strategic Benefits & Analysis
- Detailed bullet point 1...
- Detailed bullet point 2...
- Detailed bullet point 3...

# Slide 5: Summary & Recommendations
- Detailed bullet point 1...
- Detailed bullet point 2...
- Detailed bullet point 3...

Make sure you write out all slides explicitly (if user asks for N slides, output N numbered slide sections with 3-5 rich, detailed bullet points per slide).
"""
        prompt += "\n" + presentation_instr

    response = model.invoke(prompt)

    print("[AGENT] Content generated")

    return {"response": response.content}


def extract_document_title(content: str) -> tuple[str, str]:
    if not content:
        return "Generated Document", ""

    lines = content.splitlines()
    extracted_title = None
    remaining_lines = []

    for line in lines:
        stripped = line.strip()
        if not extracted_title and stripped.startswith("#"):
            extracted_title = stripped.lstrip("#").strip()
            continue
        elif not extracted_title and stripped:
            extracted_title = stripped[:60]
        remaining_lines.append(line)

    title = extracted_title if extracted_title else "Generated Document"
    cleaned_content = "\n".join(remaining_lines).strip()
    if not cleaned_content:
        cleaned_content = content.strip()

    return title, cleaned_content


def document_node(state: AgentState):

    print("[AGENT] Creating:", state.output_type)

    raw_content = state.response
    title, content = extract_document_title(raw_content)

    if state.output_type == "docx":
        tool = get_tool("create_docx")

        result = tool.invoke(
            {
                "title": title,
                "content": content,
                "filename": "generated_document.docx",
            }
        )

    elif state.output_type == "pdf":
        tool = get_tool("create_pdf")

        result = tool.invoke(
            {
                "title": title,
                "content": content,
                "filename": "generated_document.pdf",
            }
        )

    elif state.output_type == "pptx":
        tool = get_tool("create_pptx")

        result = tool.invoke(
            {
                "title": title,
                "content": content,
                "filename": "generated_presentation.pptx",
            }
        )

    elif state.output_type == "xlsx":
        tool = get_tool("create_xlsx")

        result = tool.invoke(
            {
                "title": title,
                "content": content,
                "filename": "generated_report.xlsx",
            }
        )

    else:
        return {"response": raw_content}

    print("[AGENT] File created with title:", title)

    return {"response": str(result)}


def final_node(state: AgentState):

    return {"response": state.response}
