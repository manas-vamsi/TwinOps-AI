import type { Incident } from "./types";

/** Generate a blameless-postmortem Markdown doc from an incident, and download
 *  it. Pure client-side — no dependency, no backend call. */
export function postmortemMarkdown(inc: Incident): string {
  const rc = inc.root_cause;
  const lines: string[] = [
    `# Postmortem: ${inc.title}`,
    "",
    `- **Severity:** ${inc.severity}`,
    `- **Status:** ${inc.status}`,
    `- **Detected:** tick ${inc.started_tick}`,
    `- **Resolved:** ${inc.resolved_tick !== null ? `tick ${inc.resolved_tick}` : "ongoing"}`,
    `- **Incident ID:** ${inc.id}`,
    "",
  ];

  if (rc) {
    lines.push(
      "## Root cause",
      "",
      `**${rc.label}** — ${rc.summary} (${rc.confidence}% confidence)`,
      "",
      "### Evidence",
      "",
      ...rc.evidence.map((e) => `- ${e}`),
      "",
      "### Recommended actions",
      "",
      ...rc.recommended_actions.map((a) => `- ${a}`),
      "",
      `**Estimated recovery:** ${rc.estimated_recovery}`,
      "",
    );
  }

  lines.push(
    "## Affected services",
    "",
    ...inc.affected_node_ids.map((n) => `- ${n}`),
    "",
    "## Timeline",
    "",
    `- tick ${inc.started_tick} — detected, services began failing`,
  );
  if (rc) lines.push(`- tick ${inc.started_tick} — identified: ${rc.label} named as root cause`);
  if (inc.resolved_tick !== null)
    lines.push(`- tick ${inc.resolved_tick} — resolved, all systems recovered`);

  return lines.join("\n") + "\n";
}

export function downloadPostmortem(inc: Incident): void {
  const blob = new Blob([postmortemMarkdown(inc)], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `postmortem-${inc.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
