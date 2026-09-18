import unittest
from pathlib import Path
from backend.core.rag.vectordb import delete_document_from_vectordb
from backend.core.services.document_service import STORAGE_DIR

class TestDocumentDeletion(unittest.TestCase):
    def test_delete_document_from_vectordb_handles_missing_file_gracefully(self):
        # Verify function handles nonexistent file without throwing uncaught exceptions
        try:
            delete_document_from_vectordb("nonexistent_test_doc.txt")
            success = True
        except Exception as e:
            success = False
        self.assertTrue(success)

if __name__ == "__main__":
    unittest.main()
