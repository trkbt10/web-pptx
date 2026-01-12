/**
 * @file Tests for SpatialGroupingStrategy
 */

import type { PdfText } from "../../domain";
import { createDefaultGraphicsState } from "../../domain";
import { SpatialGroupingStrategy } from "./spatial-grouping";

describe("SpatialGroupingStrategy", () => {
  const createPdfText = (overrides: Partial<PdfText> = {}): PdfText => ({
    type: "text",
    text: "Test",
    x: 0,
    y: 0,
    width: 50,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  describe("empty input", () => {
    it("returns empty array for empty input", () => {
      const strategy = new SpatialGroupingStrategy();
      expect(strategy.group([])).toEqual([]);
    });
  });

  describe("single text", () => {
    it("wraps single text in GroupedText", () => {
      const strategy = new SpatialGroupingStrategy();
      const text = createPdfText({ text: "Hello", x: 10, y: 100 });

      const groups = strategy.group([text]);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs[0].text).toBe("Hello");
    });
  });

  describe("line grouping", () => {
    it("groups texts on the same Y coordinate into one paragraph", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100 }),
        createPdfText({ text: "World", x: 60, y: 100 }),
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(2);
    });

    it("groups texts within Y tolerance into same paragraph", () => {
      const strategy = new SpatialGroupingStrategy({ lineToleranceRatio: 0.2 });
      // fontSize = 12, tolerance = 12 * 0.2 = 2.4
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100 }),
        createPdfText({ text: "World", x: 60, y: 102 }), // within tolerance
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
    });

    it("separates texts beyond Y tolerance into different paragraphs", () => {
      const strategy = new SpatialGroupingStrategy({ lineToleranceRatio: 0.2 });
      // fontSize = 12, tolerance = 12 * 0.2 = 2.4
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100 }),
        createPdfText({ text: "Line2", x: 0, y: 90 }), // beyond tolerance
      ];

      const groups = strategy.group(texts);

      // May be in same block but different paragraphs, or separate blocks
      const totalParagraphs = groups.reduce(
        (sum, g) => sum + g.paragraphs.length,
        0
      );
      expect(totalParagraphs).toBe(2);
    });
  });

  describe("horizontal grouping", () => {
    it("includes adjacent texts within horizontal gap ratio", () => {
      const strategy = new SpatialGroupingStrategy({ horizontalGapRatio: 2.0 });
      // Width per text = 50, chars ~ 4 = avg 12.5 per char, max gap = 25
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100, width: 50 }),
        createPdfText({ text: "World", x: 60, y: 100, width: 50 }), // gap = 10
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(2);
    });

    it("excludes texts beyond horizontal gap ratio", () => {
      const strategy = new SpatialGroupingStrategy({ horizontalGapRatio: 0.5 });
      // Very tight gap ratio
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100, width: 50 }),
        createPdfText({ text: "World", x: 200, y: 100, width: 50 }), // gap = 150
      ];

      const groups = strategy.group(texts);

      // Texts are too far apart, so only first run is included
      expect(groups[0].paragraphs[0].runs.length).toBeLessThanOrEqual(1);
    });

    it("sorts texts by X coordinate within a line", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ text: "World", x: 60, y: 100 }),
        createPdfText({ text: "Hello", x: 0, y: 100 }),
      ];

      const groups = strategy.group(texts);

      expect(groups[0].paragraphs[0].runs[0].text).toBe("Hello");
    });
  });

  describe("vertical block merging", () => {
    it("merges adjacent lines with same font into one block", () => {
      const strategy = new SpatialGroupingStrategy({ verticalGapRatio: 1.5 });
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100, height: 12 }),
        createPdfText({ text: "Line2", x: 0, y: 84, height: 12 }), // gap = 4 < 18
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(2);
    });

    it("separates lines with large vertical gap into different blocks", () => {
      const strategy = new SpatialGroupingStrategy({ verticalGapRatio: 0.5 });
      const texts = [
        createPdfText({ text: "Block1", x: 0, y: 100, height: 12 }),
        createPdfText({ text: "Block2", x: 0, y: 50, height: 12 }), // large gap
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(2);
    });
  });

  describe("font matching", () => {
    it("separates texts with different font names into different blocks", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ text: "Normal", x: 0, y: 100, fontName: "Helvetica" }),
        createPdfText({
          text: "Bold",
          x: 0,
          y: 86,
          fontName: "Helvetica-Bold",
        }),
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(2);
    });

    it("separates texts with different font sizes into different blocks", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ text: "Small", x: 0, y: 100, fontSize: 12, height: 12 }),
        createPdfText({ text: "Large", x: 0, y: 80, fontSize: 24, height: 24 }),
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(2);
    });

    it("groups texts with same font style (ignoring subset prefix)", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({
          text: "Line1",
          x: 0,
          y: 100,
          fontName: "ABCDEF+Helvetica",
        }),
        createPdfText({
          text: "Line2",
          x: 0,
          y: 86,
          fontName: "GHIJKL+Helvetica",
        }),
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
    });

    it("allows small font size differences within tolerance", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100, fontSize: 12 }),
        createPdfText({ text: "Line2", x: 0, y: 86, fontSize: 12.5 }), // 4% diff
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
    });
  });

  describe("bounds calculation", () => {
    it("calculates correct bounds for single text", () => {
      const strategy = new SpatialGroupingStrategy();
      const text = createPdfText({
        x: 10,
        y: 100,
        width: 50,
        height: 12,
      });

      const [group] = strategy.group([text]);

      expect(group.bounds).toEqual({
        x: 10,
        y: 100,
        width: 50,
        height: 12,
      });
    });

    it("calculates correct bounds for multiple texts on same line", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ x: 10, y: 100, width: 40, height: 12 }),
        createPdfText({ x: 60, y: 100, width: 50, height: 12 }),
      ];

      const [group] = strategy.group(texts);

      expect(group.bounds).toEqual({
        x: 10,
        y: 100,
        width: 100, // 110 - 10
        height: 12,
      });
    });

    it("calculates correct bounds for multi-line block", () => {
      const strategy = new SpatialGroupingStrategy({ verticalGapRatio: 2.0 });
      const texts = [
        createPdfText({ x: 0, y: 100, width: 50, height: 12 }),
        createPdfText({ x: 0, y: 85, width: 80, height: 12 }),
      ];

      const [group] = strategy.group(texts);

      expect(group.bounds.x).toBe(0);
      expect(group.bounds.y).toBe(85);
      expect(group.bounds.width).toBe(80);
      expect(group.bounds.height).toBe(27); // 112 - 85
    });
  });

  describe("baselineY", () => {
    it("calculates baselineY from font metrics", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({ x: 0, y: 100, height: 12, fontSize: 12 }),
        createPdfText({ x: 60, y: 101, height: 12, fontSize: 12 }),
      ];

      const [group] = strategy.group(texts);

      // Baseline calculation:
      // - First text y (bottom edge) = 100
      // - Default descender = -200 (1/1000 em units)
      // - fontSize = 12
      // - baseline = y - (descender * fontSize / 1000) = 100 - (-200 * 12 / 1000) = 102.4
      expect(group.paragraphs[0].baselineY).toBeCloseTo(102.4, 1);
    });

    it("uses fontMetrics descender when available", () => {
      const strategy = new SpatialGroupingStrategy();
      const texts = [
        createPdfText({
          x: 0,
          y: 100,
          height: 12,
          fontSize: 12,
          fontMetrics: { ascender: 800, descender: -250 },
        }),
      ];

      const [group] = strategy.group(texts);

      // baseline = y - (descender * fontSize / 1000) = 100 - (-250 * 12 / 1000) = 103
      expect(group.paragraphs[0].baselineY).toBeCloseTo(103, 1);
    });
  });

  describe("custom options", () => {
    it("respects custom lineToleranceRatio", () => {
      const strategy = new SpatialGroupingStrategy({ lineToleranceRatio: 0.5 });
      // fontSize = 12, tolerance = 12 * 0.5 = 6
      const texts = [
        createPdfText({ text: "A", x: 0, y: 100 }),
        createPdfText({ text: "B", x: 60, y: 105 }), // within 6
      ];

      const groups = strategy.group(texts);

      expect(groups[0].paragraphs).toHaveLength(1);
    });

    it("respects custom verticalGapRatio", () => {
      const strategy = new SpatialGroupingStrategy({ verticalGapRatio: 3.0 });
      const texts = [
        createPdfText({ x: 0, y: 100, height: 12 }),
        createPdfText({ x: 0, y: 60, height: 12 }), // gap = 28 < 36
      ];

      const groups = strategy.group(texts);

      expect(groups).toHaveLength(1);
    });
  });
});
