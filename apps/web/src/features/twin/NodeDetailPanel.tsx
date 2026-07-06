"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { KIND_ICON, KIND_LABEL, STATUS_LABEL, STATUS_STYLE } from "./nodeConfig";
import { Sparkline } from "./Sparkline";
import type { Metrics } from "./types";

function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-raised px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-text">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>
      </div>
    </div>
  );
}

export function NodeDetailPanel() {
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId);
  const runtime = useTwinStore((s) => s.runtime);
  const nodes = useTwinStore((s) => s.nodes);
  const edges = useTwinStore((s) => s.edges);
  const select = useTwinStore((s) => s.select);

  if (!selectedNodeId) return null;
  const spec = nodes.find((n) => n.id === selectedNodeId);
  const rt = runtime[selectedNodeId];
  if (!spec || !rt) return null;

  const Icon = KIND_ICON[spec.kind];
  const style = STATUS_STYLE[rt.status];
  const m: Metrics = rt.metrics;

  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  const dependencies = edges.filter((e) => e.source === spec.id).map((e) => e.target);
  const dependents = edges.filter((e) => e.target === spec.id).map((e) => e.source);

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-[360px] flex-col border-l border-hairline bg-chrome shadow-2xl shadow-black/20">
      {/* header */}
      <div className="flex items-start gap-3 border-b border-hairline p-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl border border-hairline bg-raised",
            style.text,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-semibold text-text">
            {spec.label}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
            <span className={style.text}>{STATUS_LABEL[rt.status]}</span>
            <span className="text-faint">· {KIND_LABEL[spec.kind]}</span>
            <span className="ml-auto font-mono text-faint">{spec.id}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => select(null)}
          aria-label="Close panel"
          className="flex size-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-text"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* health score */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wide text-faint">Health score</span>
            <span className={cn("font-mono font-semibold", style.text)}>
              {Math.round(rt.score)}/100
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className={cn("h-full rounded-full transition-all", style.dot)}
              style={{ width: `${rt.score}%` }}
            />
          </div>
        </div>

        {/* metrics */}
        <div className="grid grid-cols-2 gap-2">
          <Metric label="CPU" value={Math.round(m.cpu)} unit="%" />
          <Metric label="Memory" value={Math.round(m.memory)} unit="%" />
          <Metric label="Latency p95" value={m.latencyP95} unit="ms" />
          <Metric label="Error rate" value={m.errorRate} unit="%" />
        </div>

        {/* latency trend */}
        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-faint">
            Latency trend
          </div>
          <Sparkline values={rt.history} className={cn("h-8 w-full", style.text)} />
        </div>

        {/* relationships */}
        <Relationship title="Depends on" ids={dependencies} onSelect={select} labelOf={labelOf} />
        <Relationship title="Dependents" ids={dependents} onSelect={select} labelOf={labelOf} />

        {/* AI reasoning — designed placeholder for Phase 2 */}
        <div className="rounded-xl border border-dashed border-hairline bg-surface/60 p-3">
          <div className="text-xs font-medium text-text">AI Root-Cause Analysis</div>
          <p className="mt-1 text-[11px] leading-relaxed text-faint">
            Evidence-weighted root cause, confidence, and recommended actions
            arrive in Phase 2 — the AI agent pipeline that reasons over this
            node&apos;s telemetry and dependencies.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Relationship({
  title,
  ids,
  onSelect,
  labelOf,
}: {
  title: string;
  ids: string[];
  onSelect: (id: string) => void;
  labelOf: (id: string) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs uppercase tracking-wide text-faint">
        {title}{" "}
        <span className="ml-1 rounded-full bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
          {ids.length}
        </span>
      </div>
      {ids.length === 0 ? (
        <div className="text-[11px] text-faint">None</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="rounded-lg border border-hairline bg-raised px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-text"
            >
              {labelOf(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
