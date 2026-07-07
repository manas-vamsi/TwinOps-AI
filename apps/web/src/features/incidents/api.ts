import type { Incident, ReplayResponse } from "./types";

/** ponytail: thin fetch; move to the generated @twinops/contracts client
 *  when that pipeline is wired. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/v1/incidents`, { credentials: "include" });
  if (!res.ok) throw new Error("failed to load incidents");
  return res.json();
}

export async function fetchReplay(incidentId: string): Promise<ReplayResponse> {
  const res = await fetch(`${API_BASE}/api/v1/incidents/${incidentId}/replay`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("failed to load replay");
  return res.json();
}

export interface Narrative {
  text: string;
  source: "llm" | "deterministic";
  provider: string | null;
}

export async function fetchNarrative(incidentId: string): Promise<Narrative> {
  const res = await fetch(`${API_BASE}/api/v1/incidents/${incidentId}/narrative`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("failed to load narrative");
  return res.json();
}
