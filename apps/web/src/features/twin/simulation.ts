import { EDGES, NODES } from "./topology";
import {
  type Metrics,
  type NodeRuntime,
  scoreToStatus,
} from "./types";

/** Client-side simulation: healthy baselines with noise, plus a failure that
 *  originates on one node and cascades to its DEPENDENTS with attenuation and
 *  delay — the same BFS-over-dependency-edges model the backend uses (§5).
 *  Deterministic given the seed so demos and screenshots are reproducible. */

const HISTORY_LEN = 40;

// who-depends-on-me: reverse of the dependency edges (source depends on target)
const DEPENDENTS = new Map<string, string[]>();
for (const n of NODES) DEPENDENTS.set(n.id, []);
for (const e of EDGES) DEPENDENTS.get(e.target)?.push(e.source);

// mulberry32 — tiny deterministic PRNG so runs are reproducible
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** how far a failure has spread: node id -> impact 0..1 (0 = healthy) */
export type Impact = Map<string, number>;

export interface FailureState {
  origin: string;
  /** ticks since injection */
  age: number;
}

function baselineMetrics(rng: () => number): Metrics {
  return {
    cpu: 18 + rng() * 22,
    memory: 30 + rng() * 25,
    latencyP95: 40 + rng() * 60,
    errorRate: rng() * 0.6,
  };
}

/** Impact map for an active failure, spread by BFS depth from the origin. */
export function computeImpact(failure: FailureState | null): Impact {
  const impact: Impact = new Map();
  if (!failure) return impact;

  // origin ramps in over the first few ticks
  const originImpact = Math.min(1, 0.35 + failure.age * 0.12);
  impact.set(failure.origin, originImpact);

  // BFS to dependents; each hop attenuates and lags one tick
  let frontier = [failure.origin];
  let depth = 0;
  const seen = new Set([failure.origin]);
  while (frontier.length && depth < 6) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const dep of DEPENDENTS.get(id) ?? []) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        const lag = depth + 1;
        if (failure.age < lag) continue; // wave hasn't reached this hop yet
        const attenuation = Math.pow(0.62, depth + 1);
        const reached = Math.min(1, (failure.age - lag) * 0.18);
        impact.set(dep, originImpact * attenuation * reached);
        next.push(dep);
      }
    }
    frontier = next;
    depth += 1;
  }
  return impact;
}

/** Advance every node one tick. Pure-ish: given the same seed+tick+failure it
 *  yields the same runtime, so the graph is reproducible. */
export function simulateTick(
  tick: number,
  failure: FailureState | null,
  prev: Record<string, NodeRuntime> | null,
): Record<string, NodeRuntime> {
  const impact = computeImpact(failure);
  const out: Record<string, NodeRuntime> = {};

  for (const node of NODES) {
    const rng = makeRng(hash(node.id) + tick * 2654435761);
    const base = baselineMetrics(rng);
    const imp = impact.get(node.id) ?? 0;

    // failure pushes cpu/latency/errors up and health down
    const metrics: Metrics = {
      cpu: clamp(base.cpu + imp * 65, 0, 100),
      memory: clamp(base.memory + imp * 45, 0, 100),
      latencyP95: Math.round(base.latencyP95 * (1 + imp * 9)),
      errorRate: round1(base.errorRate + imp * imp * 55),
    };

    const rawScore = 100 - imp * 95 - (metrics.cpu > 85 ? 8 : 0);
    // hysteresis: ease toward the target so colors don't flicker
    const prevScore = prev?.[node.id]?.score ?? 100;
    const score = clamp(prevScore + (rawScore - prevScore) * 0.5, 0, 100);

    const history = (prev?.[node.id]?.history ?? []).concat(metrics.latencyP95);
    if (history.length > HISTORY_LEN) history.splice(0, history.length - HISTORY_LEN);

    out[node.id] = {
      score,
      status: scoreToStatus(score),
      metrics,
      history,
    };
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
