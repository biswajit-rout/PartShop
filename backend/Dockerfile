# =========================================================================
# PartShop Backend Dockerfile (Multi-Target: dev & prod)
# =========================================================================

# -------------------------------------------------------------------------
# Stage 1: Base dependencies
# -------------------------------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# -------------------------------------------------------------------------
# Stage 2: Local Development Runner (hot-reload via ./backend:/app mount)
# -------------------------------------------------------------------------
FROM base AS dev

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# -------------------------------------------------------------------------
# Stage 3: Production Runner (non-root, auto-migrations, proxy headers)
# -------------------------------------------------------------------------
FROM base AS prod

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

COPY --chown=appuser:appgroup . .

USER appuser

# Single worker preserves in-memory WebSocket scanner session rooms
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
