"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { KIND_ICON, KIND_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/features/twin/nodeConfig";
import type { HealthStatus, NodeKind } from "@/features/twin/types";

type StatusFilter = "all" | HealthStatus;

/** Searchable inventory of every component, live from the WS stream. */
export function InfrastructureView() {
  const nodes = useTwinStore((s) => s.nodes);
  const runtime = useTwinStore((s) => s.runtime);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes
      .filter((n) => {
        const rt = runtime[n.id];
        if (filter !== "all" && rt?.status !== filter) return false;
        if (q && !n.label.toLowerCase().includes(q) && !n.id.includes(q)) return false;
        return true;
      })
      .sort((a, b) => (runtime[a.id]?.score ?? 100) - (runtime[b.id]?.score ?? 100));
  }, [nodes, runtime, query, filter]);

  const FILTERS: StatusFilter[] = ["all", "healthy", "degraded", "critical"];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          Infrastructure
        </h1>
        <p className="mt-0.5 text-xs text-muted">{nodes.length} components</p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-xl border border-hairline bg-surface px-3">
          <Search className="size-4 text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-faint"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs capitalize transition-colors",
                filter === f ? "bg-raised text-text" : "text-muted hover:text-text",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-2.5 font-medium">Component</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">CPU</th>
              <th className="px-4 py-2.5 text-right font-medium">Latency</th>
              <th className="px-4 py-2.5 text-right font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const rt = runtime[n.id];
              const status = rt?.status ?? "healthy";
              const style = STATUS_STYLE[status];
              const Icon = KIND_ICON[n.kind as NodeKind];
              return (
                <tr key={n.id} className="border-b border-hairline last:border-0 hover:bg-surface">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-faint" aria-hidden />
                      <span className="text-text">{n.label}</span>
                      <span className="font-mono text-[11px] text-faint">{n.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{KIND_LABEL[n.kind as NodeKind]}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs", style.text)}>
                      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                    {rt ? `${Math.round(rt.metrics.cpu)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                    {rt ? `${rt.metrics.latencyP95}ms` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                    {rt ? `${rt.metrics.errorRate}%` : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-faint">
                  No components match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
