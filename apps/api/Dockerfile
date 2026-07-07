# Production image for the TwinOps API. Self-contained: in-memory sim +
# in-process bus, so no database or Redis to provision. Build context = apps/api.
FROM python:3.12-slim

# uv for fast, reproducible installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# install deps first (cached layer), then the app
COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"
ENV TWINOPS_ENV=prod

# hosts (Render/HF/Fly) inject $PORT; default 8000 locally
EXPOSE 8000
CMD ["sh", "-c", "uvicorn twinops.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
