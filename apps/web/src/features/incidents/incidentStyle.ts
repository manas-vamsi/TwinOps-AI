import type { IncidentStatus, Severity } from "./types";

export const SEVERITY_STYLE: Record<Severity, { dot: string; text: string; label: string }> = {
  high: { dot: "bg-critical", text: "text-critical", label: "High" },
  medium: { dot: "bg-warn", text: "text-warn", label: "Medium" },
  low: { dot: "bg-info", text: "text-info", label: "Low" },
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  detected: "Detected",
  investigating: "Investigating",
  identified: "Identified",
  resolved: "Resolved",
};
