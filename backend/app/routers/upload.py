import io
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import UserUpload
from app.security import get_current_admin
from app.config import settings

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "uploads")
MAX_SIZE = 5 * 1024 * 1024  # 5 MB

# (magic-bytes signature, canonical extension, Pillow format, PIL mode)
_MAGIC = {
    b"\xff\xd8\xff": ("jpg", "JPEG", "RGB"),
    b"\x89PNG\r\n\x1a\n": ("png", "PNG", "RGBA"),
    b"GIF87a": ("gif", "GIF", None),
    b"GIF89a": ("gif", "GIF", None),
}
WEBP_SIG = b"RIFF"
WEBP_TAIL = b"WEBP"


def _detect_format(data: bytes) -> tuple[str, str, str | None] | None:
    """Return (ext, PIL format, mode) from magic bytes, ignoring client headers."""
    for sig, info in _MAGIC.items():
        if data.startswith(sig):
            return info
    if data.startswith(WEBP_SIG) and data[8:12] == WEBP_TAIL:
        return ("webp", "WEBP", "RGB")
    return None


def _reencode(data: bytes, fmt: str, mode: str | None) -> tuple[bytes, str]:
    """Re-encode with Pillow to strip embedded payloads/metadata (magic-byte
    scanning + image re-encoding per the security requirements).

    GIF keeps the original frame loop so animations are preserved; the
    first frame is still verified to decode (fails fast on garbage).
    """
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    if fmt == "GIF":
        img = Image.open(io.BytesIO(data))  # reopen after verify() invalidates it
        if img.is_animated:
            frames = []
            for frame in range(img.n_frames):
                img.seek(frame)
                frames.append(img.convert("P", palette=Image.Palette.ADAPTIVE))
            buf = io.BytesIO()
            frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:], loop=img.info.get("loop", 0), duration=img.info.get("duration"))
            return buf.getvalue(), "gif"
        buf = io.BytesIO()
        img.convert("P", palette=Image.Palette.ADAPTIVE).save(buf, format="GIF")
        return buf.getvalue(), "gif"

    try:
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGBA" if fmt == "PNG" else mode or "RGB")
        buf = io.BytesIO()
        img.save(buf, format=fmt, optimize=True)
        return buf.getvalue(), fmt.lower()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process image")


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    detected = _detect_format(contents)
    if not detected:
        raise HTTPException(
            status_code=400,
            detail="Unrecognized file signature. Use JPEG, PNG, WebP or GIF.",
        )
    ext, fmt, mode = detected

    sanitized, canonical_ext = _reencode(contents, fmt, mode)

    # Enforce the per-user storage quota BEFORE writing anything to disk.
    result = await db.execute(
        select(func.coalesce(func.sum(UserUpload.size_bytes), 0))
        .where(UserUpload.user_id == admin.id)
    )
    used_bytes = result.scalar_one()
    if used_bytes + len(sanitized) > settings.upload_quota_bytes:
        raise HTTPException(status_code=413, detail="Upload quota exceeded")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{canonical_ext}"
    dest = os.path.join(UPLOAD_DIR, filename)

    with open(dest, "wb") as f:
        f.write(sanitized)

    db.add(UserUpload(
        user_id=admin.id,
        path=f"/uploads/{filename}",
        size_bytes=len(sanitized),
    ))
    await db.flush()

    return JSONResponse({"url": f"/uploads/{filename}"})
