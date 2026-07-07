import { describe, expect, it } from "vitest";
import { computeBlastRadius } from "./blastRadius";
import type { TwinEdgeSpec } from "./types";

// a -> b -> c means a depends on b depends on c
const edges: TwinEdgeSpec[] = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
  { source: "x", target: "y" }, // separate branch
];

describe("computeBlastRadius", () => {
  it("returns transitive dependents of a failing node", () => {
    // if c fails, b and a (which depend on it) are hit
    const hit = computeBlastRadius(edges, "c");
    expect([...hit].sort()).toEqual(["a", "b"]);
  });

  it("excludes the origin itself", () => {
    expect(computeBlastRadius(edges, "c").has("c")).toBe(false);
  });

  it("leaves unrelated branches untouched", () => {
    const hit = computeBlastRadius(edges, "c");
    expect(hit.has("x")).toBe(false);
    expect(hit.has("y")).toBe(false);
  });

  it("returns empty when nothing depends on the node", () => {
    expect(computeBlastRadius(edges, "a").size).toBe(0);
  });
});
