# python-ml/domain/entities.py
# Pure domain objects — zero framework dependencies, 100% unit-testable

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal


VETERINARY_DISCLAIMER = (
    "Informational estimate from image analysis only. "
    "Not a veterinary diagnosis. "
    "Consult a licensed veterinarian for any health concerns."
)


@dataclass(frozen=True)
class BreedResult:
    breed: str
    confidence: float  # 0.0–1.0
    alternatives: list[tuple[str, float]] = field(default_factory=list)
    disclaimer: str = VETERINARY_DISCLAIMER
    model_id: str = "dima806/cat_breed_image_detection"


@dataclass(frozen=True)
class TriageAssessment:
    level: Literal["emergency", "urgent", "monitor", "none"]
    message: str
    disclaimer: str = VETERINARY_DISCLAIMER
    source: str = "Rule-based engine (ASPCA/Cornell guidelines)"


@dataclass(frozen=True)
class MoodResult:
    mood: str
    confidence: float
    is_fun_feature: bool = True
    disclaimer: str = "Fun feature only — not a veterinary or behavioural assessment."
