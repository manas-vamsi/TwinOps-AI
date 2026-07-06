import type { TwinEdgeSpec } from "./types";

/** What-if blast radius: if `origin` failed, which nodes would degrade?
 *  Follows dependents (edges where target === node) transitively. Pure and
 *  client-side — reuses the graph we already have, no backend call. */
export function computeBlastRadius(edges: TwinEdgeSpec[], origin: string): Set<string> {
  const dependents = new Map<string, string[]>();
  for (const e of edges) {
    const arr = dependents.get(e.target) ?? [];
    arr.push(e.source);
    dependents.set(e.target, arr);
  }

  const affected = new Set<string>();
  let frontier = [origin];
  while (frontier.length) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const dep of dependents.get(node) ?? []) {
        if (!affected.has(dep)) {
          affected.add(dep);
          next.push(dep);
        }
      }
    }
    frontier = next;
  }
  return affected; // excludes the origin itself
}
