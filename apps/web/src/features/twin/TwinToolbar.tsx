"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { fetchScenarios, injectScenario, resetSimulation } from "./api";
import type { Scenario } from "./types";

/** Floating control surface: inject a failure scenario (the demo moment)
 *  and reset. Scenarios + inject/reset go through the server API. */
export function TwinToolbar() {
  const [open, setOpen] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const activeScenarioId = useTwinStore((s) => s.activeScenarioId);
  const active = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  const whatIfMode = useTwinStore((s) => s.whatIfMode);
  const toggleWhatIf = useTwinStore((s) => s.toggleWhatIf);

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto">
        <h1 className="font-display text-lg font-semibold tracking-tight text-text">
          Digital Twin
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          {whatIfMode ? (
            <span className="text-accent">● What-if mode — click a node to preview its blast radius</span>
          ) : active ? (
            <span className="text-critical">● {active.blurb}</span>
          ) : (
            <span className="text-success">● All systems nominal</span>
          )}
        </p>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleWhatIf}
          aria-pressed={whatIfMode}
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
            whatIfMode
              ? "border-accent bg-accent-soft text-accent"
              : "border-hairline bg-surface text-muted hover:text-text",
          )}
        >
          <FlaskConical className="size-4" aria-hidden />
          What-if
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            disabled={scenarios.length === 0}
            className="flex h-9 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-medium text-cream transition-colors hover:bg-accent-strong disabled:opacity-40"
          >
            <Zap className="size-4" aria-hidden />
            Inject failure
            <ChevronDown className="size-3.5 opacity-80" aria-hidden />
          </button>
          {open && (
            <div className="absolute right-0 top-11 w-64 overflow-hidden rounded-xl border border-hairline bg-surface p-1 shadow-2xl shadow-black/20">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    void injectScenario(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-raised",
                    s.id === activeScenarioId && "bg-accent-soft",
                  )}
                >
                  <span className="text-[13px] font-medium text-text">{s.label}</span>
                  <span className="text-[11px] text-faint">{s.blurb}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void resetSimulation()}
          disabled={!activeScenarioId}
          className="flex size-9 items-center justify-center rounded-xl border border-hairline bg-surface text-muted transition-colors hover:text-text disabled:opacity-40"
          aria-label="Reset simulation"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
