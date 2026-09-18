import sys
import subprocess
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(prefix="/sandbox", tags=["Sandbox"])


class SandboxRunRequest(BaseModel):
    code: str


@router.post("/run")
async def run_sandbox_code(request: SandboxRunRequest):
    code = request.code
    if not code.strip():
        return {"status": "error", "output": "No code provided.", "exit_code": 1}

    try:
        process = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=10
        )
        output = process.stdout if process.returncode == 0 else (process.stderr or process.stdout)
        return {
            "status": "success" if process.returncode == 0 else "error",
            "output": output or "(Execution completed with no output)",
            "stdout": process.stdout,
            "stderr": process.stderr,
            "exit_code": process.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "output": "Execution timed out (10s limit exceeded).",
            "exit_code": 124
        }
    except Exception as e:
        return {
            "status": "error",
            "output": f"Sandbox execution error: {str(e)}",
            "exit_code": 1
        }
