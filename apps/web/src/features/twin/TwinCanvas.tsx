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
import { replayRuntime, useTwinStore } from "@/stores/twinStore";
import { layoutEdges, layoutNodes } from "./layout";
import { computeBlastRadius } from "./blastRadius";
import { TwinNode, type TwinNodeData } from "./TwinNode";

const nodeTypes = { twin: TwinNode };

function TwinCanvasInner() {
  const specNodes = useTwinStore((s) => s.nodes);
  const specEdges = useTwinStore((s) => s.edges);
  const liveRuntime = useTwinStore((s) => s.runtime);
  const replayFrames = useTwinStore((s) => s.replayFrames);
  const replayIndex = useTwinStore((s) => s.replayIndex);
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId);
  const select = useTwinStore((s) => s.select);
  const whatIfMode = useTwinStore((s) => s.whatIfMode);
  const whatIfNodeId = useTwinStore((s) => s.whatIfNodeId);
  const setWhatIfNode = useTwinStore((s) => s.setWhatIfNode);

  const positions = useMemo(() => layoutNodes(specNodes), [specNodes]);
  const rawEdges = useMemo(() => layoutEdges(specEdges), [specEdges]);
  const specById = useMemo(
    () => new Map(specNodes.map((n) => [n.id, n])),
    [specNodes],
  );
  const blast = useMemo(
    () => (whatIfNodeId ? computeBlastRadius(specEdges, whatIfNodeId) : null),
    [whatIfNodeId, specEdges],
  );

  // during replay the canvas shows the reconstructed frame instead of live health
  const runtime = useMemo(
    () => (replayFrames ? replayRuntime(replayFrames[replayIndex]) : liveRuntime),
    [replayFrames, replayIndex, liveRuntime],
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
            whatIfOrigin: whatIfNodeId === p.id,
            projected: blast?.has(p.id) ?? false,
          },
        };
      }),
    [positions, specById, runtime, selectedNodeId, whatIfNodeId, blast],
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
      onNodeClick={(_, node) => (whatIfMode ? setWhatIfNode(node.id) : select(node.id))}
      onPaneClick={() => (whatIfMode ? setWhatIfNode(null) : select(null))}
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
