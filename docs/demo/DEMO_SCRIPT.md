# TwinOps AI — Demo Kit

Everything needed to record the README GIF and the 2-minute walkthrough video.
The demo is deterministic (fixed sim seed), so every take looks the same.

## Before you record

Start both servers (the twin needs no API keys and no Ollama):

```powershell
# terminal 1 — backend
cd D:\TwinOps-AI\apps\api ; uv run uvicorn twinops.main:app --reload
# terminal 2 — frontend
cd D:\TwinOps-AI ; pnpm dev
```

Open **http://localhost:3000** in a clean browser window (hide bookmarks bar,
1440×900 or larger). Light theme is the default — good for the README.

---

## Part A — the README GIF (~7 seconds, the money shot)

This is the single most valuable asset. Keep it short and looping.

1. Go to **Digital Twin**. Wait until the graph is calm (all nodes healthy).
2. Start recording the canvas area only.
3. Click **Inject failure → "DB connection pool exhaustion."**
4. Record ~6–7 seconds as the cascade ripples: Orders Postgres turns crimson,
   then Orders → Checkout → Gateway turn amber/red along the edges.
5. Stop. Trim to the moment just before the click through the full cascade.

**Record it (Windows, free):**
- Install **ScreenToGif** (`winget install NickeManarin.ScreenToGif`).
- Use its **Recorder**, frame the canvas, capture the 7s, then **Save as GIF**
  (max width ~900px, 15 fps keeps it small).
- Save to **`docs/assets/demo.gif`** — the README already points there.

Target: under ~4 MB so it loads fast on GitHub.

---

## Part B — the 2-minute walkthrough video

Record full-window with **Xbox Game Bar** (`Win+G` → record) or **OBS**.
Narration beats and timings below (~120s total). Speak to the "why," not just clicks.

| Time | On screen | Say |
|------|-----------|-----|
| 0:00–0:12 | Dashboard, all green | "TwinOps AI is a real-time digital twin of enterprise infrastructure. This is 20 interconnected services — gateways, payment, orders, databases — all healthy right now, streamed live over WebSockets." |
| 0:12–0:25 | Click into Digital Twin | "The twin is the dependency graph. Every node is health-tinted and updates in real time. This is the flagship — not a dashboard of charts, but the actual topology." |
| 0:25–0:45 | Inject "DB connection pool exhaustion"; cascade plays | "Watch what happens when the Orders database saturates. The failure cascades along real dependencies — orders, then checkout, then the gateway degrade in sequence, exactly like a production outage." |
| 0:45–1:00 | Click the crimson origin node → detail panel | "Click any node for live telemetry — CPU, latency, error rate, a latency trend, and its dependencies. The origin is clearly the database." |
| 1:00–1:25 | Incidents page → root-cause card | "The moment services failed, TwinOps opened an incident and **inferred the root cause** — not by being told, but from the topology: the most-upstream failing node whose own dependencies are healthy. It reports 90%+ confidence, computed from evidence, with the exact remediation steps. This is the trust story: AIOps tools fail because they hallucinate root causes. This one shows its evidence." |
| 1:25–1:40 | AI Agents page | "Six specialized agents work the incident in the open — monitoring, investigation, knowledge, prediction, recommendation, reporting. No hidden reasoning." |
| 1:40–1:52 | Knowledge Hub search "connection pool" → runbook | "The knowledge hub retrieves the runbook that fixes it, searchable across every playbook." |
| 1:52–2:00 | Twin → Reset → recovery to green; toggle dark theme | "Apply the fix, and the system recovers. Runs completely free on a laptop — no paid APIs. Built for Fujitsu-scale infrastructure." |

**Tips:** do a dry run first; the sim is deterministic so timings repeat. Pause
~1s before each click so cuts are clean. Export 1080p MP4.

---

## Where the assets go

- `docs/assets/demo.gif` — README hero GIF (Part A)
- Upload the MP4 to YouTube/Loom (unlisted) and paste the link into the README
  Demo section, or commit a compressed `.mp4` under `docs/assets/` if under ~50 MB.

## Optional: hands-free recording

Want the demo to drive itself (so you just hit record)? Ask and I'll add a
Playwright headed script that performs this exact choreography with pauses —
then any screen recorder captures a perfect, repeatable take.
