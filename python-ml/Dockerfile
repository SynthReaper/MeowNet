# python-ml/Dockerfile — MeowNet ML Service
# Layer-cached build for fast CI/CD. Non-root user for security.
# Author: SynthReaper <github.com/SynthReaper>
# Version: 1.2.0 · Updated: 2026-06-27

FROM python:3.12-slim AS base

LABEL org.opencontainers.image.title="MeowNet ML Service"
LABEL org.opencontainers.image.description="FastAPI cat breed + mood classification service for the MeowNet platform"
LABEL org.opencontainers.image.version="1.2.0"
LABEL org.opencontainers.image.authors="SynthReaper <synthreaperx@gmail.com> (https://github.com/SynthReaper)"
LABEL org.opencontainers.image.source="https://github.com/SynthReaper/MeowNet"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Layer 1: system deps (cached unless apt changes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Layer 2: Python deps (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: source (only rebuilt on code changes)
COPY . .

# Non-root user for container security
RUN adduser --disabled-password --gecos '' meownet && \
    chown -R meownet:meownet /app
USER meownet

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
