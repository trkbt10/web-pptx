import { describe, it, expect } from "vitest";
import { resolveAxis, applyConstraintsToChildren, type ConstraintKind } from "./constraints";
import type { FigNode } from "@oxen/fig/types";
import { CONSTRAINT_TYPE_VALUES } from "@oxen/fig/constants";

// =============================================================================
// resolveAxis
// =============================================================================

describe("resolveAxis", () => {
  // Parent: 200 -> 300 (delta = +100)
  const parentOrig = 200;
  const parentNew = 300;

  describe("MIN", () => {
    it("keeps position and size unchanged", () => {
      const result = resolveAxis(20, 60, parentOrig, parentNew, "MIN");
      expect(result.pos).toBe(20);
      expect(result.dim).toBe(60);
    });
  });

  describe("MAX", () => {
    it("shifts position by full delta", () => {
      const result = resolveAxis(20, 60, parentOrig, parentNew, "MAX");
      expect(result.pos).toBe(120); // 20 + 100
      expect(result.dim).toBe(60);
    });

    it("shifts position negative when shrinking", () => {
      const result = resolveAxis(20, 60, 300, 200, "MAX");
      expect(result.pos).toBe(-80); // 20 + (-100)
      expect(result.dim).toBe(60);
    });
  });

  describe("CENTER", () => {
    it("shifts position by half delta", () => {
      const result = resolveAxis(20, 60, parentOrig, parentNew, "CENTER");
      expect(result.pos).toBe(70); // 20 + 50
      expect(result.dim).toBe(60);
    });
  });

  describe("STRETCH", () => {
    it("preserves margins and adjusts size", () => {
      // Child at pos=20, size=60 in parent=200
      // leftMargin=20, rightMargin=200-(20+60)=120
      // newSize = 300 - 20 - 120 = 160
      const result = resolveAxis(20, 60, parentOrig, parentNew, "STRETCH");
      expect(result.pos).toBe(20);
      expect(result.dim).toBe(160);
    });

    it("handles full-width stretch (inset:0)", () => {
      // Child fills entire parent: pos=0, size=200 in parent=200
      // leftMargin=0, rightMargin=0
      // newSize = 300 - 0 - 0 = 300
      const result = resolveAxis(0, 200, parentOrig, parentNew, "STRETCH");
      expect(result.pos).toBe(0);
      expect(result.dim).toBe(300);
    });

    it("clamps size to 0 when parent shrinks below margins", () => {
      // Child: pos=50, size=100 in parent=200
      // leftMargin=50, rightMargin=50
      // Parent shrinks to 80: newSize = max(0, 80 - 50 - 50) = max(0, -20) = 0
      const result = resolveAxis(50, 100, 200, 80, "STRETCH");
      expect(result.pos).toBe(50);
      expect(result.dim).toBe(0);
    });
  });

  describe("SCALE", () => {
    it("scales position and size proportionally", () => {
      // ratio = 300 / 200 = 1.5
      const result = resolveAxis(20, 60, parentOrig, parentNew, "SCALE");
      expect(result.pos).toBe(30);  // 20 * 1.5
      expect(result.dim).toBe(90);  // 60 * 1.5
    });

    it("handles zero parent size gracefully", () => {
      const result = resolveAxis(20, 60, 0, 300, "SCALE");
      expect(result.pos).toBe(20);
      expect(result.dim).toBe(60);
    });

    it("scales down proportionally", () => {
      // ratio = 100 / 200 = 0.5
      const result = resolveAxis(20, 60, 200, 100, "SCALE");
      expect(result.pos).toBe(10);  // 20 * 0.5
      expect(result.dim).toBe(30);  // 60 * 0.5
    });
  });

  describe("no-op when sizes are equal", () => {
    for (const kind of ["MIN", "MAX", "CENTER", "STRETCH", "SCALE"] as ConstraintKind[]) {
      it(`${kind} returns same values when parent unchanged`, () => {
        const result = resolveAxis(20, 60, 200, 200, kind);
        expect(result.pos).toBe(20);
        expect(result.dim).toBe(60);
      });
    }
  });
});

// =============================================================================
// applyConstraintsToChildren
// =============================================================================

