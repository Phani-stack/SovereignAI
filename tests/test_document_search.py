import unittest
from fastapi.testclient import TestClient
from backend.main import app

class TestDocumentSearch(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_search_documents_endpoint_response_structure(self):
        response = self.client.post("/documents/search", json={"query": "Approval", "limit": 5})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("query", data)
        self.assertIn("count", data)
        self.assertEqual(data["query"], "Approval")
        self.assertIsInstance(data["results"], list)
        self.assertEqual(data["count"], len(data["results"]))

    def test_search_documents_empty_query_returns_zero(self):
        response = self.client.post("/documents/search", json={"query": "", "limit": 5})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 0)
        self.assertEqual(len(data["results"]), 0)

if __name__ == "__main__":
    unittest.main()

 