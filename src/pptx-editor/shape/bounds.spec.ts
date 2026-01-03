/**
 * @file Unit tests for shape/bounds.ts
 */

import { describe, expect, it } from "bun:test";
import type { SpShape, Shape } from "../../pptx/domain";
import { px, deg } from "../../pptx/domain/types";
import {
  getShapeBounds,
  getCombinedBounds,
  collectBoundsForIds,
  getCombinedCenter,
} from "./bounds";

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestShape = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): SpShape =>
  ({
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: {
        x: px(x),
        y: px(y),
        width: px(width),
        height: px(height),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
    },
  }) as SpShape;

// =============================================================================
// getShapeBounds Tests
// =============================================================================

describe("getShapeBounds", () => {
  it("returns bounds from shape with transform", () => {
    const shape = createTestShape("1", 10, 20, 100, 50);
    const bounds = getShapeBounds(shape);

    expect(bounds).toBeDefined();
    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(20);
    expect(bounds?.width).toBe(100);
    expect(bounds?.height).toBe(50);
  });

  it("returns undefined for shape without transform", () => {
    const shape = {
      type: "sp",
      nonVisual: { id: "1", name: "Shape 1" },
      properties: {},
    } as unknown as Shape;

    const bounds = getShapeBounds(shape);
    expect(bounds).toBeUndefined();
  });

  it("returns undefined for shape without properties", () => {
    const shape = {
      type: "contentPart",
    } as unknown as Shape;

    const bounds = getShapeBounds(shape);
    expect(bounds).toBeUndefined();
  });
});

// =============================================================================
// getCombinedBounds Tests
// =============================================================================

describe("getCombinedBounds", () => {
  it("returns undefined for empty array", () => {
    const bounds = getCombinedBounds([]);
    expect(bounds).toBeUndefined();
  });

  it("returns bounds of single shape", () => {
    const shapes = [createTestShape("1", 10, 20, 100, 50)];
    const bounds = getCombinedBounds(shapes);

    expect(bounds).toBeDefined();
    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(20);
    expect(bounds?.width).toBe(100);
    expect(bounds?.height).toBe(50);
  });

  it("calculates combined bounds for multiple shapes", () => {
    const shapes = [
      createTestShape("1", 10, 20, 100, 50), // x: 10-110, y: 20-70
      createTestShape("2", 50, 60, 80, 40), // x: 50-130, y: 60-100
    ];
    const bounds = getCombinedBounds(shapes);

    expect(bounds).toBeDefined();
    expect(bounds?.x).toBe(10); // minX
    expect(bounds?.y).toBe(20); // minY
    expect(bounds?.width).toBe(120); // 130 - 10
    expect(bounds?.height).toBe(80); // 100 - 20
  });

  it("handles shapes with negative coordinates", () => {
    const shapes = [
      createTestShape("1", -50, -30, 100, 50),
      createTestShape("2", 20, 10, 60, 40),
    ];
    const bounds = getCombinedBounds(shapes);

    expect(bounds).toBeDefined();
    expect(bounds?.x).toBe(-50);
    expect(bounds?.y).toBe(-30);
    expect(bounds?.width).toBe(130); // 80 - (-50)
    expect(bounds?.height).toBe(80); // 50 - (-30)
  });

  it("skips shapes without valid bounds", () => {
    const validShape = createTestShape("1", 10, 20, 100, 50);
    const invalidShape = {
      type: "sp",
      nonVisual: { id: "2", name: "Shape 2" },
      properties: {},
    } as unknown as Shape;

    const bounds = getCombinedBounds([validShape, invalidShape]);

    expect(bounds).toBeDefined();
    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(20);
  });

  it("returns undefined when all shapes lack bounds", () => {
    const shapes = [
      { type: "contentPart" } as unknown as Shape,
      {
        type: "sp",
        nonVisual: { id: "1", name: "Shape 1" },
        properties: {},
      } as unknown as Shape,
    ];
    const bounds = getCombinedBounds(shapes);
    expect(bounds).toBeUndefined();
  });
});

// =============================================================================
// collectBoundsForIds Tests
// =============================================================================

describe("collectBoundsForIds", () => {
  it("returns empty map for empty ID array", () => {
    const shapes = [createTestShape("1", 10, 20, 100, 50)];
    const boundsMap = collectBoundsForIds(shapes, []);

    expect(boundsMap.size).toBe(0);
  });

  it("collects bounds for specified IDs", () => {
    const shapes = [
      createTestShape("1", 10, 20, 100, 50),
      createTestShape("2", 50, 60, 80, 40),
      createTestShape("3", 100, 100, 60, 60),
    ];
    const boundsMap = collectBoundsForIds(shapes, ["1", "3"]);

    expect(boundsMap.size).toBe(2);
    expect(boundsMap.has("1")).toBe(true);
    expect(boundsMap.has("2")).toBe(false);
    expect(boundsMap.has("3")).toBe(true);

    const bounds1 = boundsMap.get("1");
    expect(bounds1?.x).toBe(10);
    expect(bounds1?.y).toBe(20);
  });

  it("skips IDs that do not exist in shapes", () => {
    const shapes = [createTestShape("1", 10, 20, 100, 50)];
    const boundsMap = collectBoundsForIds(shapes, ["1", "nonexistent"]);

    expect(boundsMap.size).toBe(1);
    expect(boundsMap.has("1")).toBe(true);
    expect(boundsMap.has("nonexistent")).toBe(false);
  });

  it("skips shapes without valid bounds", () => {
    const validShape = createTestShape("1", 10, 20, 100, 50);
    const invalidShape = {
      type: "sp",
      nonVisual: { id: "2", name: "Shape 2" },
      properties: {},
    } as unknown as Shape;

    const boundsMap = collectBoundsForIds(
      [validShape, invalidShape],
      ["1", "2"]
    );

    expect(boundsMap.size).toBe(1);
    expect(boundsMap.has("1")).toBe(true);
    expect(boundsMap.has("2")).toBe(false);
  });
});

// =============================================================================
// getCombinedCenter Tests
// =============================================================================

describe("getCombinedCenter", () => {
  it("returns undefined for empty map", () => {
    const boundsMap = new Map();
    const center = getCombinedCenter(boundsMap);
    expect(center).toBeUndefined();
  });

  it("returns center of single shape", () => {
    const boundsMap = new Map([
      ["1", { x: px(0), y: px(0), width: px(100), height: px(50) }],
    ]);
    const center = getCombinedCenter(boundsMap);

    expect(center).toBeDefined();
    expect(center?.centerX).toBe(50); // 0 + 100/2
    expect(center?.centerY).toBe(25); // 0 + 50/2
  });

  it("calculates average center for multiple shapes", () => {
    const boundsMap = new Map([
      ["1", { x: px(0), y: px(0), width: px(100), height: px(100) }], // center: (50, 50)
      ["2", { x: px(100), y: px(100), width: px(100), height: px(100) }], // center: (150, 150)
    ]);
    const center = getCombinedCenter(boundsMap);

    expect(center).toBeDefined();
    expect(center?.centerX).toBe(100); // (50 + 150) / 2
    expect(center?.centerY).toBe(100); // (50 + 150) / 2
  });

  it("handles shapes with negative coordinates", () => {
    const boundsMap = new Map([
      ["1", { x: px(-100), y: px(-50), width: px(100), height: px(50) }], // center: (-50, -25)
    ]);
    const center = getCombinedCenter(boundsMap);

    expect(center).toBeDefined();
    expect(center?.centerX).toBe(-50);
    expect(center?.centerY).toBe(-25);
  });
});
