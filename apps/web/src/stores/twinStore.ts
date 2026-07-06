import { create } from "zustand";
import { SCENARIOS } from "@/features/twin/topology";
import {
  type FailureState,
  simulateTick,
} from "@/features/twin/simulation";
import type { NodeRuntime } from "@/features/twin/types";

/**
 * Live twin state (one of the five sanctioned stores — DEVELOPMENT_RULES §6).
 * Streaming/simulation state lives here; server-owned data uses TanStack Query.
 */
interface TwinState {
  tick: number;
  runtime: Record<string, NodeRuntime>;
  failure: FailureState | null;
  activeScenarioId: string | null;
  selectedNodeId: string | null;

  advance: () => void;
  inject: (scenarioId: string) => void;
  reset: () => void;
  select: (nodeId: string | null) => void;
}

export const useTwinStore = create<TwinState>((set) => ({
  tick: 0,
  runtime: simulateTick(0, null, null),
  failure: null,
  activeScenarioId: null,
  selectedNodeId: null,

  advance: () =>
    set((s) => {
      const failure = s.failure ? { ...s.failure, age: s.failure.age + 1 } : null;
      const nextTick = s.tick + 1;
      return {
        tick: nextTick,
        failure,
        runtime: simulateTick(nextTick, failure, s.runtime),
      };
    }),

  inject: (scenarioId) =>
    set((s) => {
      const scenario = SCENARIOS.find((sc) => sc.id === scenarioId);
      if (!scenario) return s;
      return {
        activeScenarioId: scenarioId,
        failure: { origin: scenario.origin, age: 0 },
      };
    }),

  reset: () =>
    set((s) => ({
      failure: null,
      activeScenarioId: null,
      runtime: simulateTick(s.tick, null, s.runtime),
    })),

  select: (nodeId) => set({ selectedNodeId: nodeId }),
}));
