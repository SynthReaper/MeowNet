# python-ml/routers/meow.py — POST /meow — Fun mood detection

from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/meow", tags=["meow"])
limiter = Limiter(key_func=get_remote_address)

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("")
@limiter.limit("5/minute")
async def classify_meow(request: Request, audio: UploadFile = File(...)):
    """
    Classify the mood of a cat meow.
    FUN FEATURE ONLY — not a veterinary or behavioural assessment.
    Audio is processed in memory and NOT stored.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio too large (max 10MB)")

    classifier = request.app.state.mood_classifier
    try:
        result = await classifier.classify(audio_bytes)
    except Exception:
        # Graceful fallback — this is a fun feature
        result_dict = {"mood": "Mysterious", "confidence": 0.5, "is_fun_feature": True, "disclaimer": "Fun feature only — not a veterinary or behavioural assessment."}
        return result_dict

    return {
        "mood": result.mood,
        "confidence": result.confidence,
        "is_fun_feature": result.is_fun_feature,
        "disclaimer": result.disclaimer,
    }
