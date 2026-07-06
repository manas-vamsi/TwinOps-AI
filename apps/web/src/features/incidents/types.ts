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
