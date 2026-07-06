/** Incident domain types — mirror the backend Pydantic schemas. */

export type IncidentStatus = "detected" | "investigating" | "identified" | "resolved";
export type Severity = "low" | "medium" | "high";

export interface RootCause {
  node_id: string;
  label: string;
  confidence: number; // 0-100
  summary: string;
  evidence: string[];
  recommended_actions: string[];
  estimated_recovery: string;
}

export interface ReplayFrame {
  tick: number;
  health: {
    id: string;
    score: number;
    status: "healthy" | "degraded" | "critical";
    metrics: { cpu: number; memory: number; latency_p95: number; error_rate: number };
  }[];
}

export interface ReplayResponse {
  incident_id: string;
  origin: string;
  frames: ReplayFrame[];
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  started_tick: number;
  resolved_tick: number | null;
  affected_node_ids: string[];
  root_cause: RootCause | null;
}
