# python-ml/infrastructure/hf_adapter.py
# HuggingFace Inference API adapter — implements domain ports

import httpx
import os
from domain.entities import BreedResult, MoodResult
from domain.ports import BreedClassifierPort, MoodClassifierPort

HF_API_URL = "https://api-inference.huggingface.co/models"
HF_TOKEN = os.environ.get("HUGGINGFACE_API_KEY", "")
BREED_MODEL = "dima806/cat_breed_image_detection"
MOOD_MODEL = "ehsanaghaei/cat_sound_classifier"
TIMEOUT = 30.0


class HFBreedClassifier(BreedClassifierPort):
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            timeout=TIMEOUT,
        )

    async def classify(self, image_bytes: bytes) -> BreedResult:
        resp = await self._client.post(
            f"{HF_API_URL}/{BREED_MODEL}",
            content=image_bytes,
            headers={"Content-Type": "image/jpeg"},
        )
        resp.raise_for_status()
        results = resp.json()

        if isinstance(results, list) and results:
            top = results[0]
            alternatives = [(r["label"], round(r["score"], 3)) for r in results[1:4]]
            return BreedResult(
                breed=top["label"],
                confidence=round(top["score"], 3),
                alternatives=alternatives,
            )
        # Fallback if model returns empty
        return BreedResult(breed="Unknown", confidence=0.0)

    async def close(self) -> None:
        await self._client.aclose()


class HFMoodClassifier(MoodClassifierPort):
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            timeout=TIMEOUT,
        )

    async def classify(self, audio_bytes: bytes) -> MoodResult:
        resp = await self._client.post(
            f"{HF_API_URL}/{MOOD_MODEL}",
            content=audio_bytes,
            headers={"Content-Type": "audio/mpeg"},
        )
        resp.raise_for_status()
        results = resp.json()

        if isinstance(results, list) and results:
            top = results[0]
            return MoodResult(mood=top["label"], confidence=round(top["score"], 3))
        return MoodResult(mood="Unknown", confidence=0.0)

    async def close(self) -> None:
        await self._client.aclose()
