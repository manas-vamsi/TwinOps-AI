"use client";

import { TwinCanvas } from "./TwinCanvas";
import { TwinToolbar } from "./TwinToolbar";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { HealthLegend } from "./HealthLegend";

/** The flagship surface: live dependency graph + inject controls + detail panel. */
export function TwinView() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <TwinCanvas />
      <TwinToolbar />
      <HealthLegend />
      <NodeDetailPanel />
    </div>
  );
}
