/**
 * @file Slide Patcher Tests
 */

import type { XmlDocument, XmlElement } from "../../../xml";
import { isXmlElement, getChild, getByPath } from "../../../xml";
import type { ShapeChange, PropertyChange, TransformChange } from "../core/shape-differ";
import type { Transform } from "../../domain/geometry";
import { px, deg } from "../../domain/types";
import { patchSlideXml, getSpTree, hasShapes } from "./slide-patcher";
import { createElement } from "../core/xml-mutator";

// =============================================================================
// Test Helpers
// =============================================================================

function createSlideDocument(shapes: XmlElement[]): XmlDocument {
  const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
  const grpSpPr = createElement("p:grpSpPr");
  const spTree = createElement("p:spTree", {}, [nvGrpSpPr, grpSpPr, ...shapes]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

function createShapeElement(id: string, x = 0, y = 0, width = 100, height = 100): XmlElement {
  return createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id, name: `Shape ${id}` }),
      createElement("p:cNvSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:spPr", {}, [
      createElement("a:xfrm", {}, [
        createElement("a:off", { x: String(x), y: String(y) }),
        createElement("a:ext", { cx: String(width), cy: String(height) }),
      ]),
    ]),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr"),
      createElement("a:lstStyle"),
      createElement("a:p"),
    ]),
  ]);
}

function createTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}> = {}): Transform {
  const defaults = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
  return {
    x: px(defaults.x),
    y: px(defaults.y),
    width: px(defaults.width),
    height: px(defaults.height),
    rotation: deg(defaults.rotation),
    flipH: defaults.flipH,
    flipV: defaults.flipV,
  };
}

function getShapeById(doc: XmlDocument, id: string): XmlElement | null {
  const spTree = getSpTree(doc);
  if (!spTree) return null;

  for (const child of spTree.children) {
    if (!isXmlElement(child)) continue;
    if (child.name !== "p:sp") continue;

    const nvSpPr = getChild(child, "p:nvSpPr");
    if (!nvSpPr) continue;

    const cNvPr = getChild(nvSpPr, "p:cNvPr");
    if (cNvPr && cNvPr.attrs.id === id) {
      return child;
    }
  }

  return null;
}

function getXfrmFromShape(shape: XmlElement): XmlElement | null {
  const spPr = getChild(shape, "p:spPr");
  if (!spPr) return null;
  return getChild(spPr, "a:xfrm") ?? null;
}

// =============================================================================
// patchSlideXml Tests
// =============================================================================

describe("patchSlideXml", () => {
  describe("shape removal", () => {
    it("removes a shape from the slide", () => {
      const shape1 = createShapeElement("2");
      const shape2 = createShapeElement("3");
      const doc = createSlideDocument([shape1, shape2]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "2" },
      ];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result);

      expect(spTree).not.toBeNull();
      // Should have nvGrpSpPr, grpSpPr, and one shape (id=3)
      const shapes = spTree!.children.filter(
        (c) => isXmlElement(c) && c.name === "p:sp",
      );
      expect(shapes).toHaveLength(1);
      expect(getShapeById(result, "2")).toBeNull();
      expect(getShapeById(result, "3")).not.toBeNull();
    });

    it("does nothing when shape not found", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "999" },
      ];

      const result = patchSlideXml(doc, changes);
      expect(getShapeById(result, "2")).not.toBeNull();
    });
  });

  describe("transform modification", () => {
    it("updates position in a:xfrm", () => {
      const shape = createShapeElement("2", 0, 0);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ x: 0, y: 0 }),
              newValue: createTransform({ x: 500, y: 300 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      expect(modifiedShape).not.toBeNull();

      const xfrm = getXfrmFromShape(modifiedShape!);
      expect(xfrm).not.toBeNull();

      const off = getChild(xfrm!, "a:off");
      expect(off?.attrs.x).toBe("500");
      expect(off?.attrs.y).toBe("300");
    });

    it("updates size in a:xfrm", () => {
      const shape = createShapeElement("2", 0, 0, 100, 100);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ width: 100, height: 100 }),
              newValue: createTransform({ width: 200, height: 150 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      const ext = getChild(xfrm!, "a:ext");
      expect(ext?.attrs.cx).toBe("200");
      expect(ext?.attrs.cy).toBe("150");
    });

    it("adds rotation attribute when non-zero", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ rotation: 0 }),
              newValue: createTransform({ rotation: 45 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      // 45 degrees = 45 * 60000 = 2700000
      expect(xfrm?.attrs.rot).toBe("2700000");
    });

    it("does not add rotation attribute when zero", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ x: 10 }), // No rotation
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      expect(xfrm?.attrs.rot).toBeUndefined();
    });

    it("adds flip attributes when true", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ flipH: true, flipV: true }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      expect(xfrm?.attrs.flipH).toBe("1");
      expect(xfrm?.attrs.flipV).toBe("1");
    });
  });

  describe("multiple changes", () => {
    it("applies multiple changes in order", () => {
      const shape1 = createShapeElement("2", 0, 0);
      const shape2 = createShapeElement("3", 100, 100);
      const shape3 = createShapeElement("4", 200, 200);
      const doc = createSlideDocument([shape1, shape2, shape3]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "2" },
        {
          type: "modified",
          shapeId: "3",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ x: 100 }),
              newValue: createTransform({ x: 999 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);

      // Shape 2 should be removed
      expect(getShapeById(result, "2")).toBeNull();

      // Shape 3 should be modified
      const modifiedShape = getShapeById(result, "3");
      const xfrm = getXfrmFromShape(modifiedShape!);
      const off = getChild(xfrm!, "a:off");
      expect(off?.attrs.x).toBe("999");

      // Shape 4 should be unchanged
      const unchangedShape = getShapeById(result, "4");
      expect(unchangedShape).not.toBeNull();
    });
  });

  describe("empty changes", () => {
    it("returns document unchanged when no changes", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const result = patchSlideXml(doc, []);

      expect(result).toEqual(doc);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("getSpTree", () => {
  it("returns spTree from slide document", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    const spTree = getSpTree(doc);

    expect(spTree).not.toBeNull();
    expect(spTree?.name).toBe("p:spTree");
  });

  it("returns null for empty document", () => {
    const doc: XmlDocument = { children: [] };

    const spTree = getSpTree(doc);

    expect(spTree).toBeNull();
  });

  it("returns null when cSld is missing", () => {
    const root = createElement("p:sld");
    const doc: XmlDocument = { children: [root] };

    const spTree = getSpTree(doc);

    expect(spTree).toBeNull();
  });
});

describe("hasShapes", () => {
  it("returns true when slide has shapes", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    expect(hasShapes(doc)).toBe(true);
  });

  it("returns false when slide has no shapes", () => {
    const doc = createSlideDocument([]);

    expect(hasShapes(doc)).toBe(false);
  });

  it("returns false for empty document", () => {
    const doc: XmlDocument = { children: [] };

    expect(hasShapes(doc)).toBe(false);
  });
});
