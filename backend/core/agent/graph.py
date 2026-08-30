from langgraph.graph import StateGraph, END

from .state import AgentState

from .nodes import (
    route_node,
    rag_node,
    llm_node,
    document_node,
    final_node,
)


def after_route(state: AgentState):

    if state.needs_rag:
        return "rag"

    return "llm"


def after_llm(state: AgentState):

    if state.output_type in {
        "docx",
        "pdf",
        "pptx",
        "xlsx",
    }:
        return "document"

    return "final"


def build_graph():

    graph = StateGraph(AgentState)

    graph.add_node("route", route_node)

    graph.add_node("rag", rag_node)

    graph.add_node("llm", llm_node)

    graph.add_node("document", document_node)

    graph.add_node("final", final_node)

    graph.set_entry_point("route")

    graph.add_conditional_edges(
        "route",
        after_route,
        {
            "rag": "rag",
            "llm": "llm",
        },
    )

    graph.add_edge("rag", "llm")

    graph.add_conditional_edges(
        "llm",
        after_llm,
        {
            "document": "document",
            "final": "final",
        },
    )

    graph.add_edge("document", "final")

    graph.add_edge("final", END)

    return graph.compile()


agent = build_graph()
