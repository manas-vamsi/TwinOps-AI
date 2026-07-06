"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { KIND_ICON, STATUS_LABEL, STATUS_STYLE } from "./nodeConfig";
import type { HealthStatus, NodeKind } from "./types";

export interface TwinNodeData {
  label: string;
  kind: NodeKind;
  status: HealthStatus;
  latencyP95: number;
  selected: boolean;
  [key: string]: unknown;
}

/** Custom React Flow node — one component for all kinds, health-tinted via
 *  semantic tokens so it works in both themes. NOT a default RF box. */
function TwinNodeInner({ data }: NodeProps) {
  const d = data as TwinNodeData;
  const Icon = KIND_ICON[d.kind];
  const style = STATUS_STYLE[d.status];

  return (
    <div
      className={cn(
        "group relative flex w-[200px] items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 transition-all",
        style.ring,
        d.selected && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
        d.status === "critical" && "animate-pulse",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-hairline" />

      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-raised",
          style.text,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">{d.label}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
          <span className="text-[11px] text-muted">{STATUS_LABEL[d.status]}</span>
          <span className="ml-auto font-mono text-[11px] text-faint">
            {d.latencyP95}ms
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-hairline" />
    </div>
  );
}

export const TwinNode = memo(TwinNodeInner);
