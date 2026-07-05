#!/usr/bin/env bash
# Contract pipeline: Pydantic → openapi.json → TypeScript types.
# Run from repo root. CI fails if the committed output drifts (DEVELOPMENT_RULES §7).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ exporting OpenAPI schema from FastAPI app"
(cd "$ROOT/apps/api" && uv run python - <<'PY'
import json
from pathlib import Path

from twinops.main import create_app

schema = create_app().openapi()
target = Path("../../packages/contracts/openapi.json").resolve()
target.write_text(json.dumps(schema, indent=2) + "\n")
print(f"  wrote {target}")
PY
)

echo "→ generating TypeScript types"
pnpm --filter @twinops/contracts generate

echo "✓ contracts up to date"
