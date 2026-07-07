"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Boxes, HeartPulse, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { SEVERITY_STYLE } from "@/features/incidents/incidentStyle";

/** Operations overview built entirely from the live WS stream — no polling,
 *  no extra backend. Global health, status mix, and active incidents. */
export function DashboardView() {
  const runtime = useTwinStore((s) => s.runtime);
  const incidents = useTwinStore((s) => s.incidents);
  const predictions = useTwinStore((s) => s.predictions);
  const nodeCount = useTwinStore((s) => s.nodes.length);

  const rts = Object.values(runtime);
  const counts = { healthy: 0, degraded: 0, critical: 0 };
  let scoreSum = 0;
  for (const rt of rts) {
    counts[rt.status] += 1;
    scoreSum += rt.score;
  }
  const globalScore = rts.length ? Math.round(scoreSum / rts.length) : 100;
  const scoreStatus =
    globalScore >= 75 ? "healthy" : globalScore >= 40 ? "degraded" : "critical";
  const scoreColor =
    scoreStatus === "healthy"
      ? "text-success"
      : scoreStatus === "degraded"
        ? "text-warn"
        : "text-critical";

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          Operations Overview
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          Live across {nodeCount} infrastructure components
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={HeartPulse}
          label="Global health"
          value={`${globalScore}`}
          unit="/100"
          valueClass={scoreColor}
        />
        <Kpi icon={Boxes} label="Components" value={`${nodeCount}`} />
        <Kpi
          icon={AlertTriangle}
          label="Active incidents"
          value={`${incidents.length}`}
          valueClass={incidents.length ? "text-critical" : "text-success"}
        />
        <Kpi
          icon={Activity}
          label="Degraded / critical"
          value={`${counts.degraded + counts.critical}`}
          valueClass={counts.critical ? "text-critical" : counts.degraded ? "text-warn" : "text-success"}
        />
      </div>

      {/* health distribution */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 text-xs uppercase tracking-wide text-faint">
          Infrastructure health
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-raised">
          <Bar n={counts.healthy} total={rts.length} className="bg-success" />
          <Bar n={counts.degraded} total={rts.length} className="bg-warn" />
          <Bar n={counts.critical} total={rts.length} className="bg-critical" />
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-muted">
          <Legend dot="bg-success" label="Healthy" n={counts.healthy} />
          <Legend dot="bg-warn" label="Degraded" n={counts.degraded} />
          <Legend dot="bg-critical" label="Critical" n={counts.critical} />
        </div>
      </div>

      {/* predicted failures */}
      {predictions.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-faint">
            <TrendingDown className="size-3.5 text-warn" aria-hidden />
            Predicted failures
          </div>
          <div className="space-y-2">
            {predictions.map((p) => (
              <div
                key={p.node_id}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-raised px-3 py-2.5"
              >
                <span className="size-2 rounded-full bg-warn" aria-hidden />
                <span className="text-[13px] text-text">{p.label}</span>
                <span className="text-xs text-warn">
                  likely critical in ~{p.eta_seconds}s
                </span>
                <span className="ml-auto font-mono text-xs text-faint">
                  {p.confidence}% confidence
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* active incidents */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-faint">Active incidents</span>
          <Link href="/incidents" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted">
            No active incidents. All systems nominal.
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => {
              const sev = SEVERITY_STYLE[inc.severity];
              return (
                <Link
                  key={inc.id}
                  href="/incidents"
                  className="flex items-center gap-3 rounded-xl border border-hairline bg-raised px-3 py-2.5 transition-colors hover:border-accent/40"
                >
                  <span className={cn("size-2 animate-pulse rounded-full", sev.dot)} aria-hidden />
                  <span className="text-[13px] font-medium text-text">{inc.title}</span>
                  {inc.root_cause && (
                    <span className="ml-auto font-mono text-xs text-accent">
                      {inc.root_cause.confidence}% confidence
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-faint">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={cn("mt-2 font-display text-3xl font-semibold text-text", valueClass)}>
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function Bar({ n, total, className }: { n: number; total: number; className: string }) {
  if (!total || !n) return null;
  return <div className={className} style={{ width: `${(n / total) * 100}%` }} />;
}

function Legend({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label} <span className="font-mono text-text">{n}</span>
    </span>
  );
}