describe("applyConstraintsToChildren", () => {
  function makeNode(
    x: number,
    y: number,
    w: number,
    h: number,
    hConstraint?: number,
    vConstraint?: number,
  ): FigNode {
    const node: Record<string, unknown> = {
      name: "child",
      transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
      size: { x: w, y: h },
    };
    if (hConstraint !== undefined) {
      node.horizontalConstraint = { value: hConstraint, name: "TEST" };
    }
    if (vConstraint !== undefined) {
      node.verticalConstraint = { value: vConstraint, name: "TEST" };
    }
    return node as FigNode;
  }

  it("returns same nodes when symbol and instance sizes are equal", () => {
    const children = [makeNode(10, 20, 80, 40)];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 200, y: 100 },
    );
    expect(result[0]).toBe(children[0]); // same reference
  });

  it("defaults to MIN when constraints are not set", () => {
    const children = [makeNode(10, 20, 80, 40)];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 300, y: 150 },
    );
    // MIN: position and size unchanged
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].transform?.m12).toBe(20);
    expect(result[0].size?.x).toBe(80);
    expect(result[0].size?.y).toBe(40);
  });

  it("applies STRETCH on both axes (full-fit, inset:0)", () => {
    // Child fills entire parent: pos=0, size=200x100
    const children = [
      makeNode(0, 0, 200, 100,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.STRETCH,
      ),
    ];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 400, y: 200 },
    );
    expect(result[0].transform?.m02).toBe(0);
    expect(result[0].transform?.m12).toBe(0);
    expect(result[0].size?.x).toBe(400);
    expect(result[0].size?.y).toBe(200);
  });

  it("applies STRETCH with margins", () => {
    // Child: pos=(10, 10), size=(180, 80) in parent=(200, 100)
    // H margins: left=10, right=10 -> newW = 380 - 10 - 10 = 380
    // Wait: newW = 400 - 10 - 10 = 380
    const children = [
      makeNode(10, 10, 180, 80,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.STRETCH,
      ),
    ];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 400, y: 200 },
    );
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].transform?.m12).toBe(10);
    expect(result[0].size?.x).toBe(380);
    expect(result[0].size?.y).toBe(180);
  });

  it("applies mixed constraints (H:STRETCH, V:CENTER)", () => {
    const children = [
      makeNode(10, 30, 180, 40,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.CENTER,
      ),
    ];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 400, y: 200 },
    );
    // H: STRETCH margins 10,10 -> newW = 400 - 10 - 10 = 380
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].size?.x).toBe(380);
    // V: CENTER delta=100, shift=50
    expect(result[0].transform?.m12).toBe(80); // 30 + 50
    expect(result[0].size?.y).toBe(40);
  });

  it("applies MAX constraint", () => {
    const children = [
      makeNode(150, 60, 40, 30,
        CONSTRAINT_TYPE_VALUES.MAX,
        CONSTRAINT_TYPE_VALUES.MAX,
      ),
    ];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 300, y: 150 },
    );
    // delta H=100, V=50
    expect(result[0].transform?.m02).toBe(250); // 150 + 100
    expect(result[0].transform?.m12).toBe(110); // 60 + 50
    expect(result[0].size?.x).toBe(40);
    expect(result[0].size?.y).toBe(30);
  });

  it("applies SCALE constraint", () => {
    const children = [
      makeNode(20, 10, 60, 30,
        CONSTRAINT_TYPE_VALUES.SCALE,
        CONSTRAINT_TYPE_VALUES.SCALE,
      ),
    ];
    // ratio H = 400/200 = 2, V = 300/100 = 3
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 400, y: 300 },
    );
    expect(result[0].transform?.m02).toBe(40);  // 20 * 2
    expect(result[0].transform?.m12).toBe(30);  // 10 * 3
    expect(result[0].size?.x).toBe(120);         // 60 * 2
    expect(result[0].size?.y).toBe(90);           // 30 * 3
  });

  it("handles multiple children independently", () => {
    const children = [
      makeNode(0, 0, 100, 50, CONSTRAINT_TYPE_VALUES.STRETCH, CONSTRAINT_TYPE_VALUES.MIN),
      makeNode(120, 60, 60, 30, CONSTRAINT_TYPE_VALUES.MAX, CONSTRAINT_TYPE_VALUES.MAX),
    ];
    const result = applyConstraintsToChildren(
      children,
      { x: 200, y: 100 },
      { x: 300, y: 150 },
    );
    // Child 0: H:STRETCH(0,100,200->300) -> pos=0, dim=200; V:MIN -> 0,50
    expect(result[0].size?.x).toBe(200); // 300 - 0 - (200-100) = 200
    expect(result[0].size?.y).toBe(50);
    // Child 1: H:MAX delta=100 -> 220; V:MAX delta=50 -> 110
    expect(result[1].transform?.m02).toBe(220);
    expect(result[1].transform?.m12).toBe(110);
  });

  it("skips children without transform or size", () => {
    const noTransform = { name: "no-transform", size: { x: 10, y: 10 } } as FigNode;
    const noSize = { name: "no-size", transform: { m02: 0, m12: 0 } } as FigNode;
    const result = applyConstraintsToChildren(
      [noTransform, noSize],
      { x: 200, y: 100 },
      { x: 300, y: 150 },
    );
    expect(result[0]).toBe(noTransform);
    expect(result[1]).toBe(noSize);
  });
});
