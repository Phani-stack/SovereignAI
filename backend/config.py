import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):
        return False


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def get_settings():
    return {
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "general_model": os.getenv("GENERAL_MODEL", "qwen2.5:3b"),
        "coding_model": os.getenv("CODING_MODEL", "qwen2.5-coder:3b"),
        "vision_model": os.getenv("VISION_MODEL", "qwen2.5:3b"),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
        "temperature": float(os.getenv("MODEL_TEMPERATURE", "0")),
        "num_ctx": int(os.getenv("MODEL_NUM_CTX", "4096")),
        "num_predict": int(os.getenv("MODEL_NUM_PREDICT", "128")),
    }
