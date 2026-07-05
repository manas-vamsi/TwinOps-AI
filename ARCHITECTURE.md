# TwinOps AI — Architecture

**Status:** Approved v1.0 (2026-07-06) · reviewed via multi-phase plan review (CEO / design / eng / DX) · This document is the single source of truth for system design. Changes go through an ADR in `docs/adr/`.

---

## 0. Architecture principles

1. **Simulation is a first-class product component.** There is no real infrastructure to monitor; a deterministic simulation engine is the data source, hidden behind the same contract a real collector would use (`TelemetrySource`). Real integrations (Prometheus, CloudWatch, K8s) plug into that seam later without touching anything downstream.
2. **Modular monolith, service-shaped seams.** One deployable FastAPI app with strict internal module boundaries. Modules that could become services (simulation, agents, telemetry) communicate through the event bus and interface contracts today, so extraction is a deploy change, not a rewrite.
3. **Deterministic core, LLM at the edges.** Detection, cascade propagation, confidence scoring, and prediction ETAs are rule/heuristic-driven and reproducible. LLMs explain, synthesize, and narrate. This is what makes "94% confidence" defensible instead of vibes.
4. **Snapshot + delta everywhere.** Every real-time surface loads a REST snapshot, then applies WS deltas with sequence numbers. Reconnect = re-snapshot. No client reconstructs state from a stream alone. (This also makes incident replay nearly free.)
5. **One source of truth for contracts.** Pydantic schemas → OpenAPI → generated TypeScript client. Frontend and backend cannot drift; drift is a CI failure.
6. **Spend quality where the eye lands.** The Digital Twin canvas, AI reasoning panel, and incident workspace get flagship polish. Admin-ish pages get shadcn defaults with brand tokens.
7. **$0 MVP is binding.** Local Docker is the canonical runtime; no paid API key is ever required to boot or demo (see §12).

## 1. System overview

```
                            ┌──────────────────────────────────────────┐
                            │                USER (SRE)                │
                            └────────────────┬─────────────────────────┘
                                             │ HTTPS / WSS
            ┌────────────────────────────────▼─────────────────────────────┐
            │              FRONTEND — Next.js 15 (Vercel Hobby / local)    │
            │   App shell · Twin canvas · Incident workspace · Copilot     │
            │   Zustand stores ◄── WS deltas      TanStack Query ◄── REST  │
            └──────────┬───────────────────────────────────┬───────────────┘
                       │ REST /api/v1                      │ WS /ws · SSE /chat
            ┌──────────▼───────────────────────────────────▼───────────────┐
            │          BACKEND — FastAPI modular monolith (Docker)         │
            │  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐    │
            │  │  twin  │ │incidents │ │ knowledge │ │ agents         │    │
            │  │ graph+ │ │ detector+│ │ RAG       │ │ (LangGraph)    │    │
            │  │ health │ │ lifecycle│ │ ingest/ret│ │ pipeline       │    │
            │  └───┬────┘ └────┬─────┘ └─────┬─────┘ └───────┬────────┘    │
            │  ┌───▼───────────▼─────────────▼───────────────▼─────────┐   │
            │  │       internal event bus (Valkey pub/sub | in-proc)   │   │
            │  └───▲───────────▲──────────────────────────────▲────────┘   │
            │  ┌───┴─────┐ ┌───┴──────┐ ┌──────────┐ ┌────────┴───────┐    │
            │  │simulation│ │telemetry │ │ realtime │ │ llm gateway    │    │
            │  │ engine   │ │ buffers+ │ │ WS conn  │ │ ollama·gemini· │    │
            │  │ (asyncio)│ │ rollups  │ │ manager  │ │ claude·openai  │    │
            │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘    │
            └──────┬─────────────┬──────────────┬───────────────┬──────────┘
             ┌─────▼─────┐ ┌─────▼─────┐ ┌──────▼─────┐ ┌───────▼──────┐
             │ PostgreSQL│ │  Valkey   │ │  ChromaDB  │ │ LLM providers│
             │ system of │ │ pub/sub · │ │ (embedded) │ │ (Ollama 1st, │
             │ record    │ │ cache     │ │ vectors    │ │  ×4 routed)  │
             └───────────┘ └───────────┘ └────────────┘ └──────────────┘
```

