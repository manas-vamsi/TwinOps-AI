# TwinOps AI — Development Roadmap

Six phases. Every phase ends with a **demoable exit criterion** (a sentence you can show, not a task you claim), its Playwright journey green, and its ADRs written. Weeks are calendar-shaped guides for a solo builder with AI tooling, not deadlines.

**Strategy: shareable at every phase boundary.** After P2, a "P5-lite" pass (README GIF, 2-minute video, deployed demo) makes the project presentable *early* — later phases improve what's already shareable, so there is never a moment where the repo is half-built with nothing to show.

| Phase | Weeks | Builds | Exit criterion |
|-------|-------|--------|----------------|
| **P0 · Foundation** | 1 | Monorepo (pnpm workspaces), design tokens from the brand system, app shell (sidebar · top bar · command palette), FastAPI skeleton + `/healthz`, docker-compose (postgres + valkey + ollama), CI (lint · typecheck · test · build · contract-gen) | `docker compose up` + `pnpm dev` = branded shell running locally; CI green; optional Vercel Hobby preview |
| **P1 · Twin + Simulation** | 2–3 | Simulation engine (topology generator, metric engine, 2 scenarios, log generator, ticker), event bus, WS pipeline (snapshot + delta + seq), twin canvas with custom nodes + elkjs layout, node detail panel | Inject a DB failure → cascade visibly propagates across the graph in <2s |
| **P2 · Incidents + RCA** | 4–5 | Anomaly detector, incident lifecycle state machine, LLM gateway (all 4 adapters, routing + fallback, F10 boot rule), LangGraph pipeline, AI reasoning panel (cause · confidence · evidence · actions), incident workspace + timeline | Full incident story end to end: detect → investigate (visible agent events) → explain → recommend → resolve; provider switch works live |
| **⭐ P2.5 · Shareable checkpoint** | — | README cascade GIF, 2-minute demo video, free-profile deploy, resume bullets | A hiring manager clicking the repo link in the next 60 seconds sees a working, impressive product |
| **P3 · Knowledge + Search** | 6 | Corpus (~30 authored runbooks/docs), LlamaIndex ingest → ChromaDB, Knowledge Hub UI with citations, unified NL search | The RCA cites the runbook that fixes it; "why is payment slow?" returns one cited answer |
| **P4 · Breadth** | 7–8 | Live dashboard, agents workspace (event-stream renderer), analytics KPIs + LLM cost panel, notifications, copilot with app navigation, remaining 6 scenarios, incident replay, **what-if blast-radius preview**, postmortem export, demo-mode button | Every nav item is real; the copilot navigates the app; clicking a healthy node previews its blast radius |
| **P5 · Ship** | 9 | Auth + RBAC, hardening pass, golden-path demo script, seed data, docs polish, demo video refresh, optional free-cloud profile deploy | Cold clone → running demo in <10 minutes **with zero API keys and $0 spent**; the scripted 3-minute demo lands every beat |

## Definition of done (every phase)

- Exit criterion demonstrated, not asserted
- Phase's Playwright journey green in CI; unit/integration tests for new logic (see testing strategy in [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md#9-testing-strategy))
- No silent failures introduced (error registry updated)
- ADR written for any architectural decision made in the phase (`docs/adr/`)
- Docs in this repo still true (stale docs = a bug)

## Deferred backlog (explicitly out, recorded so "later" exists)

| Item | Why deferred | Trigger to revisit |
|---|---|---|
| Scenario editor UI | YAML DSL covers authoring | Users beyond the builder author scenarios |
| Keyboard-first nav (j/k, /) | Polish outside core radius | Post-P5 polish pass |
| First-run product tour | Golden-path demo covers narration | First external users |
| Real collector adapters (Prometheus/K8s/CloudWatch) | `TelemetrySource` seam exists | First real-infra pilot |
| SSO/SAML, multi-tenancy | Enterprise auth is post-MVP | First enterprise conversation |
| Trained ML predictors | Heuristics with a seam are honest at MVP | Enough recorded incident data |
| Worker-process extraction (sim/agents) | Single instance is correct today | API p95 degrades under agent load |
| Paid always-on hosting (~$5/mo) | $0 constraint during build | The week the link goes into applications |
