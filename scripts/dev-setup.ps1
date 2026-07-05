# One-shot local bootstrap (Profile A, $0). Run from repo root: .\scripts\dev-setup.ps1
$ErrorActionPreference = "Stop"
$model = if ($env:TWINOPS_OLLAMA_MODEL) { $env:TWINOPS_OLLAMA_MODEL } else { "qwen2.5:3b" }

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "-> created .env from .env.example"
}

Write-Host "-> starting postgres + valkey + ollama"
docker compose -f docker/docker-compose.yml up -d

Write-Host "-> pulling local model ($model) - first run downloads ~2 GB"
docker compose -f docker/docker-compose.yml exec ollama ollama pull $model

Write-Host "-> installing workspace dependencies"
pnpm install
Push-Location apps/api
uv sync
Pop-Location

Write-Host ""
Write-Host "ready. Next:"
Write-Host "    pnpm dev                # web -> http://localhost:3000"
Write-Host "    cd apps/api; uv run uvicorn twinops.main:app --reload   # api -> http://localhost:8000/healthz"
