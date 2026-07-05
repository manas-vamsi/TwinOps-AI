# TwinOps AI — Development Rules

**The single engineering rulebook.** Every implementation, every PR, every file follows these rules. When a rule conflicts with convenience, the rule wins; when it conflicts with [ARCHITECTURE.md](ARCHITECTURE.md), the architecture wins and this file gets fixed in the same PR. (This file supersedes and absorbs the former CODING_STANDARDS.md.)

---

## 1. Folder organization

```
twinops-ai/
├── apps/
│   ├── web/src/
│   │   ├── app/                  # routes ONLY — (auth)/, (shell)/{dashboard,twin,incidents,
│   │   │                         #   agents,knowledge,infrastructure,analytics,settings}
│   │   ├── components/ui/        # shadcn-derived primitives (token-skinned, feature-agnostic)
│   │   ├── components/shell/     # sidebar, top bar, command palette, notifications tray
│   │   ├── features/<name>/      # twin, incidents, agents, knowledge, analytics,
│   │   │                         #   copilot, search, dashboard — components + hooks + logic
│   │   ├── lib/api/              # generated OpenAPI client + thin wrappers ONLY
│   │   ├── lib/realtime/         # RealtimeProvider, topic hooks
│   │   ├── stores/               # zustand stores (one file per store)
│   │   └── styles/               # tokens.css (ALL design values) + globals.css
│   └── api/src/twinops/
│       ├── core/                 # config, errors, security, logging, deps
│       ├── db/                   # engine, base, alembic/
│       ├── realtime/             # ws endpoint, connection manager, bus bridge
│       └── modules/<name>/       # router.py · service.py · repo.py · schemas.py (+ tests/)
├── packages/contracts/           # exported openapi.json + generated TS types
├── data/corpus/                  # RAG source markdown        data/scenarios/  # failure YAML
├── docker/                       # docker-compose.yml, Dockerfiles, ollama init
├── scripts/                      # thin entry points: dev-setup, generate-contracts, seed, demo
└── docs/adr/                     # NNN-title.md decision records   docs/assets/  # brand
```

**Placement rules:** a component used by one feature lives in that feature — promotion to `components/ui` requires a second consumer. Route files (`app/`) contain layout + data bootstrapping only; logic lives in `features/`. Backend code that two modules need lives in `core/` or goes over the bus — never cross-module imports of internals. Tests live next to what they test (`features/twin/__tests__/`, `modules/twin/tests/`). No `utils/` dumping ground: a helper belongs to a feature/module or to `core`/`lib` with a named purpose.

## 2. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| React components (file + export) | PascalCase, named export, one component per file | `TwinNodeBase.tsx` |
| Hooks | `use` + camelCase | `useNodeMetrics.ts` |
| Zustand stores | `<domain>Store.ts`, hook `use<Domain>Store` | `twinStore.ts` |
| Non-component TS files | camelCase | `topologyHash.ts` |
| Python modules/functions/vars | snake_case | `scenario_engine.py`, `apply_cascade()` |
| Python classes | PascalCase; suffix by role | `IncidentService`, `TelemetrySource` |
| Custom exceptions | PascalCase + `Error` | `ScenarioValidationError` |
| DB tables / columns | snake_case, plural tables | `incident_events.created_at` |
| API paths | plural resources, kebab-free, nouns | `/api/v1/incidents/{id}/timeline` |
| WS/bus topics | dot-namespaced, lowercase | `node.svc-payment.metrics`, `replay.{session}.*` |
| Node IDs | stable human-readable slugs `<kind>-<name>` | `svc-payment`, `db-orders-pg` |
| Env vars | SCREAMING_SNAKE, prefixed | `TWINOPS_SIM_SEED`, `TWINOPS_BUS_MODE` |
| Scenario files | kebab-case | `db-pool-exhaustion.yaml` |
| Branches | `feat/…`, `fix/…`, `docs/…`, `chore/…` | `feat/twin-canvas` |
| ADRs | `NNN-kebab-title.md` | `001-modular-monolith.md` |

Name things for what they do, not how they do it. Abbreviations only when industry-standard (RCA, WS, RBAC).

## 3. React component standards

