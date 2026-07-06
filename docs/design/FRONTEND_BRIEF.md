# TwinOps AI — Frontend Design Brief & Codebase Context

Handoff document for design work. Everything a designer/design-AI needs to produce frontend designs and components that drop into this codebase without violating its rules.

---

## 1. What the product is

**TwinOps AI** — "Enterprise Infrastructure That Thinks Before It Breaks." A real-time **Digital Twin** of enterprise infrastructure: an interactive dependency graph of servers/APIs/databases where failures visibly cascade, plus explainable multi-agent AI that names the root cause with evidence-weighted confidence and cites the runbook that fixes it. Data comes from a deterministic simulation engine (no real infra needed; runs 100% free and offline).

**Purpose:** a portfolio product built to impress a hiring company. It must read as a **premium enterprise operating system** in a 3-minute skim — Linear / Vercel / Stripe Dashboard / Raycast caliber. It must NEVER look like Grafana, Kibana, or an admin template. Everything should feel expensive.

## 2. Brand system (binding — these exact values)

Fujitsu-aligned, theme-swappable. **Fujitsu Red `#E60012`** is the accent in both themes. **Light is the default** (Fujitsu's own white-and-red web look); dark is the premium alternative. Values live in `apps/web/src/styles/tokens.css` as `--c-*` vars mapped to Tailwind utilities (`bg-chrome`, `text-accent`, `border-hairline`) — utilities never change, only the values swap per theme:

```css
/* surfaces */          /* text */              /* brand accents */
accent: #e60012 (Fujitsu Red)   light: bg #eef1f5 / chrome #fff / text #0b0f14
                                dark:  bg #07090d / chrome #0b0f14 / text #f6f4eb
--color-charcoal:#0b0f14 --color-muted:#9aa4b2   --color-bronze: #b8860b
--color-surface:#11161d  --color-faint:#5d6774   --color-forest: #0f3d2e
--color-raised:#171e27                           --color-sage: #a7c49a
--color-hairline:#232c37                         --color-cream: #f6f4eb
                                                 --color-mauve: #a78bfa
/* semantic status */
--color-success:#10b981 (emerald=healthy) --color-info:#14d8c4 (teal)
--color-warn:#f59e0b (amber=degraded)     --color-critical:#b91c1c (crimson=failing)

/* shape */ --radius-lg:16px --radius-xl:20px --radius-2xl:24px
/* type */  --font-sans: Manrope   --font-display: Space Grotesk (headings/numerics)
```

Personality: premium, calm, intelligent, minimal, trustworthy. Light default + dark toggle (both first-class). Fujitsu Red is the accent (active states, focus rings, key numbers) — used with intent, kept OUT of the health graph. Emerald/amber/signal-red are reserved for **health semantics only** (signal-red is distinct from brand red so the two never collide). Glassmorphism and glow: sparing. Thin borders (`hairline`), soft shadows, large spacing, micro-interactions (motion presets: fade-rise 200ms, panel slide 240ms). No neon cyberpunk.

## 3. Tech stack & hard conventions

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4 (tokens via `@theme`) · lucide-react icons · cmdk (palette) · Zustand (live/UI state) · TanStack Query (server state, arrives P1) · React Flow + elkjs (twin canvas, arrives P1) · Framer Motion (arrives with first real animation).

**Binding rules any generated code must follow (DEVELOPMENT_RULES.md):**
- **Zero hex colors / font names / radii outside `tokens.css`** — Tailwind token utilities only.
- Named exports, one component per file, `interface XProps` for props. Files >200 lines get split.
- Feature-folder placement: `src/features/<name>/` (twin, incidents, agents, knowledge, analytics, copilot, search, dashboard); shared primitives in `src/components/ui/`; chrome in `src/components/shell/`.
- **Every data surface designs five states:** loading (skeleton shimmer, never spinners), empty (a designed moment), error (honest degrade card + trace id), success, partial.
- A11y floor: keyboard reachable, gold focus rings (already global), `aria-live` for notifications, `prefers-reduced-motion` honored (already global — cascade animations must degrade to static badges), AA contrast, touch targets ≥40px.
- Desktop-first (min 1280px for canvas pages); tablet = read-only dashboards; phones get an honest "open on desktop" gate on canvas pages.
- State ownership: server data → TanStack Query; streaming/UI-local → Zustand. Components never open sockets (a `RealtimeProvider` will own the single WS).
- No hand-written `fetch` — a generated, typed API client is used (`packages/contracts`).

## 4. What exists today (Phase 0, all green in CI)

```
apps/web/src/
├── app/
│   ├── layout.tsx                 # fonts (Manrope/Space Grotesk via next/font), metadata
│   ├── globals.css                # imports tokens; dark scheme; gold focus; reduced-motion
│   ├── page.tsx                   # redirects → /dashboard
│   └── (shell)/
│       ├── layout.tsx             # Sidebar + TopBar + main + CommandPalette
│       └── {dashboard,twin,incidents,agents,knowledge,infrastructure,analytics,settings}/page.tsx
│                                  # each renders PagePlaceholder (honest phase chip)
├── components/
│   ├── shell/
│   │   ├── navigation.ts          # NAV_ITEMS: label/href/lucide icon/phase/description for all 8
│   │   ├── Sidebar.tsx            # w-64, brand block (gold→bronze "T" mark), active = gold bar + raised bg
│   │   ├── TopBar.tsx             # h-14: search button (opens palette, Ctrl+K kbd), workspace chip,
│   │   │                          #   bell w/ gold dot, avatar "M" (forest→sage gradient)
│   │   └── CommandPalette.tsx     # cmdk dialog, Ctrl/⌘K, navigates the 8 surfaces
│   └── ui/PagePlaceholder.tsx     # dashed-border card: icon, title, description, phase chip
├── stores/uiStore.ts              # zustand: paletteOpen (one of five sanctioned stores)
├── lib/utils.ts                   # cn() = clsx + tailwind-merge
└── styles/tokens.css              # THE design values (section 2)
```

Backend today: FastAPI with `/healthz`, `/readyz`, X-Request-ID, structlog. Postgres + Valkey + Ollama via docker compose.

## 5. The 8 product surfaces (what each must become)

| Surface | Phase | Content |
|---|---|---|
| **Digital Twin** ⭐flagship | **P1 — design this first** | Interactive dependency graph (React Flow): 30–200 nodes (service/database/api/queue/load-balancer/cache/cloud kinds), health-tinted (emerald/amber/crimson with hysteresis — no flicker), edges show dependencies, degraded paths animate. Auto-layout (elkjs). LOD: labels hide below zoom 0.5. Click node → slide-in detail panel: health, live CPU/mem/latency/error sparklines, dependencies/dependents, recent changes, risks, (P2+) AI reasoning. Toolbar: inject-failure button (engineer role), fit/zoom, scenario picker. |
| Dashboard | P4 | Global health score, business impact, predicted failures, active agents, recent incidents, trends — live tiles, feels alive |
| Incidents | P2 | List + incident workspace: timeline, evidence, metrics, root cause card (confidence % + evidence list + citations), recommended actions, replay scrubber |
| AI Agents | P4 | Six agents as intelligent workers; live event stream of visible reasoning (agent, action, summary, tokens, ms) |
| Knowledge Hub | P3 | Semantic search over runbooks/docs/incidents; results always carry citations; doc viewer with section deep-links |
| Infrastructure | P4 | Searchable inventory of every simulated resource |
| Analytics | P4 | MTTD, MTTR, prediction accuracy, incident frequency, LLM cost panel |
| Settings | P5 | Workspace, roles, AI providers (configured/not-configured states), simulation seed display |

Every screen answers: *What is happening? Why? What happens next? What should I do?*

## 6. Realtime & API contracts the frontend consumes (P1)

- **Pattern (binding): snapshot + delta.** Page loads REST snapshot (`GET /api/v1/twin/graph` → nodes+edges+health+`topology_hash`), then applies WS deltas with sequence numbers; seq gap ⇒ re-snapshot. Reconnect = re-snapshot. Visible connection pill in the top bar.
- **WS envelope:** `{topic, seq, ts, type: "snapshot"|"delta"|"event", payload}`. Topics: `twin.health` (graph-wide, coalesced 1 Hz), `node.{id}.metrics` (only while a node panel is open), `incidents.stream`, `agents.activity`, `notify.{user}`.
- REST (P1 relevant): `/twin/graph`, `/twin/nodes/{id}`, `/twin/nodes/{id}/metrics?window=30m`, `POST /simulation/inject` (idempotency key).
- Node IDs are human-readable slugs: `svc-payment`, `db-orders-pg`, `q-order-events`.

## 7. Design priorities (in order)

1. **Twin canvas node design** — the product's face: 6 node kinds, health states, selected/hover states, compact vs zoomed-out (LOD) forms. Custom-designed, NOT default React Flow boxes.
2. **Node detail panel** — slide-in right panel, dense but calm; sparklines; sectioned (status → metrics → relationships → AI, with AI section showing a designed "arrives P2" state).
3. **Inject/scenario UX** — how a demo driver triggers a failure elegantly.
4. **Connection status + live-ness cues** — the app must feel alive without being noisy.
5. Dashboard tiles, incident workspace, agent stream (later phases — concepts welcome, canvas first).

## 8. Constraints for any generated design/code

- Use ONLY the token palette (section 2). Health colors mean health — never decoration.
- Output should be React + Tailwind (token utilities), TypeScript strict, named exports — or plain design specs/mockups; both fine.
- No new npm dependencies without flagging them (each must pass a free/OSS audit).
- No fake data patterns that hide states — design the loading/empty/error states explicitly.
- Honest by design: nothing pretends to work before its phase; placeholders are designed moments.
