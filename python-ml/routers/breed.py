# python-ml/routers/breed.py — POST /breed endpoint

from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
import piexif

router = APIRouter(prefix="/breed", tags=["breed"])
limiter = Limiter(key_func=get_remote_address)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def strip_exif(image_bytes: bytes) -> bytes:
    """Strip EXIF metadata in Python ML service as secondary safety net."""
    try:
        piexif.remove(image_bytes)
    except Exception:
        pass
    return image_bytes


@router.post("")
@limiter.limit("10/minute")
async def estimate_breed(request: Request, photo: UploadFile = File(...)):
    if photo.size and photo.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=415, detail="Unsupported image format")

    image_bytes = await photo.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")

    clean_bytes = strip_exif(image_bytes)
    classifier = request.app.state.breed_classifier
    result = await classifier.classify(clean_bytes)

    return {
        "breed": result.breed,
        "confidence": result.confidence,
        "alternatives": [{"breed": b, "confidence": c} for b, c in result.alternatives],
        "disclaimer": result.disclaimer,
        "model_id": result.model_id,
    }
