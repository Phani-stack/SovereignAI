from langchain_ollama import ChatOllama

from backend.config import get_settings
from .schemas import RoutingDecision
from .prompts import ROUTER_PROMPT


class ModelRouter:
    def __init__(self):
        settings = get_settings()

        self.llm = ChatOllama(
            model=settings["general_model"],
            base_url=settings["ollama_base_url"],
            temperature=settings["temperature"],
            num_predict=settings["num_predict"],
            num_ctx=settings["num_ctx"],
        )

        self.router = self.llm.with_structured_output(RoutingDecision)

    def route(self, query: str) -> RoutingDecision:

        prompt = ROUTER_PROMPT.format(query=query)

        return self.router.invoke(prompt)
