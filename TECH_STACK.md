# TwinOps AI — Tech Stack

Every technology, why it won, what it costs, and when to revisit. Binding constraint: **$0 MVP** — every entry passed a four-question audit (completely free? · generous free tier? · pays later? · OSS alternative?). No paid API or service is ever required to build, run, or demo.

## Frontend

| Tech | Role | Why | License / cost |
|---|---|---|---|
| Next.js 15 (App Router) + React 19 | Framework | Spec choice; server shell + client-heavy realtime app | MIT · free |
| TypeScript (strict) | Language | Contract safety end to end | Apache-2.0 · free |
| Tailwind CSS 4 + shadcn/ui | Styling / components | Token-layer theming gives the premium brand without fighting a component kit | MIT · free (paid add-ons unused) |
| Framer Motion | Micro-interactions | Spec choice; presets centralized in `motion.ts` | MIT · free |
| React Flow + elkjs | Twin canvas + auto-layout | Best-in-class interactive graph; elkjs layered layout in a web worker | MIT / EPL-2.0 · free (RF "Pro" = support sub, unused) |
| Zustand | Live/UI state | Spec choice; small, unopinionated | MIT · free |
| TanStack Query | Server state | Caching/invalidation is a solved problem — hand-rolling it in Zustand is the bug factory | MIT · free |
| Manrope + Space Grotesk | Type | Brand fonts, bundled via `next/font` (no external calls) | OFL · free |

## Backend

| Tech | Role | Why | License / cost |
|---|---|---|---|
| Python 3.12 + FastAPI | API framework | Fully async, native WS + SSE, Pydantic contracts → OpenAPI | MIT · free |
| SQLAlchemy 2 + Alembic | ORM + migrations | Async, boring, reliable | MIT · free |
| Pydantic v2 | Boundary schemas | Single source of truth for contracts | MIT · free |
| PostgreSQL | System of record | One relational store; JSONB + day-partitioned rollups instead of a TSDB | PostgreSQL license · free |
| **Valkey** | Event bus · cache · rate limits · WS backplane | BSD-3 Redis fork — wire-compatible, removes the Redis licensing question | BSD-3 · free |
| networkx | In-memory twin graph | Fast traversal for blast radius/cascades; rebuilt from PG on boot | BSD · free |
| structlog | Logging | JSON logs with request IDs | MIT/Apache · free |

## AI

| Tech | Role | Why | License / cost |
|---|---|---|---|
| LangChain | Provider abstraction inside the gateway | One integration style for 4 providers + normalized structured output | MIT · free (LangSmith unused, tracing disabled) |
| LangGraph | Agent orchestration | The incident pipeline state graph; marquee multi-agent architecture | MIT · free (Platform unused) |
| LlamaIndex | RAG ingest + retrieval | Markdown reader, heading-aware parsing, Chroma integration, citations | MIT · free (LlamaCloud unused) |
| ChromaDB (embedded) | Vector store | Zero extra service; rebuildable cache, never source of truth | Apache-2.0 · free |
| fastembed (`bge-small-en`) | Embeddings | ONNX runtime ≈ ⅓ torch memory — fits 8 GB laptops and free-tier RAM; local, offline, deterministic | Apache-2.0 · free |
| **Ollama** | **Primary LLM (local)** | $0, offline, JSON-schema structured output; 3B model on 8 GB RAM, 7–8B on 16 GB | MIT · free |
| Gemini API | Free-tier cloud LLM | Only cloud default; AI Studio key, no card required | free tier (rate-limited) |
| Claude API / OpenAI API | Optional providers | Code-complete adapters; activate when a key exists — **never required** (boot rule) | paid — excluded from demo path |

## Infrastructure & tooling

| Tech | Role | Why | Cost |
|---|---|---|---|
| Docker Compose | Canonical runtime (postgres + valkey + ollama) | `docker compose up` IS the product runtime | free for individuals (Podman = OSS fallback) |
| pnpm workspaces | Monorepo | 2 apps don't need turborepo | free |
| GitHub + Actions | VCS + CI | Public repo = unlimited CI minutes | free |
| Vercel Hobby | Frontend hosting (Profile B) | Free for personal use; instant rollback | free (pays only if commercial) |
| HF Spaces / Render free + Neon PG | Optional free API hosting (Profile B) | Cold starts accepted; `BUS_MODE=inproc` removes hosted-bus need | free |
| ruff · pyright · eslint · tsc | Lint + types | CI gates | free |
| pytest · vitest · Playwright | Tests | See testing standards | free |
| openapi-typescript | Contract codegen | Pydantic → OpenAPI → TS client; drift = CI failure | free |
| Sentry (optional) | Error tracking | Free tier; default observability is self-contained logs | free tier |

## Runtime profiles

- **A — Local (canonical, $0, offline):** compose (postgres·valkey·ollama) + embedded Chroma + fastembed. Zero API keys.
- **B — Free cloud demo ($0):** Vercel Hobby + HF Spaces/Render free + Neon + `BUS_MODE=inproc` + Gemini free key. Cold starts accepted.
- **C — Paid upgrade (post-MVP, ≈$5/mo + usage):** always-on host + Claude/OpenAI keys → live 4-provider switching. Sanctioned exception: enable during active job-application window.

## Revisit triggers (when a choice should be re-examined)

| Choice | Revisit when |
|---|---|
| No TSDB (PG rollups + RAM buffers) | retention >7 days or real metric volume |
| Valkey pub/sub as bus (not Kafka/NATS) | multi-node ingest or durable replay needs |
| 200-node canvas cap (no WebGL) | real need for 1000+ visible nodes |
| Single-process asyncio (no worker) | API p95 degrades under agent load |
| fastembed small model | retrieval quality ceiling |
| Free hosting w/ cold starts | link is being shared with evaluators (→ Profile C) |
| Monolith itself | >1 team or independent scaling needs |
