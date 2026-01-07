/**
 * @file Shared text layout logic
 *
 * Common utilities used by both sync (layout.ts) and async (layout-async.ts)
 * layout implementations.
 */

import type {
  GlyphContour,
  GlyphStyleKey,
  ContourPath,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "./types";
import { getKerningAdjustment } from "./cache";
import { calculateOpticalKerningAdjustment } from "./optical-kerning";

// =============================================================================
// Config Parsing
// =============================================================================

/**
 * Extract GlyphStyleKey from TextLayoutConfig
 */
export function extractStyleKey(config: TextLayoutConfig): GlyphStyleKey {
  return {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
  };
}

/**
 * Kerning configuration derived from TextLayoutConfig
 */
export type KerningConfig = {
  readonly letterSpacing: number;
  readonly useOpticalKerning: boolean;
  readonly useFontKerning: boolean;
};

/**
 * Extract kerning configuration from TextLayoutConfig
 */
export function extractKerningConfig(config: TextLayoutConfig): KerningConfig {
  const letterSpacing = config.letterSpacing ?? 0;
  const useOpticalKerning = config.opticalKerning === true;
  const enableKerning = config.enableKerning ?? true;
  const useFontKerning = enableKerning && !useOpticalKerning;

  return { letterSpacing, useOpticalKerning, useFontKerning };
}

// =============================================================================
// Empty Result
// =============================================================================

/**
 * Create empty TextLayoutResult for empty text
 */
export function createEmptyLayoutResult(): TextLayoutResult {
  return {
    glyphs: [],
    totalWidth: 0,
    ascent: 0,
    descent: 0,
    combinedPaths: [],
  };
}

// =============================================================================
// Kerning Calculation
// =============================================================================

/**
 * Calculate kerning adjustment for a glyph pair
 */
export function calculateKerning(
  fontFamily: string,
  prevGlyph: GlyphContour | null,
  currentGlyph: GlyphContour,
  prevChar: string | null,
  currentChar: string,
  kerningConfig: KerningConfig,
): number {
  if (prevGlyph === null || prevChar === null) {
    return 0;
  }

  if (kerningConfig.useOpticalKerning) {
    return calculateOpticalKerningAdjustment(
      prevGlyph,
      currentGlyph,
      kerningConfig.letterSpacing,
    );
  }

  if (kerningConfig.useFontKerning) {
    return getKerningAdjustment(fontFamily, prevChar, currentChar);
  }

  return 0;
}

// =============================================================================
// Path Processing
// =============================================================================

/**
 * Offset a contour path by the given x, y amounts
 */
export function offsetPath(
  path: ContourPath,
  x: number,
  y: number,
): ContourPath {
  return {
    points: path.points.map((p) => ({ x: p.x + x, y: p.y + y })),
    isHole: path.isHole,
  };
}

/**
 * Build combined paths from positioned glyphs
 */
export function buildCombinedPaths(
  glyphs: readonly PositionedGlyph[],
): ContourPath[] {
  return glyphs.flatMap((positioned) =>
    positioned.glyph.paths.map((path) =>
      offsetPath(path, positioned.x, positioned.y),
    ),
  );
}

// =============================================================================
// Layout Building
// =============================================================================

/**
 * Layout state accumulator for reduce operations
 */
export type LayoutAccumulator = {
  readonly glyphs: PositionedGlyph[];
  cursorX: number;
  maxAscent: number;
  maxDescent: number;
};

/**
 * Create initial layout accumulator
 */
export function createLayoutAccumulator(): LayoutAccumulator {
  return {
    glyphs: [],
    cursorX: 0,
    maxAscent: 0,
    maxDescent: 0,
  };
}

/**
 * Add a glyph to the layout accumulator
 */
export function addGlyphToLayout(
  acc: LayoutAccumulator,
  glyph: GlyphContour,
  kerning: number,
  letterSpacing: number,
): LayoutAccumulator {
  const x = acc.cursorX + kerning;
  const y = 0; // Baseline at y=0

  acc.glyphs.push({ glyph, x, y });
  acc.maxAscent = Math.max(acc.maxAscent, glyph.metrics.ascent);
  acc.maxDescent = Math.max(acc.maxDescent, glyph.metrics.descent);
  acc.cursorX = x + glyph.metrics.advanceWidth + letterSpacing;

  return acc;
}

/**
 * Build final TextLayoutResult from accumulator
 */
export function buildLayoutResult(
  acc: LayoutAccumulator,
  letterSpacing: number,
): TextLayoutResult {
  return {
    glyphs: acc.glyphs,
    totalWidth: acc.cursorX - letterSpacing, // Remove trailing space
    ascent: acc.maxAscent,
    descent: acc.maxDescent,
    combinedPaths: buildCombinedPaths(acc.glyphs),
  };
}
