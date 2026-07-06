"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Flame, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { fetchIncidents } from "./api";
import { RootCauseCard } from "./RootCauseCard";
import { downloadPostmortem } from "./postmortem";
import { SEVERITY_STYLE, STATUS_LABEL } from "./incidentStyle";
import type { Incident } from "./types";

export function IncidentsView() {
  const [history, setHistory] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const liveOpen = useTwinStore((s) => s.incidents);
  const liveOpenId = liveOpen[0]?.id ?? null;

  // fetch history on mount and whenever an incident opens/resolves
  useEffect(() => {
    fetchIncidents()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [liveOpenId]);

  // merge: live open incident (fresh every tick) overrides its history copy
  const incidents = useMemo(() => {
    const byId = new Map(history.map((i) => [i.id, i]));
    for (const inc of liveOpen) byId.set(inc.id, inc);
    return [...byId.values()].sort((a, b) => b.started_tick - a.started_tick);
  }, [history, liveOpen]);

  const selected =
    incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null;

  if (incidents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-hairline bg-surface text-success">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <p className="text-sm">No incidents. All systems nominal.</p>
        <p className="text-xs text-faint">
          Inject a failure on the Digital Twin to see one appear here live.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* list */}
      <div className="w-80 shrink-0 overflow-y-auto border-r border-hairline">
        <div className="p-4">
          <h1 className="font-display text-lg font-semibold tracking-tight text-text">
            Incidents
          </h1>
          <p className="mt-0.5 text-xs text-muted">{incidents.length} total</p>
        </div>
        <div className="space-y-1 px-2 pb-4">
          {incidents.map((inc) => {
            const sev = SEVERITY_STYLE[inc.severity];
            const active = selected?.id === inc.id;
            const open = inc.status !== "resolved";
            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => setSelectedId(inc.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-hairline bg-raised"
                    : "border-transparent hover:bg-surface",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("size-1.5 rounded-full", sev.dot, open && "animate-pulse")} aria-hidden />
                  <span className="truncate text-[13px] font-medium text-text">
                    {inc.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-faint">
                  <span className={sev.text}>{sev.label}</span>
                  <span>· {STATUS_LABEL[inc.status]}</span>
                  <span className="ml-auto font-mono">tick {inc.started_tick}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* workspace */}
      <div className="flex-1 overflow-y-auto">
        {selected && <IncidentWorkspace incident={selected} />}
      </div>
    </div>
  );
}

function IncidentWorkspace({ incident }: { incident: Incident }) {
  const sev = SEVERITY_STYLE[incident.severity];
  const open = incident.status !== "resolved";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl border border-hairline bg-surface",
            open ? sev.text : "text-success",
          )}
        >
          {open ? <Flame className="size-5" aria-hidden /> : <ShieldCheck className="size-5" aria-hidden />}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-text">
            {incident.title}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className={cn("inline-flex items-center gap-1.5", sev.text)}>
              <span className={cn("size-1.5 rounded-full", sev.dot)} aria-hidden />
              {sev.label} severity
            </span>
            <span>· {STATUS_LABEL[incident.status]}</span>
            <span className="font-mono text-faint">· {incident.id}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadPostmortem(incident)}
          className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-hairline bg-surface px-3 text-xs text-muted transition-colors hover:text-text"
        >
          <Download className="size-3.5" aria-hidden />
          Export postmortem
        </button>
      </div>

      {/* root cause */}
      {incident.root_cause ? (
        <RootCauseCard rca={incident.root_cause} />
      ) : (
        <div className="rounded-2xl border border-dashed border-hairline bg-surface/60 p-5 text-sm text-muted">
          Investigating — root cause not yet identified.
        </div>
      )}

      {/* affected services */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 text-xs uppercase tracking-wide text-faint">
          Affected services{" "}
          <span className="ml-1 rounded-full bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {incident.affected_node_ids.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {incident.affected_node_ids.map((id) => (
            <span
              key={id}
              className="rounded-lg border border-hairline bg-raised px-2 py-1 font-mono text-[11px] text-muted"
            >
              {id}
            </span>
          ))}
        </div>
      </div>

      {/* timeline */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 text-xs uppercase tracking-wide text-faint">Timeline</div>
        <ol className="space-y-2 text-[13px]">
          <li className="flex gap-2 text-muted">
            <span className="font-mono text-faint">tick {incident.started_tick}</span>
            Detected — services began failing
          </li>
          {incident.root_cause && (
            <li className="flex gap-2 text-muted">
              <span className="font-mono text-faint">tick {incident.started_tick}</span>
              Identified — {incident.root_cause.label} named as root cause
            </li>
          )}
          {incident.resolved_tick !== null && (
            <li className="flex gap-2 text-success">
              <span className="font-mono text-faint">tick {incident.resolved_tick}</span>
              Resolved — all systems recovered
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
