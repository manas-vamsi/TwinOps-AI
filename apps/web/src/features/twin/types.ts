/** Digital Twin domain types. Mirrors the backend TelemetrySource contract
 *  (ARCHITECTURE §5) so the client simulation can later be swapped for the
 *  real WebSocket stream without changing any component. */

export type NodeKind =
  | "load-balancer"
  | "gateway"
  | "service"
  | "database"
  | "queue"
  | "cache"
  | "cloud";

/** Health is derived from a 0-100 score with hysteresis in the simulation. */
export type HealthStatus = "healthy" | "degraded" | "critical";

export interface TwinNodeSpec {
  /** stable human-readable slug, e.g. "svc-payment" */
  id: string;
  kind: NodeKind;
  label: string;
  /** dependency tier for the layered layout (0 = edge, higher = deeper) */
  tier: number;
}

export interface TwinEdgeSpec {
  /** dependent -> dependency (source depends on target) */
  source: string;
  target: string;
}

export interface Metrics {
  cpu: number; // %
  memory: number; // %
  latencyP95: number; // ms
  errorRate: number; // %
}

export interface NodeRuntime {
  score: number; // 0-100 health score
  status: HealthStatus;
  metrics: Metrics;
  /** short metric history for sparklines (latency samples) */
  history: number[];
}

export interface Scenario {
  id: string;
  label: string;
  /** node the failure originates on */
  origin: string;
  /** what the operator sees as the failing signal */
  blurb: string;
}

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 75) return "healthy";
  if (score >= 40) return "degraded";
  return "critical";
}
