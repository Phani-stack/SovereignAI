from fastapi import FastAPI
from backend.api.routes import router

app = FastAPI(
    title="Sovereign AI",
    description="Local AI Agent Workbench API",
    version="0.1.0"
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "Sovereign AI Backend is running",
        "version": "0.1.0"
    }
