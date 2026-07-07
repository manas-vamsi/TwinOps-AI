# Deploying TwinOps AI (free profile)

The MVP deploys for **$0**: the API is a single self-contained container (in-memory
simulation + in-process WebSocket bus — **no database or Redis to provision**), and
the web app is a static-ish Next.js build on Vercel Hobby.

```
  Browser ──HTTPS──▶ Vercel (web, Next.js)  ──REST + WSS──▶ Render/HF (API, Docker)
                     NEXT_PUBLIC_API_BASE ─────────────────▶  one container, no DB
```

> Note: the simulation state is in-memory, so it resets on every redeploy/restart —
> which is exactly right for a demo (each visitor gets the same seeded topology).

## 1. API → Render (Docker, free)

1. Push to GitHub, then in Render: **New → Blueprint**, point at this repo. It reads
   [`render.yaml`](../render.yaml) and builds [`apps/api/Dockerfile`](../apps/api/Dockerfile).
2. Set env vars (marked `sync: false` in the blueprint):
   - `TWINOPS_CORS_ORIGINS` → your Vercel URL as a JSON list, e.g. `["https://twinops.vercel.app"]`
   - at least one of `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` (optional —
     the app runs without them; AI features fall back to deterministic output)
3. Deploy. Health check is `/healthz`. Note the service URL (e.g. `https://twinops-api.onrender.com`).

Alternatives with the same Dockerfile: **Hugging Face Spaces** (Docker SDK), **Fly.io**, or
**Railway** (paid, no cold starts).

## 2. Web → Vercel (Hobby, free)

1. In Vercel: **New Project** → import the repo → set **Root Directory = `apps/web`**
   (Next.js is auto-detected).
2. Add env var `NEXT_PUBLIC_API_BASE` = your Render API URL (from step 1).
3. Deploy. Update the API's `TWINOPS_CORS_ORIGINS` to the resulting Vercel URL and redeploy the API.

## 3. Verify

- Open the Vercel URL → the twin should connect (top-bar status pill goes live).
- Inject a failure → cascade + incident.
- Open an incident → the **AI explanation** badge shows `LLM · <provider>` if a key is set,
  else `deterministic`.

## Cost & limits (free tier)

- **Render free** and **HF Spaces** cold-start after inactivity (~30–60s first request). For a
  link you're actively sharing, a paid always-on plan (~$5/mo) removes this.
- LLM calls spend your provider key; the gateway caches responses and rate-limits the
  spending endpoints, so cost stays minimal.
- No persistence: incidents/analytics reset on redeploy (in-memory by design).

## Hardening for a public deploy (optional, not yet wired)

- **Auth**: session-based auth (login + RBAC) is designed but not currently in the codebase;
  add it before exposing the mutating endpoints widely. Until then, `/inject` and `/reset` are
  open but rate-limited.
- **Persistence**: wire PostgreSQL (Neon free) if you want incidents/analytics to survive restarts.
