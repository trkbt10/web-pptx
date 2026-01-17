/**
 * @file text-merge.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "../../docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "../../docx/domain/run";
import {
  mergeTextIntoParagraph,
  splitRunAtOffset,
  mergeAdjacentRuns,
  getRunPropertiesAtPosition,
  insertTextAtOffset,
  deleteTextRange,
  applyFormatToRange,
} from "./text-merge";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSimpleParagraph(text: string, properties?: DocxRunProperties): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties,
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createMultiRunParagraph(): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: { b: true },
        content: [{ type: "text", value: "Bold" }],
      },
      {
        type: "run",
        properties: { i: true },
        content: [{ type: "text", value: "Italic" }],
      },
      {
        type: "run",
        content: [{ type: "text", value: "Normal" }],
      },
    ],
  };
}

function getTextFromParagraph(paragraph: DocxParagraph): string {
  return paragraph.content
    .filter((c): c is DocxRun => c.type === "run")
    .flatMap((r) => r.content)
    .map((c) => (c.type === "text" ? c.value : ""))
    .join("");
}

// =============================================================================
// Tests
// =============================================================================

describe("text-merge", () => {
  describe("mergeTextIntoParagraph", () => {
    it("merges text into simple paragraph", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = mergeTextIntoParagraph(paragraph, "World");
      expect(getTextFromParagraph(result)).toBe("World");
    });

    it("preserves paragraph properties", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        properties: { jc: "center" },
        content: [{ type: "run", content: [{ type: "text", value: "Old" }] }],
      };
      const result = mergeTextIntoParagraph(paragraph, "New");
      expect(result.properties?.jc).toBe("center");
    });

    it("preserves run properties from first run", () => {
      const paragraph = createSimpleParagraph("Hello", { b: true });
      const result = mergeTextIntoParagraph(paragraph, "World");
      const run = result.content[0];
      expect(run.type).toBe("run");
      if (run.type === "run") {
        expect(run.properties?.b).toBe(true);
      }
    });

    it("handles empty text", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = mergeTextIntoParagraph(paragraph, "");
      expect(result.content).toHaveLength(0);
    });

    it("handles empty paragraph", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [],
      };
      const result = mergeTextIntoParagraph(paragraph, "New text");
      expect(getTextFromParagraph(result)).toBe("New text");
    });
  });

  describe("splitRunAtOffset", () => {
    it("splits run at middle", () => {
      const run: DocxRun = {
        type: "run",
        properties: { b: true },
        content: [{ type: "text", value: "Hello" }],
      };
      const [before, after] = splitRunAtOffset(run, 2);

      expect(before.content).toHaveLength(1);
      expect(after.content).toHaveLength(1);

      if (before.content[0].type === "text") {
        expect(before.content[0].value).toBe("He");
      }
      if (after.content[0].type === "text") {
        expect(after.content[0].value).toBe("llo");
      }
    });

    it("preserves properties in both parts", () => {
      const run: DocxRun = {
        type: "run",
        properties: { b: true, i: true },
        content: [{ type: "text", value: "Hello" }],
      };
      const [before, after] = splitRunAtOffset(run, 2);

      expect(before.properties?.b).toBe(true);
      expect(before.properties?.i).toBe(true);
      expect(after.properties?.b).toBe(true);
      expect(after.properties?.i).toBe(true);
    });

    it("handles split at start", () => {
      const run: DocxRun = {
        type: "run",
        content: [{ type: "text", value: "Hello" }],
      };
      const [before, after] = splitRunAtOffset(run, 0);

      expect(before.content).toHaveLength(0);
      if (after.content[0]?.type === "text") {
        expect(after.content[0].value).toBe("Hello");
      }
    });

    it("handles split at end", () => {
      const run: DocxRun = {
        type: "run",
        content: [{ type: "text", value: "Hello" }],
      };
      const [before, after] = splitRunAtOffset(run, 5);

      if (before.content[0]?.type === "text") {
        expect(before.content[0].value).toBe("Hello");
      }
      expect(after.content).toHaveLength(0);
    });
  });

  describe("mergeAdjacentRuns", () => {
    it("merges runs with same properties", () => {
      const content: DocxRun[] = [
        { type: "run", properties: { b: true }, content: [{ type: "text", value: "Hello" }] },
        { type: "run", properties: { b: true }, content: [{ type: "text", value: " World" }] },
      ];
      const result = mergeAdjacentRuns(content);

      expect(result).toHaveLength(1);
      const run = result[0];
      if (run.type === "run") {
        expect(run.content).toHaveLength(2);
      }
    });

    it("does not merge runs with different properties", () => {
      const content: DocxRun[] = [
        { type: "run", properties: { b: true }, content: [{ type: "text", value: "Bold" }] },
        { type: "run", properties: { i: true }, content: [{ type: "text", value: "Italic" }] },
      ];
      const result = mergeAdjacentRuns(content);

      expect(result).toHaveLength(2);
    });

    it("handles empty content array", () => {
      const result = mergeAdjacentRuns([]);
      expect(result).toHaveLength(0);
    });

    it("preserves non-run content", () => {
      const content = [
        { type: "run" as const, content: [{ type: "text" as const, value: "Before" }] },
        { type: "bookmarkStart" as const, id: 1, name: "test" },
        { type: "run" as const, content: [{ type: "text" as const, value: "After" }] },
      ];
      const result = mergeAdjacentRuns(content);

      expect(result).toHaveLength(3);
      expect(result[1].type).toBe("bookmarkStart");
    });
  });

  describe("getRunPropertiesAtPosition", () => {
    it("returns properties of first run at start", () => {
      const paragraph = createMultiRunParagraph();
      const props = getRunPropertiesAtPosition(paragraph, 0);
      expect(props?.b).toBe(true);
    });

    it("returns properties at middle of first run", () => {
      const paragraph = createMultiRunParagraph();
      const props = getRunPropertiesAtPosition(paragraph, 2);
      expect(props?.b).toBe(true);
    });

    it("returns properties of second run", () => {
      const paragraph = createMultiRunParagraph();
      // "Bold" = 4 chars, so position 5 is in "Italic"
      const props = getRunPropertiesAtPosition(paragraph, 5);
      expect(props?.i).toBe(true);
    });

    it("returns last run properties past end", () => {
      const paragraph = createMultiRunParagraph();
      const props = getRunPropertiesAtPosition(paragraph, 100);
      // Last run has no properties
      expect(props).toBeUndefined();
    });

    it("handles empty paragraph", () => {
      const paragraph: DocxParagraph = { type: "paragraph", content: [] };
      const props = getRunPropertiesAtPosition(paragraph, 0);
      expect(props).toBeUndefined();
    });
  });

  describe("insertTextAtOffset", () => {
    it("inserts text at beginning", () => {
      const paragraph = createSimpleParagraph("World");
      const result = insertTextAtOffset(paragraph, 0, "Hello ");
      expect(getTextFromParagraph(result)).toBe("Hello World");
    });

    it("inserts text at middle", () => {
      const paragraph = createSimpleParagraph("Helo");
      const result = insertTextAtOffset(paragraph, 2, "l");
      expect(getTextFromParagraph(result)).toBe("Hello");
    });

    it("inserts text at end", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = insertTextAtOffset(paragraph, 5, " World");
      expect(getTextFromParagraph(result)).toBe("Hello World");
    });
  });

  describe("deleteTextRange", () => {
    it("deletes text from middle", () => {
      const paragraph = createSimpleParagraph("Hello World");
      const result = deleteTextRange(paragraph, 5, 11);
      expect(getTextFromParagraph(result)).toBe("Hello");
    });

    it("deletes text from start", () => {
      const paragraph = createSimpleParagraph("Hello World");
      const result = deleteTextRange(paragraph, 0, 6);
      expect(getTextFromParagraph(result)).toBe("World");
    });

    it("deletes all text", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = deleteTextRange(paragraph, 0, 5);
      expect(result.content).toHaveLength(0);
    });
  });

  describe("applyFormatToRange", () => {
    it("applies bold to middle of text", () => {
      const paragraph = createSimpleParagraph("Hello World");
      const result = applyFormatToRange(paragraph, 6, 11, { b: true });

      // Should have 2 runs: "Hello " and "World" (bold)
      expect(result.content).toHaveLength(2);
      const runs = result.content.filter((c): c is DocxRun => c.type === "run");
      expect(runs[0].properties?.b).toBeUndefined();
      expect(runs[1].properties?.b).toBe(true);
    });

    it("applies format to entire text", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = applyFormatToRange(paragraph, 0, 5, { i: true });

      expect(result.content).toHaveLength(1);
      const run = result.content[0];
      if (run.type === "run") {
        expect(run.properties?.i).toBe(true);
      }
    });

    it("handles empty selection", () => {
      const paragraph = createSimpleParagraph("Hello");
      const result = applyFormatToRange(paragraph, 2, 2, { b: true });

      // Should preserve original text
      expect(getTextFromParagraph(result)).toBe("Hello");
    });
  });
});
