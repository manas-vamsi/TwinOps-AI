"use client";

import { FlaskConical } from "lucide-react";
import { useTwinStore } from "@/stores/twinStore";
import { computeBlastRadius } from "./blastRadius";

/** Shows the projected blast radius when a node is picked in what-if mode.
 *  "Test changes before production" — the digital-twin promise, made visible. */
export function WhatIfBanner() {
  const whatIfMode = useTwinStore((s) => s.whatIfMode);
  const whatIfNodeId = useTwinStore((s) => s.whatIfNodeId);
  const nodes = useTwinStore((s) => s.nodes);
  const edges = useTwinStore((s) => s.edges);

  if (!whatIfMode || !whatIfNodeId) return null;
  const label = nodes.find((n) => n.id === whatIfNodeId)?.label ?? whatIfNodeId;
  const count = computeBlastRadius(edges, whatIfNodeId).size;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-accent/40 bg-chrome/90 px-4 py-2.5 text-center backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <FlaskConical className="size-4 text-accent" aria-hidden />
        <span className="text-text">
          If <span className="font-semibold text-accent">{label}</span> failed,{" "}
          <span className="font-semibold">{count}</span> downstream service
          {count === 1 ? "" : "s"} would degrade
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-faint">
        Highlighted with a dashed amber outline. No failure was injected.
      </div>
    </div>
  );
}
