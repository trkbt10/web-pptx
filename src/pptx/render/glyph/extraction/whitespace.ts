/**
 * @file Whitespace glyph creation
 *
 * Creates GlyphContour for whitespace characters (space, tab, newline).
 * Shared by extractor.ts and worker-manager.ts.
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-format";

/**
 * Create a glyph contour for whitespace characters.
 *
 * Whitespace characters have no visible paths but still need metrics
 * for proper text layout.
 *
 * @throws Error if called in non-browser environment
 */
export function createWhitespaceGlyph(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  if (typeof document === "undefined") {
    throw new Error("Whitespace glyph extraction requires a browser canvas.");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable for whitespace metrics.");
  }

  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES)}`;
  const metrics = ctx.measureText(char);
  const advanceWidth = char === "\t" ? metrics.width * 4 : metrics.width;

  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: {
      advanceWidth,
      leftBearing: 0,
      ascent: 0,
      descent: 0,
    },
  };
}
