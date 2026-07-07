import { describe, expect, it } from "vitest";
import { answer } from "./intents";
import type { Incident } from "@/features/incidents/types";
import type { NodeRuntime } from "@/features/twin/types";

const healthy: Record<string, NodeRuntime> = {
  a: { score: 100, status: "healthy", metrics: { cpu: 10, memory: 20, latencyP95: 40, errorRate: 0 }, history: [] },
};
const failing: Record<string, NodeRuntime> = {
  a: { score: 20, status: "critical", metrics: { cpu: 95, memory: 80, latencyP95: 900, errorRate: 40 }, history: [] },
};
const incident: Incident = {
  id: "inc-1",
  title: "Orders Postgres failure",
  status: "identified",
  severity: "high",
  started_tick: 1,
  resolved_tick: null,
  affected_node_ids: ["a"],
  root_cause: {
    node_id: "a",
    label: "Orders Postgres",
    confidence: 92,
    summary: "origin",
    evidence: [],
    recommended_actions: ["increase pool"],
    estimated_recovery: "~5m",
    runbook_id: "db-connection-pool-exhaustion",
  },
};

describe("copilot answer", () => {
  it("reports nominal when nothing is failing", () => {
    expect(answer("what's failing?", healthy, []).text).toMatch(/nominal/i);
  });

  it("explains root cause and links to the incident", () => {
    const a = answer("why is this happening?", failing, [incident]);
    expect(a.text).toContain("Orders Postgres");
    expect(a.text).toContain("92%");
    expect(a.action?.href).toBe("/incidents");
  });

  it("gives remediation with a runbook link", () => {
    const a = answer("what should I do?", failing, [incident]);
    expect(a.text).toContain("increase pool");
    expect(a.action?.href).toContain("/knowledge?doc=");
  });

  it("falls back to a capability list for unknown queries", () => {
    expect(answer("tell me a joke", healthy, []).text).toMatch(/I can help with/i);
  });
});
