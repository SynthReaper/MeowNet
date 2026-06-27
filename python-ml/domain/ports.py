# python-ml/domain/ports.py
# Abstract interfaces — infrastructure adapters implement these

from abc import ABC, abstractmethod
from domain.entities import BreedResult, MoodResult


class BreedClassifierPort(ABC):
    @abstractmethod
    async def classify(self, image_bytes: bytes) -> BreedResult:
        ...


class MoodClassifierPort(ABC):
    @abstractmethod
    async def classify(self, audio_bytes: bytes) -> MoodResult:
        ...
