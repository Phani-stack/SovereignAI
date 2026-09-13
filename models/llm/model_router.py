from typing import Literal


ModelType = Literal[
    "general",
    "coding",
    "vision"
]


class ModelRouter:

    GENERAL_MODEL = "qwen3:4b"
    CODING_MODEL = "qwen2.5-coder:3b"
    VISION_MODEL = "qwen2.5vl:3b"

    def __init__(self):

        self.models = {
            "general": self.GENERAL_MODEL,
            "coding": self.CODING_MODEL,
            "vision": self.VISION_MODEL
        }

    def route(self, message: str) -> tuple[str, ModelType]:

        text = message.lower().strip()

        # -----------------------------------------
        # Vision-related keywords
        # -----------------------------------------

        vision_keywords = [
            "image",
            "photo",
            "picture",
            "diagram",
            "drawing",
            "pid",
            "p&id",
            "scanned image",
            "visual",
            "what do you see",
            "analyze this image"
        ]

        for keyword in vision_keywords:

            if keyword in text:

                return (
                    self.VISION_MODEL,
                    "vision"
                )

        coding_keywords = [
            "code",
            "coding",
            "program",
            "programming",
            "python",
            "java",
            "javascript",
            "typescript",
            "c++",
            "c#",
            "leetcode",
            "hackerrank",
            "debug",
            "debugging",
            "bug",
            "algorithm",
            "function",
            "class",
            "compile",
            "compiler",
            "syntax",
            "exception",
            "stack trace",
            "sql",
            "database",
            "api",
            "recursion",
            "linked list",
            "array",
            "binary search",
            "optimization"
        ]

        for keyword in coding_keywords:

            if keyword in text:

                return (
                    self.CODING_MODEL,
                    "coding"
                )

        # -----------------------------------------
        # Default
        # -----------------------------------------

        return (
            self.GENERAL_MODEL,
            "general"
        )

    def get_available_models(self):

        return self.models.copy()


model_router = ModelRouter()
