import os

import uvicorn


def main():
    print("Starting SovereignAI Backend Server...")
    # Reloading terminates in-flight StreamingResponse connections and can leave
    # the UI waiting while a local model is still generating. Keep it opt-in.
    reload_enabled = os.getenv("SOVAI_RELOAD", "false").lower() == "true"
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=reload_enabled,
    )


if __name__ == "__main__":
    main()
