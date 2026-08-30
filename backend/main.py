from fastapi import FastAPI

from backend.api.routes.document import router as document_router
from backend.api.routes.chat import router as chat_router
from backend.api.routes.vision import router as vision_router


app = FastAPI(
    title="SovereignAI", description="Local AI Workbench API", version="1.0.0"
)


app.include_router(document_router)
app.include_router(chat_router)
app.include_router(vision_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
