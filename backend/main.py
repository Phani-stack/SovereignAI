from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes.document import router as document_router
from backend.api.routes.chat import router as chat_router
from backend.api.routes.vision import router as vision_router
from backend.api.routes.sandbox import router as sandbox_router


app = FastAPI(
    title="SovereignAI", description="Local AI Workbench API", version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(document_router)
app.include_router(chat_router)
app.include_router(vision_router)
app.include_router(sandbox_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
UI_DIR = Path(__file__).resolve().parents[1] / "ui"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
elif UI_DIR.exists():
    app.mount("/", StaticFiles(directory=str(UI_DIR), html=True), name="ui")

# touch at 1788103294.606627
