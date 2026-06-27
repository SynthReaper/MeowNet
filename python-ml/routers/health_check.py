# python-ml/routers/health_check.py

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "meownet-ml", "version": "1.0.0"}
