from backend.core.agent.state import AgentState

from backend.core.agent.router import ModelRouter
from backend.infrastructure.models.model_manager import get_model

from backend.core.rag.retrive import query as retrieve_context

from backend.core.tools.registry import get_tool


router = ModelRouter()


def route_node(state: AgentState):

    print("\n[AGENT] Routing...")

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
        prompt = f"""
You are a private local AI assistant.

User request:
{state.query}

Answer the request directly.

If the request is for a file, generate the
complete content that should go inside it.

Do not output function calls.
Do not pretend that you created a file.
"""

    response = model.invoke(prompt)

    print("[AGENT] Content generated")

    return {"response": response.content}


def document_node(state: AgentState):

    print("[AGENT] Creating:", state.output_type)

    content = state.response

    if state.output_type == "docx":
        tool = get_tool("create_docx")

        result = tool.invoke(
            {
                "title": "DrafticBob",
                "content": content,
                "filename": "generated_document.docx",
            }
        )

    elif state.output_type == "pdf":
        tool = get_tool("create_pdf")

        result = tool.invoke(
            {
                "title": "DrafticBob",
                "content": content,
                "filename": "generated_document.pdf",
            }
        )

    elif state.output_type == "pptx":
        tool = get_tool("create_pptx")

        result = tool.invoke(
            {
                "title": "DrafticBob",
                "content": content,
                "filename": "generated_presentation.pptx",
            }
        )

    elif state.output_type == "xlsx":
        tool = get_tool("create_xlsx")

        result = tool.invoke(
            {
                "title": "DrafticBob",
                "content": content,
                "filename": "generated_report.xlsx",
            }
        )

    else:
        return {"response": content}

    print("[AGENT] File created")

    return {"response": str(result)}


def final_node(state: AgentState):

    return {"response": state.response}
