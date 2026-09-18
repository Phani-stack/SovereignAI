import unittest
import os
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.services.vision_service import (
    save_image,
    list_images,
    get_image_path,
    analyze_image_with_vision,
    IMAGE_STORAGE_DIR
)


class TestVisionModelService(unittest.TestCase):
    def setUp(self):
        IMAGE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.test_img_path = IMAGE_STORAGE_DIR / "test_sample.png"
        # Write a tiny 1x1 dummy PNG file
        with open(self.test_img_path, "wb") as f:
            f.write(
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
                b"\x00\x00\x00\rIDATx\x9cc` \x05\x00\x00\x04\x00\x01\x8d\x87\x00\x00\x00\x00IEND\xaeB`\x82"
            )
        self.client = TestClient(app)

    def tearDown(self):
        if self.test_img_path.exists():
            self.test_img_path.unlink()

    def test_list_images(self):
        images = list_images()
        filenames = [img["filename"] for img in images]
        self.assertIn("test_sample.png", filenames)

    def test_get_image_path(self):
        p = get_image_path("test_sample.png")
        self.assertIsNotNone(p)
        self.assertTrue(p.exists())

    def test_analyze_image_with_vision_fallback(self):
        result = analyze_image_with_vision(
            query="Analyze this diagram and provide python code",
            image_path=str(self.test_img_path),
            selected_docs=["sample_doc.pdf"]
        )
        self.assertIn("SOVAI Vision Assistant", result)
        self.assertIn("Analyze this diagram", result)

    def test_analyze_image_with_auto_model(self):
        result = analyze_image_with_vision(
            query="Explain this image",
            image_path=str(self.test_img_path),
            model_override="auto"
        )
        self.assertNotIn("vision model (auto)", result)

    def test_vision_api_routes(self):
        # 1. List Images
        response = self.client.get("/vision/images")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("images", data)

        # 2. Serve Image
        img_res = self.client.get("/vision/images/test_sample.png")
        self.assertEqual(img_res.status_code, 200)

        # 3. Vision Analyze Form Endpoint
        post_res = self.client.post(
            "/vision/",
            data={
                "query": "What is in this image?",
                "image_path": "test_sample.png"
            }
        )
        self.assertEqual(post_res.status_code, 200)
        json_data = post_res.json()
        self.assertEqual(json_data["query"], "What is in this image?")
        self.assertIn("message", json_data)


if __name__ == "__main__":
    unittest.main()