One frontend, one backend deployable, three stores, one external dependency class. Small enough for one builder to operate; seamed enough to grow. Cross-module *events* go over the bus; modules never import each other's internals.

## 2. Frontend architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 + shadcn/ui · Framer Motion · React Flow + elkjs · Zustand + TanStack Query · generated OpenAPI client.

**Rendering:** the authenticated app is one client-heavy shell. Server components render shell chrome + bootstrap payloads; everything interactive is client components. Route groups: `(auth)`, `(shell)` for the eight product pages.

**State model (binding rule):** anything the server owns and the UI reads → TanStack Query cache; anything that streams or is UI-local → Zustand.

```
  Server state (TanStack Query)          Client/live state (Zustand)
  ─────────────────────────────          ──────────────────────────────
  incidents list, node detail,           twinStore     graph nodes/edges + health
  KB docs, analytics KPIs,               liveStore     per-node metric ring buffers
  agent run history                      agentStore    live agent activity feed
       ▲                                 notifyStore   toasts + intelligent notifs
       │ REST snapshot                   uiStore       panels, palette, selection
  ┌────┴─────────┐   invalidate on            ▲ WS deltas (seq-checked)
  │ api client   │◄── low-freq WS events ┌────┴──────────────────────┐
  └──────────────┘                       │ RealtimeProvider (one WS) │
                                         │ subscribe/dispatch/retry  │
                                         └───────────────────────────┘
```

**Realtime client:** one `RealtimeProvider` owns a single WebSocket — auth on connect, feature-scoped topic subscriptions (twin page → `twin.health`; open node panel → `node.{id}.metrics`), exponential backoff + jitter reconnect, sequence gap ⇒ REST re-snapshot, visible connection pill.

**Twin canvas (flagship):** custom React Flow nodes per component kind built from a shared `TwinNodeBase`; elkjs layered layout in a web worker, positions cached per `topology_hash`; health tints via CSS variables (no per-frame React re-render); level-of-detail rendering (labels hide below zoom 0.5); **≤200 rendered nodes**, cluster-collapse beyond (WebGL only if a real 1000-node need appears).

**Design system:** brand tokens live in exactly one place (`styles/tokens.css`): charcoal `#0B0F14`, slate `#11161D`, gold `#D4AF37`, emerald `#10B981`, teal `#14D8C4`, amber, crimson, cream `#F6F4EB`; radius 16–24px; Manrope + Space Grotesk via `next/font` (bundled, no external font calls). shadcn re-skinned once at the token layer. Motion presets (fade-rise 200ms, panel slide 240ms) exported from one `motion.ts`.

**States & accessibility (binding):** every surface defines loading (skeleton shimmer, not spinners), empty (designed moments — zero incidents = "all systems nominal" with gold accent), error (honest degrade cards), success, and partial states. `prefers-reduced-motion` honored (cascade animation degrades to static badges), `aria-live` for notifications, gold focus rings, keyboard: command palette + list navigation. Desktop-first; tablet read-only dashboards; phones get an honest "open on desktop" gate for canvas pages.

## 3. Backend architecture

**Stack:** Python 3.12 · FastAPI (fully async) · SQLAlchemy 2.0 async + Alembic · Pydantic v2 · networkx (in-memory twin graph) · structlog.

