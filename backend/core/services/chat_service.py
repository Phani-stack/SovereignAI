from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

ENGINEERING_RESPONSE_MARKER = "FINAL_RESPONSE_START"


def _engineering_retry_prompt(problem: str) -> str:
    """Build a strict recovery prompt when a model leaks scratch-work."""
    return f"""/no_think
Answer the engineering problem below with only the polished final response.
Do not narrate your thought process, reconsider calculations aloud, or use phrases such as
"wait", "let me", or "I need to". Use concise Markdown. Begin with **Answer:**, include a
compact **Given:** section, then use a numbered `###` heading for each requested quantity.
Show its formula, one numerical substitution, and a boxed result.
Write each equation only once; never output HTML entities or duplicate plain-text and LaTeX versions.

Your first line must be exactly:
{ENGINEERING_RESPONSE_MARKER}

Problem:
{problem}
"""


def _engineering_response_needs_retry(text: str) -> bool:
    """Detect missing boundaries and common scratch-work leaked by local models."""
    if not text or ENGINEERING_RESPONSE_MARKER not in text:
        return True
    answer = text.rsplit(ENGINEERING_RESPONSE_MARKER, 1)[1]
    scratch_patterns = (
        r"\bwait\b",
        r"\blet me\b",
        r"\bi need to\b",
        r"\bmaybe better\b",
        r"\blet's (?:check|calculate|see)\b",
    )
    import re
    return any(re.search(pattern, answer, flags=re.IGNORECASE) for pattern in scratch_patterns)


def _clean_engineering_response(text: str) -> str:
    """Remove model planning and the private engineering response boundary."""
    if not text:
        return ""

    cleaned = text
    if ENGINEERING_RESPONSE_MARKER in cleaned:
        cleaned = cleaned.rsplit(ENGINEERING_RESPONSE_MARKER, 1)[1]

    # Some older Ollama/Qwen templates ignore think=False and emit tagged
    # reasoning in content. Never expose that material in the final answer.
    import re
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("<think>", "").replace("</think>", "")

    # Fallback for older Qwen templates that narrate their plan without tags
    # and fail to emit the boundary. Retain the structured solution only.
    if ENGINEERING_RESPONSE_MARKER not in text:
        structured_starts = list(re.finditer(r"(?im)^\s*(?:#{1,3}\s*)?(?:\*\*)?Given(?:\*\*)?\s*:?[ \t]*$", cleaned))
        if structured_starts:
            cleaned = cleaned[structured_starts[-1].start():]
    return cleaned.strip()


