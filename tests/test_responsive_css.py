import unittest
import os

class TestResponsiveCss(unittest.TestCase):
    def setUp(self):
        self.css_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "styles.css")
        self.html_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
        with open(self.css_path, "r", encoding="utf-8") as f:
            self.css = f.read()
        with open(self.html_path, "r", encoding="utf-8") as f:
            self.html = f.read()

    def test_viewport_meta_tag_present(self):
        self.assertIn('name="viewport"', self.html)
        self.assertIn('width=device-width', self.html)

    def test_page_overflow_controls(self):
        self.assertIn("overflow-x: hidden", self.css)
        self.assertIn("max-width: 100vw", self.css)

    def test_media_queries_presence(self):
        self.assertIn("@media (max-width: 1440px)", self.css)
        self.assertIn("@media (max-width: 1200px)", self.css)
        self.assertIn("@media (max-width: 900px)", self.css)
        self.assertIn("@media (max-width: 768px)", self.css)
        self.assertIn("@media (max-width: 560px)", self.css)
        self.assertIn("@media (max-width: 375px)", self.css)

    def test_modal_viewport_constraints(self):
        self.assertIn("max-width: min(", self.css)
        self.assertIn("max-height: 90vh", self.css)

    def test_table_responsive_containers(self):
        self.assertIn("table-responsive-container", self.css)
        self.assertIn("-webkit-overflow-scrolling: touch", self.css)

if __name__ == "__main__":
    unittest.main()
