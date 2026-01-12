/**
 * @file Tests for PdfText → SpShape conversion
 */

import type { PdfColor, PdfGraphicsState, PdfText } from "../domain";
import { createDefaultGraphicsState } from "../domain";
import { deg, pt, px } from "../../ooxml/domain/units";
import { convertTextToShape, convertGroupedTextToShape } from "./text-to-shapes";
import type { GroupedText } from "./text-grouping/types";

function createGraphicsState(fillColor: PdfColor, fillAlpha: number = 1): PdfGraphicsState {
  return {
    ...createDefaultGraphicsState(),
    fillColor,
    fillAlpha,
  };
}

describe("convertTextToShape", () => {
  it("converts PdfText into a text-box SpShape with correct geometry and text", () => {
    const graphicsState = createGraphicsState(
      { colorSpace: "DeviceRGB", components: [1, 0, 0] as const },
      1
    );

    const pdfText: PdfText = {
      type: "text",
      text: "Hello",
      x: 50,
      y: 100,
      width: 100,
      height: 10,
      fontName: "/BCDFEE+ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const context = {
      pdfWidth: 200,
      pdfHeight: 400,
      slideWidth: px(400),
      slideHeight: px(800),
    } as const;

    const shape = convertTextToShape(pdfText, context, "1");

    expect(shape.type).toBe("sp");
    expect(shape.nonVisual).toEqual({
      id: "1",
      name: "TextBox 1",
      textBox: true,
    });

    expect(shape.properties.fill).toEqual({ type: "noFill" });
    expect(shape.properties.geometry).toEqual({
      type: "preset",
      preset: "rect",
      adjustValues: [],
    });

    expect(shape.properties.transform).toEqual({
      x: px(100),
      y: px(580),
      width: px(200),
      height: px(20),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    });

    expect(shape.textBody).toEqual({
      bodyProperties: {
        wrapping: "none",
        anchor: "top",
        anchorCenter: false,
      },
      paragraphs: [
        {
          properties: {
            alignment: "left",
          },
          runs: [
            {
              type: "text",
              text: "Hello",
              properties: {
                fontSize: pt(12),
                fontFamily: "Arial",
                fill: {
                  type: "solidFill",
                  color: { spec: { type: "srgb", value: "FF0000" } },
                },
                bold: false,
                italic: false,
                underline: "none",
              },
            },
          ],
          endProperties: {},
        },
      ],
    });
  });

  describe("Y coordinate conversion (baseline → top edge)", () => {
    const context = {
      pdfWidth: 100,
      pdfHeight: 100,
      slideWidth: px(100),
      slideHeight: px(100),
    } as const;

    it.each([
      { name: "page top", y: 90, height: 10, fontSize: 10, expectedY: 0 },
      { name: "page middle", y: 50, height: 10, fontSize: 10, expectedY: 40 },
      { name: "page bottom", y: 0, height: 10, fontSize: 10, expectedY: 90 },
      { name: "large font size", y: 70, height: 30, fontSize: 30, expectedY: 0 },
      { name: "small font size", y: 50, height: 5, fontSize: 5, expectedY: 45 },
    ] satisfies ReadonlyArray<{
      readonly name: string;
      readonly y: number;
      readonly height: number;
      readonly fontSize: number;
      readonly expectedY: number;
    }>)("$name", ({ y, height, fontSize, expectedY }) => {
      const pdfText: PdfText = {
        type: "text",
        text: "Y",
        x: 10,
        y,
        width: 20,
        height,
        fontName: "Helvetica",
        fontSize,
        graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
      };

      const shape = convertTextToShape(pdfText, context, "t");

      expect(shape.properties.transform).toEqual({
        x: px(10),
        y: px(expectedY),
        width: px(20),
        height: px(height),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      });

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");
      if (!run.properties) throw new Error("Expected run properties");
      expect(run.properties.fontSize).toEqual(pt(fontSize));
    });

    it("keeps multiline text as-is and uses the whole block height for baseline-to-top conversion", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Line 1\nLine 2",
        x: 10,
        y: 60,
        width: 20,
        height: 20,
        fontName: "Helvetica",
        fontSize: 10,
        graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
      };

      const shape = convertTextToShape(pdfText, context, "ml");
      const transform = shape.properties.transform;
      if (!transform) throw new Error("Expected shape transform");
      expect(transform.y).toEqual(px(20));

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");
      expect(run.text).toBe("Line 1\nLine 2");
    });
  });

  it("throws when shapeId is empty", () => {
    const pdfText: PdfText = {
      type: "text",
      text: "X",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fontName: "ArialMT",
      fontSize: 10,
      graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
    };

    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;
    expect(() => convertTextToShape(pdfText, context, "")).toThrow("shapeId is required");
  });

  it("throws for invalid text bounds and font size", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: -1, height: 10, fontName: "ArialMT", fontSize: 10, graphicsState: g }, context, "1")
    ).toThrow("Invalid PdfText width");

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: 10, height: -1, fontName: "ArialMT", fontSize: 10, graphicsState: g }, context, "1")
    ).toThrow("Invalid PdfText height");

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: 10, height: 10, fontName: "ArialMT", fontSize: 0, graphicsState: g }, context, "1")
    ).toThrow("Invalid pdfFontSize");
  });

  it("detects bold/italic from PDF font names", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;

    const shape = convertTextToShape(
      {
        type: "text",
        text: "Style",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fontName: "/ABCDEF+Arial-BoldItalicMT",
        fontSize: 10,
        graphicsState: g,
      },
      context,
      "1"
    );

    const run = shape.textBody?.paragraphs[0]?.runs[0];
    if (!run || run.type !== "text") throw new Error("Expected text run");
    if (!run.properties) throw new Error("Expected run properties");
    expect(run.properties.bold).toBe(true);
    expect(run.properties.italic).toBe(true);
  });

  describe("charSpacing conversion", () => {
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("converts positive charSpacing to PPTX spacing", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2, // 2 points
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // 2 points * (96/72) = 2.67 pixels
      expect(run.properties?.spacing).toBeDefined();
      expect((run.properties?.spacing as number)).toBeCloseTo(2 * (96 / 72), 1);
    });

    it("applies horizontalScaling to spacing", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2,
        horizontalScaling: 150, // 150%
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // 2 points * 1.5 * (96/72) = 4 pixels
      expect(run.properties?.spacing).toBeDefined();
      expect((run.properties?.spacing as number)).toBeCloseTo(2 * 1.5 * (96 / 72), 1);
    });

    it("omits spacing when charSpacing is 0", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 0,
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      expect(run.properties?.spacing).toBeUndefined();
    });

    it("omits spacing when charSpacing is undefined", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      expect(run.properties?.spacing).toBeUndefined();
    });
  });

  describe("wordSpacing conversion", () => {
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("converts wordSpacing when text contains spaces", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello World", // 1 space in 11 characters = 10 gaps
        x: 0,
        y: 50,
        width: 80,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        wordSpacing: 5, // 5 points per space
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // wordSpacing contribution: 5 * 1 / 10 = 0.5 points
      // In pixels: 0.5 * (96/72) ≈ 0.67
      expect(run.properties?.spacing).toBeDefined();
      expect((run.properties?.spacing as number)).toBeCloseTo(0.5 * (96 / 72), 1);
    });

    it("combines charSpacing and wordSpacing", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "A B", // 1 space in 3 characters = 2 gaps
        x: 0,
        y: 50,
        width: 30,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2, // 2 points per char
        wordSpacing: 4, // 4 points per space
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // charSpacing: 2 points
      // wordSpacing contribution: 4 * 1 / 2 = 2 points
      // Total: 4 points = 4 * (96/72) ≈ 5.33 pixels
      expect(run.properties?.spacing).toBeDefined();
      expect((run.properties?.spacing as number)).toBeCloseTo(4 * (96 / 72), 1);
    });

    it("ignores wordSpacing when text has no spaces", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "NoSpaces",
        x: 0,
        y: 50,
        width: 60,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        wordSpacing: 5, // Should contribute nothing
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // No spaces, so wordSpacing contribution is 0
      expect(run.properties?.spacing).toBeUndefined();
    });
  });

  describe("spacing validation", () => {
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("omits negligible spacing (less than 0.1px)", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Test",
        x: 0,
        y: 50,
        width: 40,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 0.01, // Very small
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") throw new Error("Expected text run");

      // 0.01 * (96/72) ≈ 0.013px, should be omitted
      expect(run.properties?.spacing).toBeUndefined();
    });
  });
});

