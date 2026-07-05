<div align="center">

# TwinOps AI

**Enterprise Infrastructure That Thinks Before It Breaks**

*A real-time Digital Twin of enterprise infrastructure with explainable, multi-agent AI operations — detection, root-cause analysis, prediction, and remediation guidance with evidence you can audit.*

`Status: 🚧 In development — Phase 0 (Foundation)` · [Roadmap](DEVELOPMENT_ROADMAP.md)

</div>

---

## What it is

Monitoring tools answer *"what happened?"*. TwinOps AI answers **why it happened, what happens next, what's affected, and what to do** — and shows its work.

- **Live Digital Twin** — an interactive dependency graph of servers, databases, APIs, queues, and services; every node health-tinted in real time, failures visibly cascading along dependency edges.
- **Explainable AI incident pipeline** — six cooperating agents (monitoring → investigation → knowledge → prediction → recommendation → reporting) produce a root cause with **evidence-weighted confidence**, cited runbooks, recommended actions, and an ETA. The confidence number is *computed from evidence, never hallucinated*.
- **Deterministic simulation engine** — a seeded, replayable simulation of a realistic enterprise topology (30–200 nodes) with 8 scripted failure scenarios drives the entire product. Same seed + same scenario = identical run: that one property powers reproducible demos, incident replay, and honest tests.
- **Knowledge Hub (RAG)** — runbooks and past incidents retrieved with citations; a global natural-language search ("why is payment slow?") that answers across metrics, incidents, and docs.

## The demo moment

> Open the twin → inject a database connection-pool failure → watch the cascade ripple across the graph in amber and crimson → agents investigate live in a visible event stream → the AI names the root cause with 90%+ evidence-backed confidence and cites the runbook that fixes it → apply the action → watch recovery to emerald.

## Architecture at a glance

```
 Next.js 15 (Vercel/local) ── REST + WebSocket/SSE ── FastAPI modular monolith (Docker)
   twin canvas · incident        snapshot + delta        twin · incidents · agents(LangGraph)
   workspace · copilot                                   knowledge(RAG) · simulation · telemetry
                                                              │ Redis(Valkey) event bus
                                              PostgreSQL · ChromaDB(embedded) · Ollama/Gemini/Claude/OpenAI
```

Deterministic core, LLMs at the edges. Full design, diagrams, and every decision's rationale: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Runs for $0

The entire MVP builds and runs free, offline, on one laptop — `docker compose up` brings up Postgres, Valkey, and Ollama; no paid API key is ever required to boot (paid providers activate automatically when a key exists). Details: [TECH_STACK.md](TECH_STACK.md).

**Planned developer experience (Phase 0 target):**

```bash
git clone https://github.com/manas-vamsi/TwinOps-AI && cd TwinOps-AI
docker compose up -d        # postgres + valkey + ollama (small model auto-pulled)
pnpm install && pnpm dev    # web on :3000, api on :8000 — zero API keys needed
```

## Documentation

| Doc | What it owns |
|---|---|
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Why this exists, who it's for, brand & UX principles |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The complete system design — the single source of truth |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Phases P0–P5 with demoable exit criteria |
| [TECH_STACK.md](TECH_STACK.md) | Every technology, why it was chosen, what it costs ($0), when to revisit |
| [CODING_STANDARDS.md](CODING_STANDARDS.md) | The rules the codebase follows |

## Design language

Pure black + charcoal surfaces, luxury gold accents, emerald for healthy, crimson for critical. Manrope + Space Grotesk. Inspired by Linear, Vercel, and Stripe — not Grafana. The interface should feel like an operating system for infrastructure, and everything should feel expensive.

---

<div align="center"><sub>Built by <a href="https://github.com/manas-vamsi">Sanjay</a> · TwinOps AI · Intelligent · Predictive · Reliable</sub></div>
