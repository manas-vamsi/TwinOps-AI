"use client";

import {
  Activity,
  BookOpen,
  FileText,
  Lightbulb,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import type { Incident } from "@/features/incidents/types";

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  /** what this agent contributes for the active incident (deterministic today) */
  output: (inc: Incident) => string;
}

const AGENTS: Agent[] = [
  {
    id: "monitoring",
    name: "Monitoring Agent",
    role: "Watches telemetry for anomalies",
    icon: Activity,
    output: (inc) => `Detected ${inc.affected_node_ids.length} failing component(s)`,
  },
  {
    id: "investigation",
    name: "Investigation Agent",
    role: "Correlates evidence across the topology",
    icon: Search,
    output: (inc) => inc.root_cause?.evidence[0] ?? "Gathering evidence…",
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    role: "Retrieves matching runbooks",
    icon: BookOpen,
    output: (inc) =>
      inc.root_cause ? `Matched runbook for ${inc.root_cause.label}` : "Searching knowledge base…",
  },
  {
    id: "prediction",
    name: "Prediction Agent",
    role: "Forecasts blast radius and recovery",
    icon: TrendingUp,
    output: (inc) =>
      inc.root_cause
        ? `Blast radius ${inc.affected_node_ids.length}; recovery ${inc.root_cause.estimated_recovery}`
        : "Forecasting…",
  },
  {
    id: "recommendation",
    name: "Recommendation Agent",
    role: "Proposes remediation",
    icon: Lightbulb,
    output: (inc) => inc.root_cause?.recommended_actions[0] ?? "Preparing actions…",
  },
  {
    id: "reporting",
    name: "Reporting Agent",
    role: "Summarizes for the on-call engineer",
    icon: FileText,
    output: (inc) =>
      inc.root_cause
        ? `${inc.root_cause.label}: ${inc.root_cause.confidence}% confidence`
        : "Drafting summary…",
  },
];

export function AgentsView() {
  const incident = useTwinStore((s) => s.incidents[0] ?? null);
  const prediction = useTwinStore((s) => s.predictions[0] ?? null);
  const active = incident !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          AI Agents
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          {active ? (
            <span className="text-accent">● Investigating {incident.title}</span>
          ) : (
            <span className="text-success">● Idle — monitoring for anomalies</span>
          )}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          // the prediction agent works from live forecasts even before an incident
          const isPredictionForecasting = agent.id === "prediction" && prediction !== null;
          const agentActive = active || isPredictionForecasting;
          const output = isPredictionForecasting
            ? `${prediction!.label} likely critical in ~${prediction!.eta_seconds}s (${prediction!.confidence}% confidence)`
            : active
              ? agent.output(incident)
              : "Standing by.";
          return (
            <div
              key={agent.id}
              className={cn(
                "rounded-2xl border bg-surface p-4 transition-colors",
                agentActive ? "border-accent/30" : "border-hairline",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl border border-hairline bg-raised",
                    agentActive ? "text-accent" : "text-faint",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text">{agent.name}</div>
                  <div className="truncate text-[11px] text-faint">{agent.role}</div>
                </div>
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 text-[11px]",
                    agentActive ? "text-accent" : "text-faint",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      agentActive ? "animate-pulse bg-accent" : "bg-faint",
                    )}
                    aria-hidden
                  />
                  {agentActive ? "Working" : "Idle"}
                </span>
              </div>
              <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-[12px] text-muted">
                {output}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-faint">
        Agent reasoning is deterministic today; natural-language narration via the
        LLM gateway is the next layer.
      </p>
    </div>
  );
}