```
apps/api/src/twinops/
├── core/        config (pydantic-settings) · errors · security · logging · deps
├── db/          engine · base · alembic migrations
├── realtime/    WS endpoint · ConnectionManager · bus→WS bridge · topic ACL
├── modules/     (each: router.py · service.py · repo.py · schemas.py)
│   ├── twin/          graph service (networkx mirror of PG) · health engine
│   ├── simulation/    topology gen · metric gen · scenario engine · log gen · ticker
│   ├── telemetry/     ring buffers · 1m rollup task · history queries
│   ├── incidents/     anomaly detector · lifecycle state machine · timeline
│   ├── agents/        LangGraph pipeline · agent events · run registry
│   ├── knowledge/     corpus ingest (LlamaIndex) · retriever · citations
│   ├── llm/           gateway · LangChain provider adapters · cost meter
│   ├── search/        intent classifier · federated orchestrator
│   ├── chat/          copilot (tools + SSE) · navigation actions
│   ├── analytics/     MTTD/MTTR/accuracy/frequency · LLM cost panel
│   ├── notifications/ rule evaluator · feed
│   └── auth/          users · JWT (httpOnly cookie) · RBAC · workspace scoping
└── main.py      app factory · lifespan: boot graph, start ticker + rollups
```

**Boundary rules (binding):** routers never touch the DB (router → service → repository); modules import each other's *service interfaces* only; cross-module events go over the bus; every boundary object is a Pydantic schema.

**Background execution:** simulator ticker, rollup task, and agent pipelines are supervised asyncio tasks in the API process (correct for a single instance, not a shortcut). Each is crash-isolated with restart + backoff and surfaces health in `/readyz`. **Hardening (binding):** agent runs capped at 2 concurrent; all LLM calls behind a semaphore; ticker has a tick-deadline watchdog — a runaway agent pipeline must never starve the simulation loop. Extraction path: move `simulation/` + `agents/` behind the existing bus into a worker process when API p95 degrades under agent load.

**Incident lifecycle (deterministic state machine, timestamps per transition):**

```
 [DETECTED] ──► [INVESTIGATING] ──► [IDENTIFIED] ──► [MITIGATING] ──► [RESOLVED] ──► postmortem
      └──► [FALSE_POSITIVE]              ▲ sim recovery / applied action ┘
```

**Health engine (binding):** health = weighted worst-of(error_rate, latency_p95 vs baseline, saturation) **with hysteresis** — node colors must not flap on noise.

## 4. AI architecture

### 4.1 LLM gateway
`complete() / stream() / structured(schema)` behind one gateway. Four providers ship as LangChain integrations: **Ollama (primary — local, offline, JSON-schema structured output), Gemini (free-tier cloud default), Claude and OpenAI (optional — code-complete, activate when a key exists).** The gateway owns: routing config (default per environment, per-task overrides — cheap model for Reporter, strong model for RootCauseSynthesizer), fallback chain (primary → secondary → Ollama), retries + timeout budgets, Redis response cache (prompt-hash keyed), per-run per-provider token/cost metering persisted to `agent_runs`.

**Boot rule (binding):** the app boots with *any ≥1* configured provider; missing providers show "not configured" in Settings. Zero keys = Ollama-only = fully functional. **Failure policy (binding):** structured-output failure ⇒ one schema-retry → fallback provider → honest degrade ("analysis unavailable", raw evidence shown). Never fabricate. LangSmith/LangGraph-Platform/LlamaCloud telemetry disabled — no freemium SaaS silently required.

### 4.2 Incident pipeline (LangGraph)

```
 anomaly event
      ▼
 ContextBuilder   deterministic: metric windows, topology blast radius,
      ▼           recent changes, correlated sim logs. NO LLM.
 Investigator     LLM: 1–3 hypotheses over the evidence pack
      ▼
 Knowledge        RAG: similar incidents + runbooks, citations attached
      ▼
 RootCause        LLM structured: root_cause + rationale;
 Synthesizer      confidence = f(evidence weights) — rule-derived number
      ▼
 Recommender      LLM structured: actions[], eta_minutes, blast radius
      ▼
 Reporter         LLM: human summary → notification + timeline + postmortem
```

Every node emits `AgentEvent{run_id, agent, action, summary, tokens, ms}` → persisted + streamed to `agents.activity`. **The "visible agent communication" page is a renderer over this event stream** — not a separate system. Spec's six agents map: Monitoring = detector (deterministic), Investigation = ContextBuilder + Investigator, Knowledge = Knowledge node, Prediction = trend engine (§4.4), Recommendation = Synthesizer + Recommender, Reporting = Reporter.

