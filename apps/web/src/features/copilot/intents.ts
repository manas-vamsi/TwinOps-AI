import type { Incident } from "@/features/incidents/types";
import type { NodeRuntime } from "@/features/twin/types";

export interface CopilotAnswer {
  text: string;
  action?: { label: string; href: string };
}

/** Deterministic intent handling over live state. ponytail: keyword match, no
 *  LLM — natural-language understanding via the gateway is the next layer. */
export function answer(
  query: string,
  runtime: Record<string, NodeRuntime>,
  incidents: Incident[],
): CopilotAnswer {
  const q = query.toLowerCase();
  const inc = incidents[0] ?? null;
  const rts = Object.values(runtime);
  const failing = rts.filter((r) => r.status !== "healthy").length;

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("why", "root cause", "cause")) {
    if (inc?.root_cause) {
      return {
        text: `Root cause: ${inc.root_cause.label} (${inc.root_cause.confidence}% confidence). ${inc.root_cause.summary}`,
        action: { label: "Open incident", href: "/incidents" },
      };
    }
    return { text: "No active incident right now — nothing to diagnose." };
  }

  if (has("what should", "fix", "remediat", "action", "do now")) {
    if (inc?.root_cause) {
      return {
        text: `Recommended: ${inc.root_cause.recommended_actions.join("; ")}.`,
        action: inc.root_cause.runbook_id
          ? { label: "Open runbook", href: `/knowledge?doc=${inc.root_cause.runbook_id}` }
          : { label: "Open incident", href: "/incidents" },
      };
    }
    return { text: "All systems nominal — no action needed." };
  }

  if (has("failing", "status", "health", "wrong", "happening")) {
    if (failing === 0) return { text: "All systems nominal. Every component is healthy." };
    return {
      text: `${failing} component(s) are degraded or critical${inc ? `, incident: ${inc.title}` : ""}.`,
      action: { label: "View the twin", href: "/twin" },
    };
  }

  if (has("incident")) {
    return {
      text: inc ? `Active: ${inc.title} (${inc.severity}).` : "No active incidents.",
      action: { label: "Open incidents", href: "/incidents" },
    };
  }

  if (has("runbook", "knowledge", "docs")) {
    return { text: "Search the runbook library in the Knowledge Hub.", action: { label: "Open Knowledge Hub", href: "/knowledge" } };
  }

  if (has("what if", "blast", "impact")) {
    return {
      text: "Turn on What-if mode on the twin and click any healthy node to preview its blast radius.",
      action: { label: "Open the twin", href: "/twin" },
    };
  }

  return {
    text: "I can help with: what's failing, why (root cause), what to do, active incidents, runbooks, and what-if blast radius.",
  };
}

export const SUGGESTIONS = [
  "What's failing right now?",
  "Why is it happening?",
  "What should I do?",
];
