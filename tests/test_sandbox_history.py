import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.api.routes.sandbox import sandbox_executions, _run_counter

class TestSandboxHistory(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        sandbox_executions.clear()

    def test_run_sandbox_code_records_history(self):
        response = self.client.post("/sandbox/run", json={"code": "print('hello')", "task": "Test Script Run"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("run_id", data)
        self.assertIn("duration", data)

        # Verify GET /sandbox/history
        hist_resp = self.client.get("/sandbox/history")
        self.assertEqual(hist_resp.status_code, 200)
        hist_data = hist_resp.json()
        self.assertEqual(hist_data["count"], 1)
        self.assertEqual(hist_data["history"][0]["task"], "Test Script Run")
        self.assertEqual(hist_data["history"][0]["status"], "Verified")

    def test_failed_sandbox_code_records_failed_status(self):
        response = self.client.post("/sandbox/run", json={"code": "raise ValueError('error')", "task": "Failing Run"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "error")

        hist_resp = self.client.get("/sandbox/history")
        hist_data = hist_resp.json()
        self.assertEqual(hist_data["count"], 1)
        self.assertEqual(hist_data["history"][0]["status"], "Failed")

if __name__ == "__main__":
    unittest.main()
