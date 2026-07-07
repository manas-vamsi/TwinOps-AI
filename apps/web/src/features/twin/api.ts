import type { Scenario } from "./types";

/** API access for the twin. ponytail: thin typed fetch for 3 endpoints + WS;
 *  move to the generated @twinops/contracts client when that pipeline is wired. */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function wsUrl(): string {
  return API_BASE.replace(/^http/, "ws") + "/ws";
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/api/v1/simulation/scenarios`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("failed to load scenarios");
  return res.json();
}

export async function injectScenario(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/simulation/inject/${id}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("failed to inject scenario");
}

export async function resetSimulation(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/simulation/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("failed to reset simulation");
}
