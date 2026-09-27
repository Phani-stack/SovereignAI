import sys
import time
import subprocess
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from backend.api.routes.auth import get_current_user_from_header
from backend.core.services.auth_service import has_ability

router = APIRouter(prefix="/sandbox", tags=["Sandbox"])

sandbox_executions = []
_run_counter = 1000


class SandboxRunRequest(BaseModel):
    code: str
    task: Optional[str] = "Python Script Execution"


@router.post("/run")
async def run_sandbox_code(
    request: SandboxRunRequest,
    current_user: dict = Depends(get_current_user_from_header)
):
    if not has_ability(current_user, "can_execute_code"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not have permission ('can_execute_code') to run code in the sandbox."
        )
    global _run_counter
    code = request.code
    task_name = request.task or "Python Script Execution"

    if not code.strip():
        return {
            "status": "error",
            "output": "No code provided.",
            "exit_code": 1,
            "duration": "0.00s"
        }

    _run_counter += 1
    run_id = f"#RUN-{_run_counter}"
    start_time = time.perf_counter()

    try:
        process = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=10
        )
        end_time = time.perf_counter()
        duration_sec = end_time - start_time
        duration_str = f"{duration_sec:.2f}s"
        exit_code = process.returncode
        status_text = "Verified" if exit_code == 0 else "Failed"

        output = process.stdout if exit_code == 0 else (process.stderr or process.stdout)

        record = {
            "run_id": run_id,
            "task": task_name,
            "duration": duration_str,
            "status": status_text,
            "exit_code": exit_code,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        sandbox_executions.insert(0, record)

        return {
            "status": "success" if exit_code == 0 else "error",
            "output": output or "(Execution completed with no output)",
            "stdout": process.stdout,
            "stderr": process.stderr,
            "exit_code": exit_code,
            "run_id": run_id,
            "duration": duration_str,
            "record": record
        }
    except subprocess.TimeoutExpired:
        end_time = time.perf_counter()
        duration_str = f"{end_time - start_time:.2f}s"
        record = {
            "run_id": run_id,
            "task": task_name,
            "duration": duration_str,
            "status": "Timeout",
            "exit_code": 124,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        sandbox_executions.insert(0, record)
        return {
            "status": "error",
            "output": "Execution timed out (10s limit exceeded).",
            "exit_code": 124,
            "run_id": run_id,
            "duration": duration_str,
            "record": record
        }
    except Exception as e:
        end_time = time.perf_counter()
        duration_str = f"{end_time - start_time:.2f}s"
        record = {
            "run_id": run_id,
            "task": task_name,
            "duration": duration_str,
            "status": "Failed",
            "exit_code": 1,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        sandbox_executions.insert(0, record)
        return {
            "status": "error",
            "output": f"Sandbox execution error: {str(e)}",
            "exit_code": 1,
            "run_id": run_id,
            "duration": duration_str,
            "record": record
        }


@router.get("/history")
async def get_sandbox_history():
    return {
        "history": sandbox_executions,
        "count": len(sandbox_executions)
    }


@router.delete("/history")
async def clear_sandbox_history():
    sandbox_executions.clear()
    return {"status": "success", "message": "Sandbox history cleared."}

