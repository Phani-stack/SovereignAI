import os

from backend.config import get_settings


def test_get_settings_reads_environment(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("GENERAL_MODEL", "custom-general:latest")
    monkeypatch.setenv("CODING_MODEL", "custom-coder:latest")
    monkeypatch.setenv("VISION_MODEL", "custom-vision:latest")
    monkeypatch.setenv("EMBEDDING_MODEL", "custom-embed:latest")

    settings = get_settings()

    assert settings["ollama_base_url"] == "http://localhost:11434"
    assert settings["general_model"] == "custom-general:latest"
    assert settings["coding_model"] == "custom-coder:latest"
    assert settings["vision_model"] == "custom-vision:latest"
    assert settings["embedding_model"] == "custom-embed:latest"