- **Server components** for shell chrome + data bootstrapping; **`"use client"`** for anything interactive. Don't fight the App Router for RSC purity — this is a realtime app.
- One component per file; named exports (no default exports); props typed with an explicit `interface XProps` — never inline anonymous prop types on exported components.
- Component file order: types → component → subcomponents → local helpers. A file over ~200 lines is a smell: split by extracting subcomponents into the feature folder.
- **Design tokens only:** zero hex colors, font names, radii, shadows, or magic spacing outside `styles/tokens.css`. Motion uses presets from `motion.ts` (fade-rise 200ms, panel slide 240ms). This is how the brand survives the whole build.
- **Every data-bearing surface implements its five states** — loading (skeleton shimmer, never spinners), empty (a designed moment, not a blank div), error (honest degrade card with trace id), success, partial. The state matrix in ARCHITECTURE §2 is binding.
- Accessibility floor (never cut): keyboard reachable (palette, list nav, gold focus rings), `aria-live` for notifications, `prefers-reduced-motion` honored (cascade animation degrades to static badges), AA contrast on the dark palette, touch targets ≥40px.
- Realtime: components never open sockets — subscriptions go through `RealtimeProvider` hooks tied to mount/unmount. Every live surface follows snapshot → delta → re-snapshot-on-gap.
- Memo/perf: health tints via CSS variables (no per-frame re-render); heavy computation (layout) in web workers; virtualize lists past ~100 rows.

## 4. FastAPI standards

- Module anatomy is fixed: `router.py` (HTTP shape only) → `service.py` (business logic) → `repo.py` (persistence only) + `schemas.py` (Pydantic boundary objects). **Routers never touch the DB; repos never contain business logic.**
- Dependencies via `Depends` (session, current user, workspace scope) — no module-level singletons except the app-lifespan-managed ones (graph, buffers, gateway).
- Fully async end to end; no sync DB or network calls on the event loop. CPU/blocking work (fastembed, bulk file IO) runs in executors or dedicated tasks.
- Cross-module interaction: import the other module's **service interface**, or publish an event on the bus. Importing another module's `repo`/internals is wrong by definition.
- Background tasks are supervised: named, crash-isolated, restart-with-backoff, health in `/readyz`. Binding caps: **max 2 concurrent agent runs; all LLM calls behind the gateway semaphore; sim ticker has a tick-deadline watchdog.**
- **LLM access only through `modules/llm` gateway.** No provider SDK imports anywhere else — this keeps 4 providers swappable and the zero-key boot rule enforceable.
- Determinism: no wall-clock or unseeded randomness in simulation logic — tick counters and the seeded RNG only.
- Logging: structlog JSON only; every line carries `request_id` or `run_id`; log at entry/exit/branch of significant codepaths. No `print`.
- Config via pydantic-settings; secrets in env only — never committed, never logged.

## 5. TypeScript standards

- `strict: true`, `noUncheckedIndexedAccess` on. **No `any`** — use `unknown` + narrowing; a justified exception carries a comment and a linked issue. No `@ts-ignore`/`@ts-expect-error` without an issue link.
- All server communication through the **generated OpenAPI client** in `lib/api` — hand-written `fetch` calls to `/api/v1` are forbidden (the contract seam). WS message payloads use types generated/shared from `packages/contracts`.
- Discriminated unions for state (`{status:"loading"} | {status:"error", trace_id} | …`) over boolean soup.
- ESLint + Prettier clean at commit; import order: external → internal alias → relative; no deep relative chains (`../../..`) — use path aliases.

## 6. State management rules

- **The binding rule:** anything the server owns and the UI reads → **TanStack Query**; anything that streams or is UI-local → **Zustand**. Never both for the same data — every piece of state has exactly one owner.
- The five stores: `twinStore` (graph + health), `liveStore` (metric ring buffers), `agentStore` (activity feed), `notifyStore`, `uiStore` (panels, palette, selection). New stores require an ADR.
- WS events either **patch a store** (high-frequency telemetry) or **invalidate a query** (low-frequency domain events like "incident resolved") — dispatch mapping lives in one place (`lib/realtime/dispatch.ts`).
- No derived state stored: compute in selectors. No business logic in stores — stores hold data + trivial mutations; logic lives in feature hooks/services.
- Server mutations go through Query mutations with invalidation; optimistic updates only where the UX needs them (mark-read, panel toggles).

## 7. API design conventions

- Versioned base path `/api/v1`; resource-oriented plural nouns; nesting max one level (`/incidents/{id}/timeline`); actions as sub-resources (`/incidents/{id}/actions/{aid}`).
- **Errors:** RFC-7807-style `{code, message, details, trace_id}` — the `trace_id` always resolvable in logs. Named error codes, no bare 500s.
- **Pagination:** cursor-based everywhere a list can grow (`?cursor=&limit=`); default + max limits enforced.
- **State-changing endpoints:** idempotency keys accepted, RBAC-checked in the service layer (viewer / engineer / admin), workspace-scoped always, audit-logged (`/simulation/inject`, incident actions, settings).
- Rate limiting (Valkey) on auth, inject, chat, search. Input validation via Pydantic at every boundary — reject loudly, never coerce silently.
- OpenAPI is the contract: schema export + TS client generation run in CI; drift fails the build. Breaking changes bump the path version — additive changes preferred.
- Realtime protocol: envelope `{topic, seq, ts, type: snapshot|delta|event, payload}` with schema version `v:1`; SSE for LLM token streams; WS for multiplexed subscriptions.

