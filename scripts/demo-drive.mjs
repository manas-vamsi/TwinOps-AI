// Hands-free demo driver. Starts a real browser and performs the scripted
// TwinOps demo with pauses and a visible cursor, so any screen recorder
// captures a clean, repeatable take.
//
// Prereqs (once):  pnpm install  &&  pnpm exec playwright install chromium
// Run BOTH servers first, then:  node scripts/demo-drive.mjs
//   terminal 1:  cd apps/api && uv run uvicorn twinops.main:app --reload
//   terminal 2:  pnpm dev

import { chromium } from "playwright";

const BASE = process.env.DEMO_URL ?? "http://localhost:3000";

// injected once per page: a dot that follows the cursor and pulses on click,
// so programmatic mouse moves are visible in the recording.
const CURSOR = `
  (() => {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed', width: '18px', height: '18px', borderRadius: '50%',
      background: 'rgba(230,0,18,0.85)', boxShadow: '0 0 0 6px rgba(230,0,18,0.20)',
      pointerEvents: 'none', zIndex: '999999', transform: 'translate(-50%,-50%)',
      transition: 'width .1s, height .1s', left: '-50px', top: '-50px',
    });
    const add = () => (document.body || document.documentElement).appendChild(dot);
    document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
    addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { dot.style.width = '30px'; dot.style.height = '30px'; }, true);
    addEventListener('mouseup', () => { dot.style.width = '18px'; dot.style.height = '18px'; }, true);
  })();
`;

const run = async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 250, // smooth, visible interactions
    args: ["--window-size=1480,960"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();

  const beat = (ms) => page.waitForTimeout(ms);
  const nav = async (name) => {
    await page.getByRole("link", { name, exact: true }).click();
    await beat(1500);
  };

  // 0:00 — dashboard, all healthy
  await page.goto(BASE);
  await beat(3000);

  // 0:12 — the twin
  await nav("Digital Twin");
  await beat(2500);

  // 0:25 — inject the failure, let the cascade play
  await page.getByRole("button", { name: /inject failure/i }).click();
  await beat(700);
  await page.getByText("DB connection pool exhaustion").click();
  await beat(8000); // the money shot: cascade ripples out

  // 0:45 — inspect the origin node
  await page.getByText("Orders Postgres").first().click();
  await beat(4000);
  await page.keyboard.press("Escape");
  await beat(800);

  // 1:00 — the incident + inferred root cause
  await nav("Incidents");
  await beat(6000);

  // 1:25 — the agents working it
  await nav("AI Agents");
  await beat(5000);

  // 1:40 — knowledge hub finds the runbook
  await nav("Knowledge Hub");
  await beat(1200);
  await page.getByPlaceholder(/search runbooks/i).fill("connection pool");
  await beat(3500);

  // 1:52 — recover, then show the premium dark theme
  await nav("Digital Twin");
  await page.getByRole("button", { name: /reset simulation/i }).click();
  await beat(4000);
  await page.getByRole("button", { name: /switch to (dark|light) theme/i }).click();
  await beat(4000);

  await browser.close();
};

run().catch((err) => {
  console.error("demo-drive failed:", err.message);
  console.error("Are both servers running? (uvicorn on :8000, pnpm dev on :3000)");
  process.exit(1);
});
