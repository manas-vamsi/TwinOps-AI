"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { fetchIncidents } from "@/features/incidents/api";
import { SEVERITY_STYLE } from "@/features/incidents/incidentStyle";
import type { Incident, Severity } from "@/features/incidents/types";

const TICK_SECONDS = 1.5;

/** Operational intelligence from incident history. Only metrics we actually
 *  have data for — no fabricated prediction accuracy. */
export function AnalyticsView() {
  const [history, setHistory] = useState<Incident[]>([]);
  const liveOpenId = useTwinStore((s) => s.incidents[0]?.id ?? null);

  useEffect(() => {
    fetchIncidents()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [liveOpenId]);

  const stats = useMemo(() => {
    const resolved = history.filter((i) => i.resolved_tick !== null);
    const active = history.filter((i) => i.status !== "resolved").length;
    const mttrTicks = resolved.length
      ? resolved.reduce((s, i) => s + (i.resolved_tick! - i.started_tick), 0) / resolved.length
      : 0;

    const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    const affected = new Map<string, number>();
    for (const i of history) {
      bySeverity[i.severity] += 1;
      for (const n of i.affected_node_ids) affected.set(n, (affected.get(n) ?? 0) + 1);
    }
    const topAffected = [...affected.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      total: history.length,
      resolved: resolved.length,
      active,
      mttr: mttrTicks ? `${(mttrTicks * TICK_SECONDS).toFixed(0)}s` : "—",
      bySeverity,
      topAffected,
    };
  }, [history]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          Analytics
        </h1>
        <p className="mt-0.5 text-xs text-muted">Operational intelligence from incident history</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Incidents" value={`${stats.total}`} />
        <Kpi label="Resolved" value={`${stats.resolved}`} />
        <Kpi label="Active" value={`${stats.active}`} valueClass={stats.active ? "text-critical" : "text-success"} />
        <Kpi label="Mean time to resolve" value={stats.mttr} />
      </div>

      {stats.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-surface/60 p-8 text-center text-sm text-muted">
          No incidents recorded yet. Inject a failure on the Digital Twin to
          generate analytics.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {/* severity mix */}
          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="mb-3 text-xs uppercase tracking-wide text-faint">By severity</div>
            <div className="space-y-2">
              {(["high", "medium", "low"] as Severity[]).map((sev) => {
                const n = stats.bySeverity[sev];
                const pct = stats.total ? (n / stats.total) * 100 : 0;
                return (
                  <div key={sev} className="flex items-center gap-3">
                    <span className={cn("w-16 text-xs capitalize", SEVERITY_STYLE[sev].text)}>{sev}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                      <div className={cn("h-full rounded-full", SEVERITY_STYLE[sev].dot)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right font-mono text-xs text-muted">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* top affected */}
          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="mb-3 text-xs uppercase tracking-wide text-faint">
              Most-affected components
            </div>
            {stats.topAffected.length === 0 ? (
              <p className="text-sm text-muted">None yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.topAffected.map(([id, count]) => (
                  <li key={id} className="flex items-center justify-between text-[13px]">
                    <span className="font-mono text-muted">{id}</span>
                    <span className="font-mono text-text">{count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="text-xs text-faint">{label}</div>
      <div className={cn("mt-2 font-display text-2xl font-semibold text-text", valueClass)}>
        {value}
      </div>
    </div>
  );
}
