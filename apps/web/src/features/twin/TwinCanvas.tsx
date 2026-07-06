"use client";

import { useMemo } from "react";
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
import { TwinNode, type TwinNodeData } from "./TwinNode";

const nodeTypes = { twin: TwinNode };

function TwinCanvasInner() {
  const specNodes = useTwinStore((s) => s.nodes);
  const specEdges = useTwinStore((s) => s.edges);
  const runtime = useTwinStore((s) => s.runtime);
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId);
  const select = useTwinStore((s) => s.select);

  const positions = useMemo(() => layoutNodes(specNodes), [specNodes]);
  const rawEdges = useMemo(() => layoutEdges(specEdges), [specEdges]);
  const specById = useMemo(
    () => new Map(specNodes.map((n) => [n.id, n])),
    [specNodes],
  );

  const nodes: Node<TwinNodeData>[] = useMemo(
    () =>
      positions.map((p) => {
        const spec = specById.get(p.id)!;
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
    [positions, specById, runtime, selectedNodeId],
  );

  const edges: Edge[] = useMemo(
    () =>
      rawEdges.map((e) => {
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
    [rawEdges, runtime],
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