describe("convertGroupedTextToShape", () => {
  const createPdfText = (overrides: Partial<PdfText> = {}): PdfText => ({
    type: "text",
    text: "Test",
    x: 0,
    y: 0,
    width: 100,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  const context = {
    pdfWidth: 100,
    pdfHeight: 100,
    slideWidth: px(100),
    slideHeight: px(100),
  } as const;

  it("converts single-paragraph group to SpShape", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 50, height: 12 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Hello", x: 10, y: 88 })],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    expect(shape.type).toBe("sp");
    expect(shape.nonVisual?.textBox).toBe(true);
    expect(shape.textBody?.paragraphs).toHaveLength(1);
    const run = shape.textBody?.paragraphs[0].runs[0];
    if (!run || run.type !== "text") throw new Error("Expected text run");
    expect(run.text).toBe("Hello");
  });

  it("converts multi-paragraph group to SpShape with multiple paragraphs", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 76, width: 100, height: 24 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Line 1", y: 88 })],
          baselineY: 100,
        },
        {
          runs: [createPdfText({ text: "Line 2", y: 76 })],
          baselineY: 88,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    expect(shape.textBody?.paragraphs).toHaveLength(2);
    const run1 = shape.textBody?.paragraphs[0].runs[0];
    const run2 = shape.textBody?.paragraphs[1].runs[0];
    if (!run1 || run1.type !== "text") throw new Error("Expected text run");
    if (!run2 || run2.type !== "text") throw new Error("Expected text run");
    expect(run1.text).toBe("Line 1");
    expect(run2.text).toBe("Line 2");
  });

  it("converts paragraph with multiple runs", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 150, height: 12 },
      paragraphs: [
        {
          runs: [
            createPdfText({ text: "Hello ", x: 10 }),
            createPdfText({ text: "World", x: 60 }),
          ],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    expect(shape.textBody?.paragraphs[0].runs).toHaveLength(2);
    const run1 = shape.textBody?.paragraphs[0].runs[0];
    const run2 = shape.textBody?.paragraphs[0].runs[1];
    if (!run1 || run1.type !== "text") throw new Error("Expected text run");
    if (!run2 || run2.type !== "text") throw new Error("Expected text run");
    expect(run1.text).toBe("Hello ");
    expect(run2.text).toBe("World");
  });

  it("throws when shapeId is empty", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 50, height: 12 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Test" })],
          baselineY: 100,
        },
      ],
    };

    expect(() => convertGroupedTextToShape(group, context, "")).toThrow(
      "shapeId is required"
    );
  });

  it("correctly positions shape using bounds", () => {
    const group: GroupedText = {
      bounds: { x: 20, y: 70, width: 60, height: 30 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Positioned" })],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "pos");
    const transform = shape.properties.transform;

    expect(transform?.x).toEqual(px(20));
    // PDF y=70, height=30, so top in PDF = 100, which in PPTX is y=0
    // After conversion: 100 - 70 - 30 = 0
    expect(transform?.y).toEqual(px(0));
    expect(transform?.width).toEqual(px(60));
    expect(transform?.height).toEqual(px(30));
  });
});
