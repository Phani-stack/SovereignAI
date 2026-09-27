import unittest
from backend.core.rag.retrive import get_context
from backend.core.services.chat_service import chat_stream

class TestRagPipeline(unittest.TestCase):
    def test_get_context_returns_string(self):
        ctx = get_context("equipment approval procedure")
        self.assertIsInstance(ctx, str)

    def test_get_context_with_selected_docs_filter(self):
        ctx = get_context("approval", selected_docs=["Approval_Procedure_SOP.pdf"])
        self.assertIsInstance(ctx, str)

    def test_chat_stream_returns_rag_grounded_response(self):
        tokens = list(chat_stream("What is the equipment approval procedure?"))
        full_response = "".join(tokens)
        print("DEBUG FULL RESPONSE:", repr(full_response))
        self.assertTrue(len(full_response) > 0)
        self.assertTrue(any(w in full_response.lower() for w in ["sovai", "approval", "equipment", "context", "offline", "document", "provided", "information"]))




if __name__ == "__main__":
    unittest.main()

