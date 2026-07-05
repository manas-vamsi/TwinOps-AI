#!/usr/bin/env bash
# One-shot local bootstrap (Profile A, $0). Run from repo root: bash scripts/dev-setup.sh
set -euo pipefail

MODEL="${TWINOPS_OLLAMA_MODEL:-qwen2.5:3b}"

[ -f .env ] || { cp .env.example .env && echo "→ created .env from .env.example"; }

echo "→ starting postgres + valkey + ollama"
docker compose -f docker/docker-compose.yml up -d

echo "→ pulling local model ($MODEL) — first run downloads ~2 GB"
docker compose -f docker/docker-compose.yml exec ollama ollama pull "$MODEL"

echo "→ installing workspace dependencies"
pnpm install
(cd apps/api && uv sync)

cat <<'EOF'

✓ ready. Next:
    pnpm dev                                # web  → http://localhost:3000
    cd apps/api && uv run uvicorn twinops.main:app --reload   # api → http://localhost:8000/healthz
EOF
