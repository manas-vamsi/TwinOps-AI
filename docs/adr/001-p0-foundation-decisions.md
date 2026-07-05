# ADR-001 — Phase 0 foundation decisions

**Date:** 2026-07-06 · **Status:** Accepted

## Context
First implementation phase of the approved architecture (ARCHITECTURE.md). Several concrete choices were made while scaffolding that the architecture left open or that reality adjusted.

## Decisions

1. **Next.js 16 (not 15).** `create-next-app` ships 16.2 as current stable; no reason to pin backward. Docs updated.
2. **Repo layout: `docker/` + `scripts/` top-level** (replacing the earlier `infra/`), per the approved repository-structure review. `data/` directories land with the phases that fill them (P1 scenarios, P3 corpus) — no empty scaffolding.
3. **uv as the Python toolchain** (env + lock + runner); `uv.lock` committed. Ruff is both linter and formatter; pyright runs `strict`, with unknown-type rules relaxed **only** for `tests/` (httpx ships partial type coverage — `src/` stays fully strict).
4. **pnpm build-script allowlist**: `sharp`, `unrs-resolver` only (pnpm v11 security gate).
5. **Contract pipeline shape:** FastAPI `create_app().openapi()` → `packages/contracts/openapi.json` → `openapi-typescript` → `src/types.ts`. Generated output is committed; CI fails on drift.
6. **Request-ID middleware from day one** — every response carries `X-Request-ID`, bound into structlog context (DEVELOPMENT_RULES §7 made real in the skeleton).
7. **Auth route group deferred to P5** — the shell ships without `(auth)`; adding it later is additive.
8. **`qwen2.5:3b` as the default local model** (8 GB RAM floor), overridable via `TWINOPS_OLLAMA_MODEL`.

## Consequences
- CI = three jobs (web, api, contracts-drift) and must stay green on `main`.
- The five-store state rule starts real: `uiStore` exists (command palette); further stores arrive with their phases.
- Anything importing LLM/DB/bus is still absent by design — P1/P2 introduce them behind the seams the architecture defines.
