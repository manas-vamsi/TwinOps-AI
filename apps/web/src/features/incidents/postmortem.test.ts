import { describe, expect, it } from "vitest";
import { postmortemMarkdown } from "./postmortem";
import type { Incident } from "./types";

const incident: Incident = {
  id: "inc-42-db-orders-pg",
  title: "Orders Postgres failure",
  status: "resolved",
  severity: "high",
  started_tick: 42,
  resolved_tick: 55,
  affected_node_ids: ["db-orders-pg", "svc-orders"],
  root_cause: {
    node_id: "db-orders-pg",
    label: "Orders Postgres",
    confidence: 92,
    summary: "origin of the cascade",
    evidence: ["latency high", "pool saturated"],
    recommended_actions: ["increase pool"],
    estimated_recovery: "~5 minutes",
    runbook_id: "db-connection-pool-exhaustion",
  },
};

describe("postmortemMarkdown", () => {
  it("includes the title, severity, and root cause", () => {
    const md = postmortemMarkdown(incident);
    expect(md).toContain("# Postmortem: Orders Postgres failure");
    expect(md).toContain("**Severity:** high");
    expect(md).toContain("Orders Postgres");
    expect(md).toContain("92% confidence");
  });

  it("lists evidence, actions, and affected services", () => {
    const md = postmortemMarkdown(incident);
    expect(md).toContain("- latency high");
    expect(md).toContain("- increase pool");
    expect(md).toContain("- svc-orders");
  });

  it("records resolution in the timeline", () => {
    expect(postmortemMarkdown(incident)).toContain("tick 55 — resolved");
  });

  it("handles an incident with no root cause", () => {
    const md = postmortemMarkdown({ ...incident, root_cause: null });
    expect(md).toContain("# Postmortem:");
    expect(md).not.toContain("## Root cause");
  });
});
