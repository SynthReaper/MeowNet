# python-ml/main.py — FastAPI app with lifespan + rate limiting
# MeowNet ML Service · v1.2.0 · 2026-06-27
# Author: SynthReaper <synthreaperx@gmail.com> (https://github.com/SynthReaper)
# License: MIT

from __future__ import annotations
import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from infrastructure.hf_adapter import HFBreedClassifier, HFMoodClassifier
from routers import breed, meow, health_check

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("meownet-ml")

# ─── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ─── Lifespan: models loaded ONCE at startup ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("🐾 MeowNet ML Service starting up — loading classifiers...")
    app.state.breed_classifier = HFBreedClassifier()
    app.state.mood_classifier = HFMoodClassifier()
    logger.info("✅ Classifiers loaded. Service ready.")
    yield
    logger.info("🔽 MeowNet ML Service shutting down — releasing resources...")
    await app.state.breed_classifier.close()
    await app.state.mood_classifier.close()


# ─── Service-level auth middleware ────────────────────────────────────────────
ML_SERVICE_SECRET = os.environ.get("ML_SERVICE_SECRET", "")

def verify_service_secret(request: Request) -> None:
    """Next.js API proxy passes X-Service-Secret; reject all other callers."""
    if ML_SERVICE_SECRET and request.headers.get("X-Service-Secret") != ML_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MeowNet ML Service",
    description="AI inference for cat breed classification and mood detection. Part of the MeowNet platform.",
    version="1.2.0",
    lifespan=lifespan,
    docs_url=None,    # Swagger disabled in production
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: only allow requests from the Next.js app
allowed_origin = os.environ.get("NEXT_PUBLIC_APP_URL", "https://meownet-sr.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin, "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["X-Service-Secret", "Content-Type"],
)

# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "MeowNet ML Service",
        "version": "1.2.0",
        "status": "active",
        "endpoints": {
            "health": "GET /health",
            "breed":  "POST /breed  (rate: 10/min)",
            "meow":   "POST /meow   (rate: 5/min)",
        },
        "note": "All endpoints require X-Service-Secret header."
    }

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health_check.router)
app.include_router(breed.router, dependencies=[Depends(verify_service_secret)])
app.include_router(meow.router, dependencies=[Depends(verify_service_secret)])
