"use client";

import { Loader2, PlugZap } from "lucide-react";
import { useTwinStore } from "@/stores/twinStore";
import { TwinCanvas } from "./TwinCanvas";
import { TwinToolbar } from "./TwinToolbar";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { HealthLegend } from "./HealthLegend";
import { useTwinSocket } from "./useTwinSocket";

/** Flagship surface: live dependency graph streamed from the server. */
export function TwinView() {
  useTwinSocket();
  const status = useTwinStore((s) => s.status);
  const hasData = useTwinStore((s) => s.nodes.length > 0);

  // loading — connecting with nothing to show yet
  if (!hasData && status === "connecting") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
        <p className="text-sm">Connecting to the simulation…</p>
      </div>
    );
  }

  // error — can't reach the backend and have nothing cached
  if (!hasData && status === "error") {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-hairline bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-hairline bg-raised text-critical">
            <PlugZap className="size-5" aria-hidden />
          </div>
          <h1 className="font-display text-lg font-semibold text-text">
            Cannot reach the simulation API
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            The Digital Twin streams from the backend. Start it and this page
            reconnects automatically.
          </p>
          <code className="mt-4 inline-block rounded-lg border border-hairline bg-raised px-3 py-1.5 font-mono text-xs text-muted">
            cd apps/api &amp;&amp; uv run uvicorn twinops.main:app --reload
          </code>
        </div>
      </div>
    );
  }

  // live (or reconnecting with cached data)
  return (
    <div className="relative h-full w-full overflow-hidden">
      <TwinCanvas />
      <TwinToolbar />
      <HealthLegend />
      <NodeDetailPanel />
      {status === "error" && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-xl border border-warn/40 bg-chrome/80 px-3 py-2 text-[11px] text-warn backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-warn" aria-hidden />
          Reconnecting…
        </div>
      )}
    </div>
  );
}
