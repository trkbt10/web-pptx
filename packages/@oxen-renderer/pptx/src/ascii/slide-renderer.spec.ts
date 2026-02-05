import { describe, it, expect } from "bun:test";
import { renderSlideAscii } from "./slide-renderer";
import type { AsciiRenderableShape } from "./types";
import { BOX_CHARS } from "./ascii-canvas";

function shape(overrides: Partial<AsciiRenderableShape> & { name: string; type: string }): AsciiRenderableShape {
  return overrides;
}

describe("slide-renderer", () => {
  describe("renderSlideAscii", () => {
    it("renders a full-slide rectangle with text", () => {
      const result = renderSlideAscii({
        shapes: [shape({ name: "R", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 540 }, text: "Hello" })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain(BOX_CHARS.topLeft);
      expect(result).toContain("Hello");
    });

    it("renders multiple non-overlapping shapes", () => {
      const result = renderSlideAscii({
        shapes: [
          shape({ name: "T", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 200 }, text: "Title" }),
          shape({ name: "B", type: "sp", bounds: { x: 0, y: 300, width: 960, height: 240 }, text: "Body" }),
        ],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("Title");
      expect(result).toContain("Body");
    });

    it("skips shapes without bounds", () => {
      const result = renderSlideAscii({
        shapes: [
          shape({ name: "N", type: "contentPart" }),
          shape({ name: "V", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 540 }, text: "Visible" }),
        ],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("Visible");
    });

    it("shows placeholder labels", () => {
      const result = renderSlideAscii({
        shapes: [shape({ name: "T", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 200 }, placeholder: { type: "title" } })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("[title]");
    });

    it("shows content type labels", () => {
      const result = renderSlideAscii({
        shapes: [shape({ name: "C", type: "graphicFrame", bounds: { x: 100, y: 100, width: 400, height: 300 }, content: { type: "chart" } })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("{chart}");
    });

    it("shows [image] for pic shapes", () => {
      const result = renderSlideAscii({
        shapes: [shape({ name: "P", type: "pic", bounds: { x: 100, y: 100, width: 400, height: 300 } })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("[image]");
    });

    it("renders group children", () => {
      const result = renderSlideAscii({
        shapes: [shape({
          name: "G", type: "grpSp", bounds: { x: 0, y: 0, width: 960, height: 540 },
          children: [shape({ name: "C", type: "sp", bounds: { x: 100, y: 100, width: 300, height: 200 }, text: "InGroup" })],
        })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("[group]");
      expect(result).toContain("InGroup");
    });

    it("produces empty output for zero shapes", () => {
      expect(renderSlideAscii({ shapes: [], slideWidth: 960, slideHeight: 540, terminalWidth: 40 })).toBe("");
    });

    it("draws slide border when showBorder is true", () => {
      const result = renderSlideAscii({
        shapes: [], slideWidth: 960, slideHeight: 540, terminalWidth: 40, showBorder: true,
      });
      expect(result).toContain(BOX_CHARS.topLeft);
      expect(result).toContain(BOX_CHARS.bottomRight);
    });

    it("does not draw slide border by default", () => {
      const result = renderSlideAscii({
        shapes: [], slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toBe("");
    });

    it("shapes render above slide border", () => {
      const result = renderSlideAscii({
        shapes: [shape({ name: "R", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 540 }, text: "Hello" })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40, showBorder: true,
      });
      expect(result).toContain("Hello");
    });

    it("renders multi-line text across interior rows", () => {
      const result = renderSlideAscii({
        shapes: [shape({
          name: "R", type: "sp",
          bounds: { x: 0, y: 0, width: 960, height: 540 },
          text: "Line 1\nLine 2\nLine 3",
        })],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toContain("Line 3");
    });

    it("handles overlapping shapes with correct z-order", () => {
      const result = renderSlideAscii({
        shapes: [
          shape({ name: "Back", type: "sp", bounds: { x: 0, y: 0, width: 960, height: 540 }, text: "Background" }),
          shape({ name: "Front", type: "sp", bounds: { x: 100, y: 100, width: 760, height: 340 }, text: "Foreground" }),
        ],
        slideWidth: 960, slideHeight: 540, terminalWidth: 40,
      });
      expect(result).toContain("Foreground");
    });
  });
});
