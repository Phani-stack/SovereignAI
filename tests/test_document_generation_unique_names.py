import unittest
from pathlib import Path
from backend.core.tools.document_tools import prepare_output, derive_relevant_filename, OUTPUT_DIR


class TestDocumentGenerationUniqueNames(unittest.TestCase):
    def test_derive_relevant_filename_structural_prefixes(self):
        # Generic structural title "Slide 1: Executive Title Overview" with content line "Quantum Computing Fundamentals"
        content = "Slide 1: Executive Title Overview\nQuantum Computing Fundamentals\nKey concepts of quantum state superposition"
        name = derive_relevant_filename("slide_1_executive_title_overview.pptx", title="Slide 1: Executive Title Overview", content=content, default_ext=".pptx")
        self.assertEqual(name, "quantum_computing_fundamentals.pptx")

    def test_derive_relevant_filename_generic_with_title(self):
        name1 = derive_relevant_filename("presentation.pptx", title="Cybersecurity Quarterly Review", content="", default_ext=".pptx")
        self.assertEqual(name1, "cybersecurity_quarterly_review.pptx")

        name2 = derive_relevant_filename("generated_presentation.pptx", title="Executive Briefing 2026", content="", default_ext=".pptx")
        self.assertEqual(name2, "executive_briefing_2026.pptx")

    def test_derive_relevant_filename_generic_with_content(self):
        content = "Solar Power Microgrids Overview\nDetailed analysis of renewable energy deployment..."
        name = derive_relevant_filename("document.docx", title="", content=content, default_ext=".docx")
        self.assertEqual(name, "solar_power_microgrids_overview.docx")

    def test_derive_relevant_filename_custom(self):
        name = derive_relevant_filename("my_custom_analysis.pptx", title="Any Title", content="", default_ext=".pptx")
        self.assertEqual(name, "my_custom_analysis.pptx")

    def test_prepare_output_unique_filename(self):
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        test_filename = "test_unique_doc.txt"
        file1_path = prepare_output(test_filename, title="Test Unique Doc", content="", default_ext=".txt")
        file1_path.write_text("First version", encoding="utf-8")

        self.assertTrue(file1_path.exists())

        file2_path = prepare_output(test_filename, title="Test Unique Doc", content="", default_ext=".txt")
        self.assertNotEqual(str(file1_path), str(file2_path))
        self.assertIn("test_unique_doc_", file2_path.name)

        file2_path.write_text("Second version", encoding="utf-8")
        self.assertTrue(file2_path.exists())
        self.assertEqual(file1_path.read_text(encoding="utf-8"), "First version")

        # Cleanup
        if file1_path.exists():
            file1_path.unlink()
        if file2_path.exists():
            file2_path.unlink()


if __name__ == '__main__':
    unittest.main()
