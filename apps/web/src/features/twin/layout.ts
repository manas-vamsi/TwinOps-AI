import { EDGES, NODES } from "./topology";
import type { TwinNodeSpec } from "./types";

/** Deterministic layered layout: x by dependency tier, y spread within tier.
 *  No external layout lib needed for ~30 nodes — tiers give a clean
 *  left-to-right dependency flow, which is exactly what a topology reads as. */

const COL_GAP = 260;
const ROW_GAP = 96;

export interface Positioned {
  id: string;
  x: number;
  y: number;
}

export function layoutNodes(): Positioned[] {
  const tiers = new Map<number, TwinNodeSpec[]>();
  for (const n of NODES) {
    const arr = tiers.get(n.tier) ?? [];
    arr.push(n);
    tiers.set(n.tier, arr);
  }

  const positioned: Positioned[] = [];
  const maxRows = Math.max(...[...tiers.values()].map((t) => t.length));
  const tallHeight = (maxRows - 1) * ROW_GAP;

  for (const [tier, nodes] of [...tiers.entries()].sort((a, b) => a[0] - b[0])) {
    const colHeight = (nodes.length - 1) * ROW_GAP;
    const yOffset = (tallHeight - colHeight) / 2; // center each column vertically
    nodes.forEach((node, i) => {
      positioned.push({ id: node.id, x: tier * COL_GAP, y: yOffset + i * ROW_GAP });
    });
  }
  return positioned;
}

/** React Flow edge list from the topology (dependency direction). */
export function layoutEdges() {
  return EDGES.map((e) => ({
    id: `${e.source}->${e.target}`,
    source: e.source,
    target: e.target,
  }));
}
