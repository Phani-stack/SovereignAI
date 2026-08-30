from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter(prefix="/vision", tags=["Vision"])


@router.post("/")
async def vision_endpoint(query: str = Form(...), image: UploadFile = File(...)):

    return {
        "query": query,
        "filename": image.filename,
        "message": "Image received successfully",
    }
