import type { Incident } from "./types";

/** ponytail: thin fetch; move to the generated @twinops/contracts client
 *  when that pipeline is wired. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/v1/incidents`);
  if (!res.ok) throw new Error("failed to load incidents");
  return res.json();
}
