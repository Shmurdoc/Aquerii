FROM python:3.11-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl poppler-utils libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.5.1+cpu torchvision==0.20.1+cpu torchaudio==2.5.1+cpu --force-reinstall \
 && pip install --no-cache-dir --index-url https://pypi.org/simple -r requirements.txt \
 && python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# ── Production ────────────────────────────────────────────────
FROM base AS production
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    PORT=8002

COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY . .
RUN mkdir -p /data/faiss

EXPOSE 8002
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8002} --workers 2"]