def _handle_document_fallback(message: str) -> Optional[str]:
    msg_lower = message.lower()
    from backend.core.tools.registry import get_tool

    # Title extraction helper
    title = message.strip()
    for prefix in [
        "generate a ppt on ", "generate ppt on ", "create a ppt on ", "make a ppt on ",
        "generate a presentation on ", "create presentation on ", "generate a document on ",
        "create document on ", "generate a pdf on ", "make a pdf on "
    ]:
        if msg_lower.startswith(prefix):
            title = message[len(prefix):].strip().title()
            break
    if not title or title.lower() == message.lower():
        title = message.strip().title()

    if any(k in msg_lower for k in ["ppt", "pptx", "slide", "presentation"]):
        try:
            tool = get_tool("create_pptx")
            content = (
                f"# Slide 1: {title} - Executive Overview\n"
                f"- High-level introduction to {title}\n"
                f"- Key objectives, goals, and strategic context\n"
                f"- Primary scope and foundational principles\n\n"
                f"# Slide 2: Background & Core Concepts\n"
                f"- Background details and historical context of {title}\n"
                f"- Essential domain knowledge and key definitions\n"
                f"- Industry standards and operational framework\n\n"
                f"# Slide 3: Technical Features & Architecture\n"
                f"- Core components, modules, and workflows\n"
                f"- System interactions and integration points\n"
                f"- Key capabilities and performance metrics\n\n"
                f"# Slide 4: Strategic Benefits & Impact\n"
                f"- Primary operational and executive benefits\n"
                f"- Security, reliability, and scalability highlights\n"
                f"- Measurable outcomes and efficiency gains\n\n"
                f"# Slide 5: Summary & Recommendations\n"
                f"- Key takeaways and summary of findings\n"
                f"- Actionable recommendations for deployment\n"
                f"- Phased implementation roadmap and future outlook"
            )
            result = tool.invoke({"filename": "generated_presentation.pptx", "title": title, "content": content})
            return f"**SOVAI Executive Presentation Engine**\n\nGenerated PowerPoint presentation for: *\"{title}\"*\n\n{result}"
        except Exception as err:
            logger.error(f"Fallback PPT generation failed: {err}")

    elif any(k in msg_lower for k in ["docx", "word document", "doc"]):
        try:
            tool = get_tool("create_docx")
            content = (
                f"# {title}\n\n"
                f"## Executive Summary\n"
                f"Comprehensive overview and analysis of {title}.\n\n"
                f"## Core Analysis\n"
                f"- Operational framework and scope\n"
                f"- Performance and security guidelines\n\n"
                f"## Recommendations\n"
                f"- Strategic implementation steps"
            )
            result = tool.invoke({"filename": "generated_document.docx", "title": title, "content": content})
            return f"**SOVAI Executive Document Engine**\n\nGenerated Word document for: *\"{title}\"*\n\n{result}"
        except Exception as err:
            logger.error(f"Fallback DOCX generation failed: {err}")

    elif "pdf" in msg_lower:
        try:
            tool = get_tool("create_pdf")
            content = (
                f"# {title}\n\n"
                f"## Overview\n"
                f"Detailed PDF summary report for {title}.\n\n"
                f"## Core Findings\n"
                f"- Key specifications and architectural notes\n"
                f"- Verification status and operational standards"
            )
            result = tool.invoke({"filename": "generated_document.pdf", "title": title, "content": content})
            return f"**SOVAI Executive PDF Engine**\n\nGenerated PDF document for: *\"{title}\"*\n\n{result}"
        except Exception as err:
            logger.error(f"Fallback PDF generation failed: {err}")

    elif any(k in msg_lower for k in ["xlsx", "excel", "spreadsheet"]):
        try:
            tool = get_tool("create_xlsx")
            content = (
                f"Metric: Value\n"
                f"Topic: {title}\n"
                f"Status: Active\n"
                f"Scope: Executive Report"
            )
            result = tool.invoke({"filename": "generated_report.xlsx", "title": title, "content": content})
            return f"**SOVAI Executive Spreadsheet Engine**\n\nGenerated Excel workbook for: *\"{title}\"*\n\n{result}"
        except Exception as err:
            logger.error(f"Fallback XLSX generation failed: {err}")

    return None


def chat(message: str, model: Optional[str] = None, selected_docs: Optional[List[str]] = None) -> str:
    try:
        from backend.core.agent.graph import agent
        inputs = {"query": message}
        if model:
            inputs["model"] = model
        if selected_docs:
            inputs["selected_docs"] = selected_docs

        result = agent.invoke(inputs)
        return result.get("response", "No response generated.")
    except Exception as e:
        logger.warning(f"Agent invocation fallback due to error: {e}")

        # Attempt fallback document creation if query requests a document
        doc_fallback = _handle_document_fallback(message)
        if doc_fallback:
            return doc_fallback

        model_str = f" [{model}]" if model else ""
        docs_str = f"\n• Context documents attached: {', '.join(selected_docs)}" if selected_docs else ""
        return (
            f"**SOVAI Local Assistant{model_str}**\n\n"
            f"Processed query: *\"{message}\"*{docs_str}\n\n"
            f"*(Note: Ollama local LLM service is offline or initializing on http://localhost:11434. "
            f"Once Ollama is running, responses will be generated dynamically by your local models.)*"
        )


