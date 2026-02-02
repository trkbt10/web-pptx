/**
 * @file Tests for tree-builder
 */

import {
  buildNodeTree,
  guidToString,
  getNodeType,
  findNodesByType,
  findNodeByGuid,
} from "./tree-builder";
import type { FigNode } from "../types";

describe("tree-builder", () => {
  describe("guidToString", () => {
    it("converts guid to string", () => {
      expect(guidToString({ sessionID: 4, localID: 1224 })).toBe("4:1224");
    });

    it("returns empty string for undefined", () => {
      expect(guidToString(undefined)).toBe("");
    });
  });

  describe("buildNodeTree", () => {
    it("builds tree from flat nodes", () => {
      const nodes: FigNode[] = [
        {
          type: "DOCUMENT",
          name: "Doc",
          guid: { sessionID: 0, localID: 0 },
        } as FigNode,
        {
          type: "CANVAS",
          name: "Page 1",
          guid: { sessionID: 0, localID: 1 },
          parentIndex: { guid: { sessionID: 0, localID: 0 } },
        } as FigNode,
        {
          type: "FRAME",
          name: "Frame A",
          guid: { sessionID: 0, localID: 2 },
          parentIndex: { guid: { sessionID: 0, localID: 1 } },
        } as FigNode,
        {
          type: "RECTANGLE",
          name: "Rect",
          guid: { sessionID: 0, localID: 3 },
          parentIndex: { guid: { sessionID: 0, localID: 2 } },
        } as FigNode,
      ];

      const result = buildNodeTree(nodes);

      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].name).toBe("Doc");
      expect(result.roots[0].children).toHaveLength(1);
      expect(result.roots[0].children![0].name).toBe("Page 1");
      expect(result.roots[0].children![0].children).toHaveLength(1);
      expect(result.roots[0].children![0].children![0].name).toBe("Frame A");
      expect(result.roots[0].children![0].children![0].children).toHaveLength(1);
      expect(result.roots[0].children![0].children![0].children![0].name).toBe("Rect");
    });

    it("handles multiple roots", () => {
      const nodes: FigNode[] = [
        { type: "DOCUMENT", name: "Doc1", guid: { sessionID: 0, localID: 0 } } as FigNode,
        { type: "DOCUMENT", name: "Doc2", guid: { sessionID: 1, localID: 0 } } as FigNode,
      ];

      const result = buildNodeTree(nodes);
      expect(result.roots).toHaveLength(2);
    });

    it("handles nodes without children", () => {
      const nodes: FigNode[] = [
        { type: "DOCUMENT", name: "Doc", guid: { sessionID: 0, localID: 0 } } as FigNode,
      ];

      const result = buildNodeTree(nodes);
      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].children).toBeUndefined();
    });
  });

  describe("getNodeType", () => {
    it("returns string type", () => {
      const node = { type: "FRAME" } as FigNode;
      expect(getNodeType(node)).toBe("FRAME");
    });

    it("returns name from object type", () => {
      // Figma sometimes uses enum objects for type
      const node = { type: { name: "RECTANGLE", value: 10 } } as unknown as FigNode;
      expect(getNodeType(node)).toBe("RECTANGLE");
    });

    it("returns UNKNOWN for missing type", () => {
      const node = {} as FigNode;
      expect(getNodeType(node)).toBe("UNKNOWN");
    });
  });

  describe("findNodesByType", () => {
    it("finds all nodes of given type", () => {
      const tree: FigNode[] = [
        {
          type: "DOCUMENT",
          name: "Doc",
          children: [
            {
              type: "CANVAS",
              name: "Page",
              children: [
                { type: "FRAME", name: "F1" } as FigNode,
                { type: "FRAME", name: "F2" } as FigNode,
                { type: "TEXT", name: "T1" } as FigNode,
              ],
            } as FigNode,
          ],
        } as FigNode,
      ];

      const frames = findNodesByType(tree, "FRAME");
      expect(frames).toHaveLength(2);
      expect(frames.map(f => f.name)).toEqual(["F1", "F2"]);
    });
  });

  describe("findNodeByGuid", () => {
    it("finds node by guid string", () => {
      const nodes: FigNode[] = [
        { type: "FRAME", name: "Target", guid: { sessionID: 1, localID: 42 } } as FigNode,
      ];

      const { nodeMap } = buildNodeTree(nodes);
      const found = findNodeByGuid(nodeMap, "1:42");

      expect(found).toBeDefined();
      expect(found!.name).toBe("Target");
    });

    it("returns undefined for unknown guid", () => {
      const { nodeMap } = buildNodeTree([]);
      expect(findNodeByGuid(nodeMap, "999:999")).toBeUndefined();
    });
  });
});
