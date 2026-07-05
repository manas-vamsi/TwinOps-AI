# TwinOps AI — Coding Standards

The rules this codebase follows. They exist to keep a solo-built codebase reviewable by strangers (hiring engineers *will* read it) and to enforce the architecture's binding decisions. When a rule here conflicts with convenience, the rule wins; when it conflicts with [ARCHITECTURE.md](ARCHITECTURE.md), the architecture wins and this file gets fixed.

## 1. Repository discipline

- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`), imperative mood, scoped when useful (`feat(twin): …`). Small, single-purpose commits — no 40-file "initial work" dumps.
- **Branches + PRs even solo:** `feat/…`, `fix/…` off `main`; PRs describe what/why and link the phase. `main` is always green.
- **CI gates every PR:** ruff + eslint · pyright + `tsc --noEmit` (strict) · pytest + vitest · build · OpenAPI→TS contract generation (drift fails the build).
- **Docs are code:** a change that invalidates README/ARCHITECTURE/ROADMAP updates them in the same PR. Architectural decisions get an ADR in `docs/adr/` (`NNN-title.md`: context → decision → consequences).

## 2. Module boundaries (backend)

- Every module = `router.py · service.py · repo.py · schemas.py`. **Routers never touch the DB**; repos never contain business logic.
- Modules import each other's **service interfaces only** — never internals. Cross-module *events* go over the bus. A PR that imports `modules.x.repo` from `modules.y` is wrong by definition.
- Every boundary object is a Pydantic schema. Raw dicts don't cross module lines.
- **LLM access only through the gateway** (`modules/llm`). No direct provider SDK imports anywhere else — this is what keeps 4 providers swappable and the $0 boot rule enforceable.

## 3. Error doctrine (no silent failures)

- **Every error has a name.** Specific exception classes; `except Exception` is allowed only at task/request top level, where it must log full context (what was attempted, with what args, for which request/run) and convert to a typed error.
- Every rescued error does exactly one of: **retry with backoff**, **degrade gracefully with a user-visible state**, or **re-raise with added context**. Swallow-and-continue is a defect.
- API errors are RFC-7807-style: `{code, message, details, trace_id}`. The `trace_id` must appear in the logs.
- **LLM-specific policy (binding):** structured-output failure ⇒ one schema-retry → fallback provider → honest degrade ("analysis unavailable", show raw evidence). **Never fabricate analysis.** Refusals and malformed responses are distinct, logged failure modes.
- New failure modes ship with their row in the module's error registry (docstring table): failure → exception → rescue → user sees.

## 4. Python

- Python 3.12, fully async (`async def` end to end; no sync DB calls on the event loop). Blocking work (fastembed, file IO bursts) goes through `run_in_executor` or dedicated tasks.
- ruff (lint + format) and pyright strict pass clean — zero warnings checked in.
- Type hints everywhere public; `Any` is a code smell requiring a comment.
- Background tasks are supervised: named, crash-isolated, restart-with-backoff, health surfaced in `/readyz`. Respect the binding caps: **max 2 concurrent agent runs, all LLM calls behind the gateway semaphore, ticker watchdog**.
- Determinism rules: **no wall-clock or unseeded randomness in simulation logic** — tick counters and the seeded RNG only. Anything else breaks replay and golden tests.
- structlog JSON only — no bare `print`/`logging`. Every log line carries `request_id` or `run_id`.
- Config via pydantic-settings; secrets via env; never committed, never logged.

## 5. TypeScript / React

- `strict: true`; no `any` (use `unknown` + narrowing); no `@ts-ignore` without a linked issue.
- **State rule (binding):** server-owned data → TanStack Query; streaming/UI-local → Zustand. WS events either patch a store (high-frequency) or invalidate a query (low-frequency). Never both for the same data.
- All API calls through the **generated client** in `lib/api` — hand-written fetches to `/api/v1` are forbidden (that's the contract seam).
- Feature-folder structure (`features/twin/…`); shared primitives in `components/ui`; shell chrome in `components/shell`. A component used by one feature lives in that feature.
- **Design tokens only:** no hex colors, font names, radii, or shadows outside `styles/tokens.css`. Motion uses the presets in `motion.ts`. This is how the brand survives 9 weeks of building.
- Accessibility floor (never cut): keyboard reachability (palette + lists + focus rings), `aria-live` for notifications, `prefers-reduced-motion` honored, AA contrast on the dark palette.
- Realtime: all subscriptions go through `RealtimeProvider`; components never open sockets. Every live surface implements snapshot → delta → re-snapshot-on-gap.

## 6. Testing

Pyramid: many unit · fewer integration · 3 Playwright journeys. CI runs everything on every PR; **CI never calls a live LLM** (recorded cassettes; the RCA golden-truth eval runs on demand/nightly).

Non-negotiable suites (see ARCHITECTURE §11):
- **Sim determinism goldens** — same seed + scenario ⇒ identical frames (protects replay, demos, and every downstream test)
- **Detector precision** — fires on all 8 scenarios within SLA ticks; zero false positives on 30-min baseline
- **State machine** — legal transitions + rejected illegal ones
- **Gateway contract tests** — per-provider structured-output schemas (cassettes); fallback chain walks on injected failure; boot succeeds with any single provider configured
- **RCA golden-truth eval** — root cause matches scenario ground truth ≥7/8, every response carries ≥1 valid citation
- **WS property tests** — seq-gap ⇒ re-snapshot; coalescing bounds
- **Replay = live** — event-sourced replay renders identical states
- New non-trivial logic ships with the smallest test that fails if it breaks. Flaky patterns (time, network, ordering, live LLMs) are banned from CI.

## 7. Security & privacy floor

- Input validation at every trust boundary (Pydantic; reject loudly). Authorization in the service layer (viewer / engineer / admin), workspace-scoped queries always — no cross-workspace object references.
- httpOnly SameSite cookies; no tokens in localStorage. Rate limits on auth, inject, chat, and search. State-changing endpoints: idempotency keys + audit_log rows.
- Prompt-injection posture: retrieved corpus text is data, never instructions; copilot tools are read-only; `navigate` executes client-side only.
- No PII in logs. Dependencies pinned via lockfiles; no new dependency without checking the four-question $0 audit ([TECH_STACK.md](TECH_STACK.md)) and license.

## 8. Comments & style

- Code reads like the surrounding code. Comments state constraints the code can't show (invariants, ceilings, seams) — not narration. Deliberate shortcuts carry a marker comment naming the ceiling and the upgrade path (e.g. `# ceiling: global semaphore; per-provider pools if throughput matters`).
- ASCII diagrams in module docstrings for non-obvious flows (state machines, pipelines) — and they're maintained with the code; a stale diagram is a bug.