def chat_stream(
    message: str,
    model: Optional[str] = None,
    selected_docs: Optional[List[str]] = None,
    image_path: Optional[str] = None
):
    if image_path:
        from backend.core.services.vision_service import analyze_image_with_vision
        res = analyze_image_with_vision(
            query=message,
            image_path=image_path,
            model_override=model,
            selected_docs=selected_docs
        )
        for token in res.split(" "):
            yield token + " "
        return

    try:
        from backend.core.agent.nodes import router, retrieve_context, extract_document_title
        from backend.core.agent.prompts import ENGINEERING_RESPONSE_GUIDE
        from backend.infrastructure.models.model_manager import get_model
        from backend.core.tools.registry import get_tool

        model_name = "general"
        if model:
            m_lower = model.lower()
            if "coder" in m_lower or "coding" in m_lower:
                model_name = "coding"
            elif m_lower == "qwen3:4b" or any(alias in m_lower for alias in ["engineering", "engineer", "math", "calc"]):
                model_name = "engineering"
            elif "vision" in m_lower:
                model_name = "vision"
            elif "qwen" in m_lower or "general" in m_lower:
                model_name = "general"
            elif m_lower == "auto":
                try:
                    decision = router.route(message)
                    model_name = decision.model
                except Exception:
                    model_name = "general"

        llm = get_model(model_name)

        context = None
        if selected_docs:
            try:
                from backend.core.rag.retrive import get_context
                context = get_context(message, selected_docs=selected_docs)
            except Exception as r_err:
                logger.warning(f"RAG retrieval warning: {r_err}")

        if context:
            prompt = f"""
You are SovereignAI, a smart private local AI assistant.

Instructions:
1. Use the local knowledge-base context below if it contains relevant information for the user's request.
2. If the user's question is a general knowledge question (such as "who is ceo of google", world facts, science, coding, history, etc.) and is NOT answered by the local context, answer the question directly using your general knowledge.
3. NEVER say "the provided context does not contain information" if you can answer the question from your general knowledge.

Local Knowledge-Base Context:
{context}

User Request:
{message}

If the user asks to create a document, presentation, PDF, Excel file, or other file, generate the complete content that should go inside that file.
Do not talk about calling tools or function calls. Just generate the actual content.
"""
        else:
            prompt = message

        if model_name == "engineering":
            prompt = ENGINEERING_RESPONSE_GUIDE + "\n\nUser problem:\n" + prompt + "\n\n/no_think"

        msg_lower = message.lower()
        if any(k in msg_lower for k in ["ppt", "pptx", "slide", "presentation"]):
            prompt += """
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
"""

        accumulated = []
        for chunk in llm.stream(prompt):
            token = chunk.content
            if token:
                accumulated.append(token)
                if model_name != "engineering":
                    yield token

        full_response = "".join(accumulated)

        # Buffer engineering output so private planning can never leak into the
        # response, even with older Qwen/Ollama templates.
        if model_name == "engineering":
            if _engineering_response_needs_retry(full_response):
                retry = llm.invoke(_engineering_retry_prompt(message))
                retry_text = retry.content if isinstance(retry.content, str) else str(retry.content)
                if retry_text:
                    full_response = retry_text
            full_response = _clean_engineering_response(full_response)
            if full_response:
                yield full_response

        output_file_tool = None
        doc_filename = None
        if any(k in msg_lower for k in ["ppt", "pptx", "slide", "presentation"]):
            output_file_tool = "create_pptx"
            doc_filename = "generated_presentation.pptx"
        elif any(k in msg_lower for k in ["docx", "word document", "doc"]):
            output_file_tool = "create_docx"
            doc_filename = "generated_document.docx"
        elif "pdf" in msg_lower:
            output_file_tool = "create_pdf"
            doc_filename = "generated_document.pdf"
        elif any(k in msg_lower for k in ["xlsx", "excel", "spreadsheet"]):
            output_file_tool = "create_xlsx"
            doc_filename = "generated_report.xlsx"

        if output_file_tool and full_response:
            try:
                tool = get_tool(output_file_tool)
                title, content = extract_document_title(full_response)
                result = tool.invoke({"title": title, "content": content, "filename": doc_filename})
                yield f"\n\n{result}"
            except Exception as tool_err:
                logger.error(f"Document generation after stream failed: {tool_err}")

    except Exception as e:
        logger.warning(f"Streaming LLM fallback due to error: {e}")
        doc_fallback = _handle_document_fallback(message)
        if doc_fallback:
            for chunk in doc_fallback.split(" "):
                yield chunk + " "
        else:
            model_str = f" [{model}]" if model else ""
            docs_str = f"\n• Context documents attached: {', '.join(selected_docs)}" if selected_docs else ""
            fallback_text = (
                f"**SOVAI Local Assistant{model_str}**\n\n"
                f"Processed query: *\"{message}\"*{docs_str}\n\n"
                f"*(Note: Ollama local LLM service is offline or initializing on http://localhost:11434. "
                f"Once Ollama is running, responses will be generated dynamically by your local models.)*"
            )
            for chunk in fallback_text.split(" "):
                yield chunk + " "


