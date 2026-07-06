import { create } from "zustand";
import type { Incident, ReplayFrame } from "@/features/incidents/types";
import type {
  DeltaPayload,
  NodeRuntime,
  SnapshotPayload,
  TwinEdgeSpec,
  TwinNodeSpec,
  WireHealth,
} from "@/features/twin/types";

/**
 * Live twin state, fed by the server WebSocket (one of the five sanctioned
 * stores — DEVELOPMENT_RULES §6). The server is the source of truth; this store
 * just holds the latest snapshot + accumulated latency history for sparklines.
 */
const HISTORY_LEN = 40;

type ConnStatus = "connecting" | "live" | "error";

interface TwinState {
  status: ConnStatus;
  nodes: TwinNodeSpec[];
  edges: TwinEdgeSpec[];
  runtime: Record<string, NodeRuntime>;
  incidents: Incident[]; // open incidents, streamed live
  activeScenarioId: string | null;
  selectedNodeId: string | null;
  whatIfMode: boolean;
  whatIfNodeId: string | null;
  replayFrames: ReplayFrame[] | null;
  replayIndex: number;
  lastSeq: number;

  setStatus: (s: ConnStatus) => void;
  applySnapshot: (p: SnapshotPayload, seq: number) => void;
  applyDelta: (p: DeltaPayload, seq: number) => void;
  select: (nodeId: string | null) => void;
  toggleWhatIf: () => void;
  setWhatIfNode: (nodeId: string | null) => void;
  startReplay: (frames: ReplayFrame[]) => void;
  setReplayIndex: (i: number) => void;
  stopReplay: () => void;
}

/** Runtime map for a replay frame (no history needed for playback). */
export function replayRuntime(frame: ReplayFrame): Record<string, NodeRuntime> {
  const out: Record<string, NodeRuntime> = {};
  for (const h of frame.health) {
    out[h.id] = {
      score: h.score,
      status: h.status,
      metrics: {
        cpu: h.metrics.cpu,
        memory: h.metrics.memory,
        latencyP95: h.metrics.latency_p95,
        errorRate: h.metrics.error_rate,
      },
      history: [],
    };
  }
  return out;
}

function toRuntime(h: WireHealth, prev?: NodeRuntime): NodeRuntime {
  const history = (prev?.history ?? []).concat(h.metrics.latency_p95);
  if (history.length > HISTORY_LEN) history.splice(0, history.length - HISTORY_LEN);
  return {
    score: h.score,
    status: h.status,
    metrics: {
      cpu: h.metrics.cpu,
      memory: h.metrics.memory,
      latencyP95: h.metrics.latency_p95,
      errorRate: h.metrics.error_rate,
    },
    history,
  };
}

export const useTwinStore = create<TwinState>((set) => ({
  status: "connecting",
  nodes: [],
  edges: [],
  runtime: {},
  incidents: [],
  activeScenarioId: null,
  selectedNodeId: null,
  whatIfMode: false,
  whatIfNodeId: null,
  replayFrames: null,
  replayIndex: 0,
  lastSeq: 0,

  setStatus: (status) => set({ status }),

  applySnapshot: (p, seq) =>
    set(() => {
      const runtime: Record<string, NodeRuntime> = {};
      for (const h of p.health) runtime[h.id] = toRuntime(h);
      return {
        status: "live",
        nodes: p.nodes,
        edges: p.edges,
        runtime,
        incidents: p.incidents ?? [],
        activeScenarioId: p.active_scenario_id,
        lastSeq: seq,
      };
    }),

  applyDelta: (p, seq) =>
    set((s) => {
      const runtime = { ...s.runtime };
      for (const h of p.health) runtime[h.id] = toRuntime(h, s.runtime[h.id]);
      return {
        runtime,
        incidents: p.incidents ?? [],
        activeScenarioId: p.active_scenario_id,
        lastSeq: seq,
      };
    }),

  select: (nodeId) => set({ selectedNodeId: nodeId }),

  toggleWhatIf: () =>
    set((s) => ({
      whatIfMode: !s.whatIfMode,
      whatIfNodeId: null,
      selectedNodeId: null,
    })),

  setWhatIfNode: (nodeId) => set({ whatIfNodeId: nodeId }),

  startReplay: (frames) =>
    set({ replayFrames: frames, replayIndex: 0, whatIfMode: false, selectedNodeId: null }),
  setReplayIndex: (i) => set({ replayIndex: i }),
  stopReplay: () => set({ replayFrames: null, replayIndex: 0 }),
}));