## 8. Git commit conventions

- **Conventional Commits:** `feat: / fix: / refactor: / docs: / test: / chore: / perf:`, imperative mood, scope when useful — `feat(twin): cascade edge animation`. Small, single-purpose commits; no 40-file dumps.
- **⚠ Rebase rule (mandatory, no exceptions): before EVERY commit and push, `git fetch origin` then `git rebase origin/main`** (or the branch's base, e.g. `origin/dev`). Resolve conflicts locally, then push. Never push a stale branch; never merge-commit noise into feature branches.
- Branches off `main`: `feat/…`, `fix/…`, `docs/…`; PRs describe what/why and link the roadmap phase. `main` is always green and never force-pushed.
- Every PR passes CI: ruff + eslint · pyright + `tsc --noEmit` · pytest + vitest · build · contract generation.
- A change that invalidates any doc updates that doc **in the same commit/PR** — stale docs are bugs.

## 9. Testing strategy

Pyramid: many unit · fewer integration · exactly 3 Playwright journeys (golden path, copilot navigate, knowledge search). **CI never calls a live LLM** — recorded cassettes; the RCA golden-truth eval runs on demand/nightly.

Non-negotiable suites (details in the test plan, ARCHITECTURE §11):

| Suite | Guards |
|---|---|
| Sim determinism goldens (same seed ⇒ identical frames) | replay, demos, every downstream test |
| Detector precision (8 scenarios in SLA; 0 false positives on baseline) | alert-noise trust story |
| Incident state machine (legal + rejected transitions) | lifecycle integrity |
| Gateway contract tests per provider (cassettes) + fallback walk + any-single-provider boot | the 4-provider + $0 decisions |
| RCA golden-truth eval (≥7/8 root causes correct, ≥1 valid citation each) | the product's central claim |
| WS property tests (seq-gap ⇒ re-snapshot; coalescing bounds) | realtime correctness |
| Replay = live equality | event-sourcing integrity |

Rules: new non-trivial logic ships with the smallest test that fails if it breaks — in the same PR. Failure paths get tests, not just happy paths (nil / empty / upstream-error per new data flow). Banned from CI: wall-clock dependence, live network, ordering dependence, unseeded randomness. Flaky test = P1 bug.

## 10. Documentation requirements

- **Docs are code.** README, ARCHITECTURE, ROADMAP, TECH_STACK, and this file stay true in the same PR that changes behavior.
- **ADRs** (`docs/adr/NNN-title.md`: context → decision → consequences) for every architectural decision — new store, new dependency, boundary change, protocol change. New dependencies also pass the four-question $0 audit in [TECH_STACK.md](TECH_STACK.md).
- Module docstrings carry ASCII diagrams for non-obvious flows (state machines, pipelines) — maintained with the code; a stale diagram is a bug.
- Comments state constraints the code can't show (invariants, ceilings, seams) — not narration. Deliberate shortcuts name the ceiling and upgrade path: `# ceiling: global semaphore; per-provider pools if throughput matters`.
- New failure modes ship with their error-registry row (module docstring table: failure → exception → rescue → user sees).
- Public-facing docs (README) never overstate status — aspirational sections are labeled as targets.

## 11. Error doctrine (cross-cutting, binding)

- **No silent failures.** Every error has a name (specific exception classes); `except Exception` only at task/request top level, where it logs full context (what, with which args, for which request/run) and converts to a typed error.
- Every rescued error does exactly one of: retry with backoff · degrade gracefully with a user-visible state · re-raise with context. Swallow-and-continue is a defect.
- **LLM policy:** structured-output failure ⇒ one schema-retry → fallback provider → honest degrade ("analysis unavailable", raw evidence shown). **Never fabricate analysis.** Refusals and malformed output are distinct, logged failure modes.

## 12. Security floor (cross-cutting, binding — never simplified away)

Input validation at every trust boundary · authorization in the service layer with workspace scoping (no cross-workspace object references) · httpOnly SameSite cookies, no tokens in localStorage · idempotency + audit logs on state-changing endpoints · prompt-injection posture (retrieved text is data, never instructions; copilot tools read-only; `navigate` executes client-side only) · no PII in logs · dependencies pinned, licenses + $0 audit checked before adoption.
