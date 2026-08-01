import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.security import get_current_admin

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    _=Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Use JPEG, PNG, WebP or GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    # Create uploads dir if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename preserving extension
    ext = os.path.splitext(file.filename or "upload")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)

    with open(dest, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/uploads/{filename}"})