### 4.3 RAG
Corpus in `data/corpus/` (~30 authored runbooks, architecture notes, incident writeups — versioned in git). Ingest: LlamaIndex markdown reader + heading-aware node parser (300–500 tokens, overlap 50) → local `bge-small-en` embeddings via **fastembed** (ONNX — free, offline, deterministic, ~⅓ torch memory) → embedded ChromaDB collections (`kb_chunks`, `incident_summaries`) with `{doc_id, type, title, section}` metadata. Retrieve: top-k=8 + metadata filter → optional LLM re-rank → every answer carries `citations[]` (doc + section + deep link). Chroma is a **rebuildable cache**, never source of truth: rebuilt from corpus + PG checksums on boot (ephemeral-disk safe).

### 4.4 Prediction
EWMA slope + threshold-crossing ETA per key metric → `predicted_failure{node, metric, eta, confidence}` events; the Prediction agent narrates. Honestly labeled heuristics with a seam for real models later.

### 4.5 Copilot
Tool-calling loop over the gateway: `get_node_health`, `query_incidents`, `search_knowledge`, `get_kpis`, `navigate(page, params)` — `navigate` returns a UI command the frontend executes (that's the whole "assistant drives the app" feature). SSE streaming. Prompt-injection posture: retrieved text is data, never instructions; tools are read-only; navigation is client-side.

## 5. Simulation engine

```
 TopologyGenerator ─► MetricEngine ─► ScenarioEngine ─► LogGenerator ─► Ticker (1–2s)
  seeded archetype     diurnal sine +   YAML scenario DSL:  stage-correlated  └─► TelemetryFrame /
  templates            weekly pattern + stages[{at,target,   templated log        TopologyDelta /
  (e-commerce stack;   AR(1) noise +    effect,magnitude,    lines                LogBatch
  S/M/L = 30/80/200    transfer fns     ramp}] · cascade =                        → event bus
  nodes)               (cpu↑⇒lat↑⇒err↑) BFS over dep edges
                                        w/ impact·delay·attenuation
```

- **Deterministic:** seeded RNG (`SIM_SEED` env, logged at boot, shown in Settings). Same seed + scenario = identical run → reproducible demos, incident replay, and detector tests. No wall-clock in sim logic (tick counter only).
- **Scenario library v1 (8):** db connection-pool exhaustion · memory leak → OOM · cache stampede · queue backlog · cert expiry · deploy regression · disk fill · network partition. Each defines cascade edges and a recovery behavior (auto-heal timer or responds-to-action).
- **Triggers:** manual (UI inject — RBAC'd, idempotency-keyed, audit-logged), scheduled/random ambient mode, scripted golden-path demo sequence.
- The detector consumes the same bus stream as the UI — nothing downstream is pre-labeled. `TelemetrySource` is the seam where real collectors plug in later.
- **What-if mode (P4):** click any healthy node → preview blast radius using the same cascade engine, without injecting the failure.

## 6. Data flows

```
A · telemetry (~1 Hz): sim ─► bus ─┬─► RAM ring buffers ─► 1m rollups ─► PG
                                   ├─► health engine ─► bus (twin.health) ─► WS ─► twinStore
                                   └─► anomaly detector (rules over sliding windows)

B · incident: detector ─► incidents svc (DETECTED) ─► bus ─► WS toast + dashboard
                  └─► agents svc: LangGraph run (async, capped)
                        ├─ each node ─► AgentEvent ─► PG + bus ─► WS (live feed, timeline)
                        └─ final ─► recommendation ─► IDENTIFIED ─► notification rules

C · search/chat: query ─► intent {entity|incident|knowledge|metric}
                  ├─► twin svc (graph) ├─► PG (incidents, rollups) └─► Chroma top-k
                  └─► LLM synthesis w/ citations ─► one unified answer (+ deep links)

D · replay: PG timeline + rollups re-emitted at ×N speed on isolated replay.{session}.*
            topics — never the live topics — through the same WS machinery
```

## 7. Data model (high level)

**PostgreSQL (system of record):**
```
workspaces ─┬─ users (role: admin | engineer | viewer)
            ├─ nodes (kind, name, attrs JSONB) ─┐ twin topology
            ├─ edges (src, dst, kind, impact) ──┘
            ├─ metric_rollups (node_id, ts, cpu/mem/lat_p95/err) — 1-min aggregates,
            │     day-partitioned FROM THE FIRST MIGRATION, 7-day retention
            ├─ incidents (severity, status, root_cause, confidence, started/resolved_at, seed_ref)
            │     └─ incident_events (ts, kind, actor, payload)      ← timeline & replay
            ├─ agent_runs (trigger, status, tokens, cost, duration)
            │     └─ agent_events (agent, action, summary, payload)
            ├─ recommendations (root_cause, confidence, evidence JSONB, actions JSONB, eta)
            ├─ documents (type, title, path, checksum)               ← KB registry
            ├─ notifications (kind, title, body, read_at)
            └─ audit_log (user, action, target, meta)
```
Hot metrics (last ~30 min @ 1–2s) live in in-process ring buffers, not PG. No TSDB at MVP (revisit: retention >7 days or real integrations).

**ChromaDB (embedded):** `kb_chunks`, `incident_summaries` — rebuildable from corpus + PG at any time.
**Valkey:** bus channels (`telemetry.*`, `twin.*`, `incidents.*`, `agents.*`, `notify.*`, `replay.*`) · LLM response cache · rate-limit counters · WS session registry.

**Identifiers (binding):** node IDs are stable human-readable slugs (`svc-payment`, `db-orders-pg`); `topology_hash` = sha256 of sorted node+edge ids (drives layout caching).

## 8. API

REST `/api/v1`, resource-oriented; OpenAPI auto-generated → TS client generated in CI (drift = build failure).

```
GET  /twin/graph                      snapshot: nodes+edges+health (+topology_hash)
GET  /twin/nodes/{id}                 attrs, deps, dependents, risks, changes
GET  /twin/nodes/{id}/metrics         ?window=30m&res=raw|1m
GET  /twin/nodes/{id}/context         AI panel: predictions, history, docs, actions
GET/POST /incidents                   cursor-paginated list / manual create
GET  /incidents/{id} · /timeline      workspace payload · replayable events
POST /incidents/{id}/actions/{aid}    apply recommended action (sim reacts)
GET  /agents/runs · /runs/{id}/events
GET  /knowledge/search?q= · /docs/{id}
GET  /search?q=                       unified NL search (federated)
POST /chat                            SSE stream (copilot)
GET  /analytics/kpis?window=
GET/POST /simulation/scenarios · POST /simulation/inject   (engineer/admin RBAC,
                                      idempotency key, hard rate limit, audit-logged)
GET  /notifications · POST /notifications/{id}/read
POST /auth/login · /auth/logout · GET /auth/me
WS   /ws
```

Conventions (binding): errors are RFC-7807-style `{code, message, details, trace_id}`; `X-Request-ID` everywhere; cursor pagination; rate limiting via Valkey; JWT in httpOnly SameSite cookie; RBAC enforced in the service layer; every input Pydantic-validated (trust boundary — never relaxed).

## 9. Real-time

**Transport split:** WebSocket for multiplexed telemetry/events; **SSE** for LLM token streams.

```
client → {op:"subscribe"|"unsubscribe", topics:["twin.health","node.n42.metrics"]}
server → {topic, seq, ts, type:"snapshot"|"delta"|"event", payload}   (schema v:1)
```

Server: ConnectionManager (cookie auth at upgrade, workspace-scoped topic ACL, 30s heartbeat) + one bus→WS bridge task. **Backpressure:** telemetry coalesced latest-wins at 1 Hz per topic; per-node raw streams only for open panels; slow consumers drop frames, never buffer unbounded. Client: single connection, re-snapshot on seq gap, visible status. Valkey backplane means N instances already work; `BUS_MODE=inproc` removes the external bus for single-instance free hosting.

## 10. Repository layout

```
twinops-ai/
├── apps/
│   ├── web/                          # Next.js (see §2 structure)
│   │   └── src/{app, components/{ui,shell}, features/{twin,incidents,agents,
│   │        knowledge,analytics,copilot,search,dashboard}, lib/{api,realtime},
│   │        stores, styles}
│   └── api/                          # FastAPI (see §3 structure)
├── packages/contracts/               # exported OpenAPI json + generated TS client
├── data/
│   ├── corpus/                       # RAG source docs (runbooks, playbooks…)
│   └── scenarios/                    # failure scenario YAML
├── infra/docker-compose.yml          # postgres + valkey + ollama
├── docs/{adr/, assets/}              # ADR-001… · brand assets
└── .github/workflows/ci.yml          # lint · typecheck · test · build · contract-gen
```

## 11. Cross-cutting quality bar

- **Observability:** structlog JSON with request IDs; `/healthz` + `/readyz` (incl. ticker health); metrics: tick-lag, provider error rates, WS client count, detector fires, agent run duration/tokens; Sentry optional (default = self-contained logs).
- **Error doctrine:** every failure mode has a named exception, a rescue action, and a user-visible state — see the Error & Rescue registry pattern in [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md). No silent failures.
- **Performance budgets:** shell TTI <2.5s · 60fps canvas @200 nodes · WS apply <16ms · non-LLM API p95 <150ms.
- **Testing:** sim determinism goldens, detector precision (8 scenarios, zero false positives on baseline), state-machine transitions, per-provider structured-output contract tests (recorded cassettes — CI never calls live LLMs), RCA golden-truth eval (≥7/8 scenarios), RAG citation integrity, WS seq/re-snapshot property tests, replay=live equality, 3 Playwright journeys.
- **Rollback posture:** Vercel instant rollback; API = previous image; Alembic downgrade per migration.

## 12. $0 runtime profiles (binding constraint, 2026-07-06)

```
PROFILE A — local (canonical, $0, offline-capable):
  docker compose up → postgres · valkey · ollama (small model auto-pulled)
  api in-process: chroma embedded · fastembed ONNX · BUS_MODE=redis(valkey)
  Zero API keys required. Hardware floor: 8 GB RAM (3B model) / 16 GB (7–8B).

PROFILE B — free cloud demo (optional, $0):
  Vercel Hobby (web) · HF Spaces or Render free (api; cold starts accepted)
  Neon free PG · BUS_MODE=inproc (no hosted bus) · Gemini free-tier key

PROFILE C — paid upgrade (post-MVP, ≈$5/mo + usage):
  Always-on host · Claude/OpenAI keys → live 4-provider switching
```

## 13. Explicitly NOT in scope (v1)

Real infrastructure integrations (the seam exists; adapters don't) · SSO/SAML/SCIM · multi-tenancy beyond one seeded workspace · mobile · executing remediation against real systems (actions affect the sim only) · trained ML predictors · Kafka-grade durable replay · TSDB · multi-region/HA · billing.

## 14. Top risks & mitigations

| # | Risk | Mitigation |
|---|------|------------|
| R1 | Sim believability | transfer-function metrics + correlated logs + golden scenarios |
| R2 | Scope gravity across 8 surfaces | phase exits are demo statements; P4 is the designated cut line |
| R3 | LLM latency/cost, ×4 providers | routing pins one provider per env; fallback chain; response cache; cassette tests; F10 boot rule |
| R4 | React Flow performance | 200-node cap + LOD + worker layout + cluster-collapse |
| R5 | One-process coupling | watchdogs + agent cap + semaphore; bus seams; named extraction path |
| R6 | Free-tier limits (cold starts, RAM) | local Docker is the canonical demo; fastembed; Profile B documented as best-effort |
