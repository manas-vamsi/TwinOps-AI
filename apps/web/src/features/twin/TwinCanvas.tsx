"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTwinStore } from "@/stores/twinStore";
import { layoutEdges, layoutNodes } from "./layout";
import { NODES } from "./topology";
import { TwinNode, type TwinNodeData } from "./TwinNode";

const nodeTypes = { twin: TwinNode };
const POSITIONS = layoutNodes();
const RAW_EDGES = layoutEdges();
const SPEC_BY_ID = new Map(NODES.map((n) => [n.id, n]));

const TICK_MS = 1500;

function TwinCanvasInner() {
  const runtime = useTwinStore((s) => s.runtime);
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId);
  const advance = useTwinStore((s) => s.advance);
  const select = useTwinStore((s) => s.select);

  // drive the simulation forward
  useEffect(() => {
    const id = setInterval(advance, TICK_MS);
    return () => clearInterval(id);
  }, [advance]);

  const nodes: Node<TwinNodeData>[] = useMemo(
    () =>
      POSITIONS.map((p) => {
        const spec = SPEC_BY_ID.get(p.id)!;
        const rt = runtime[p.id];
        return {
          id: p.id,
          type: "twin",
          position: { x: p.x, y: p.y },
          draggable: false,
          data: {
            label: spec.label,
            kind: spec.kind,
            status: rt?.status ?? "healthy",
            latencyP95: rt?.metrics.latencyP95 ?? 0,
            selected: selectedNodeId === p.id,
          },
        };
      }),
    [runtime, selectedNodeId],
  );

  const edges: Edge[] = useMemo(
    () =>
      RAW_EDGES.map((e) => {
        const s = runtime[e.source]?.status;
        const t = runtime[e.target]?.status;
        const hot = [s, t].some((x) => x === "critical" || x === "degraded");
        const critical = [s, t].some((x) => x === "critical");
        return {
          ...e,
          animated: hot,
          style: {
            stroke: critical
              ? "var(--color-critical)"
              : hot
                ? "var(--color-warn)"
                : "var(--color-hairline)",
            strokeWidth: hot ? 2 : 1.5,
          },
        };
      }),
    [runtime],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => select(node.id)}
      onPaneClick={() => select(null)}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.3}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
      className="bg-bg"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--color-hairline)" />
      <Controls showInteractive={false} className="!rounded-xl !border !border-hairline !bg-surface" />
    </ReactFlow>
  );
}

export function TwinCanvas() {
  return (
    <ReactFlowProvider>
      <TwinCanvasInner />
    </ReactFlowProvider>
  );
}
