import { describe, expect, it } from "vitest";
import { layoutNodes, layoutEdges } from "./layout";
import type { TwinNodeSpec } from "./types";

const nodes: TwinNodeSpec[] = [
  { id: "a", kind: "service", label: "A", tier: 0 },
  { id: "b", kind: "service", label: "B", tier: 1 },
  { id: "c", kind: "service", label: "C", tier: 1 },
];

describe("layoutNodes", () => {
  it("positions one node per input and groups columns by tier", () => {
    const pos = layoutNodes(nodes);
    expect(pos).toHaveLength(3);
    const byId = new Map(pos.map((p) => [p.id, p]));
    // tier 1 nodes share an x, distinct from tier 0
    expect(byId.get("b")!.x).toBe(byId.get("c")!.x);
    expect(byId.get("a")!.x).not.toBe(byId.get("b")!.x);
    // same-tier nodes get distinct y
    expect(byId.get("b")!.y).not.toBe(byId.get("c")!.y);
  });

  it("is deterministic", () => {
    expect(layoutNodes(nodes)).toEqual(layoutNodes(nodes));
  });

  it("handles an empty topology without throwing", () => {
    expect(layoutNodes([])).toEqual([]);
  });
});

describe("layoutEdges", () => {
  it("builds stable edge ids", () => {
    expect(layoutEdges([{ source: "a", target: "b" }])[0].id).toBe("a->b");
  });
});
