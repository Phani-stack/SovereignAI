import unittest
from backend.core.services.chat_service import (
    _clean_engineering_response,
    _engineering_response_needs_retry,
    _engineering_retry_prompt,
    chat_stream,
)

class TestChatStream(unittest.TestCase):
    def test_engineering_response_hides_planning(self):
        response = (
            "Okay, I need to work this out first.\n"
            "FINAL_RESPONSE_START\n"
            "**Given**\nPower = 75 kW\n\n**Final Answer**\nDiameter = 64 mm"
        )
        cleaned = _clean_engineering_response(response)
        self.assertNotIn("work this out", cleaned)
        self.assertNotIn("FINAL_RESPONSE_START", cleaned)
        self.assertTrue(cleaned.startswith("**Given**"))

    def test_engineering_scratch_work_triggers_retry(self):
        self.assertTrue(_engineering_response_needs_retry("Okay, let me calculate that."))
        self.assertTrue(
            _engineering_response_needs_retry(
                "FINAL_RESPONSE_START\nWait, let me check the units."
            )
        )
        self.assertFalse(
            _engineering_response_needs_retry(
                "FINAL_RESPONSE_START\n**Maximum shear stress**\n101.9 MPa"
            )
        )

    def test_engineering_retry_prompt_requires_clean_boundary(self):
        prompt = _engineering_retry_prompt("Calculate shaft stress")
        self.assertIn("FINAL_RESPONSE_START", prompt)
        self.assertIn("only the polished final response", prompt)
        self.assertIn("Begin with **Answer:**", prompt)
        self.assertIn("numbered `###` heading", prompt)
        self.assertIn("Write each equation only once", prompt)

    def test_chat_stream_generator(self):
        chunks = list(chat_stream("Hello test message", model="auto"))
        self.assertGreater(len(chunks), 0)
        full_text = "".join(chunks)
        self.assertGreater(len(full_text), 0)

if __name__ == "__main__":
    unittest.main()
