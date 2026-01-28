/**
 * @file Text width measurement
 *
 * Measures text width using Canvas API for accuracy with browser rendering.
 * Falls back to font-metrics estimation in non-browser environments.
 *
 * @see ../metrics/font-metrics.ts - Font metrics data (fallback)
 */

import type { Pixels, Points } from "./units";
import { px, PT_TO_PX } from "./units";
import { getCharWidth, getKerningAdjustment, isCjkCodePoint, isMonospace } from "../metrics";

// =============================================================================
// Canvas Measurement
// =============================================================================

/**
 * Shared canvas context for text measurement.
 * Created lazily and reused for performance.
 */
const measurementState: {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  lastInitError?: unknown;
} = {};

/**
 * Check if Canvas measurement is available.
 */
function canUseCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (measurementState.context !== undefined) {
    return true;
  }
  try {
    measurementState.canvas = document.createElement("canvas");
    measurementState.context = measurementState.canvas.getContext("2d") ?? undefined;
    return measurementState.context !== undefined;
  } catch (error) {
    measurementState.canvas = undefined;
    measurementState.context = undefined;
    measurementState.lastInitError = error;
    return false;
  }
}

/**
 * Build a CSS font string for Canvas measurement.
 * Must match the format used by SVG rendering.
 */
function buildFontString(
  fontSizePx: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: "normal" | "italic",
): string {
  const style = fontStyle === "italic" ? "italic " : "";
  const weight = fontWeight !== 400 ? `${fontWeight} ` : "";
  return `${style}${weight}${fontSizePx}px ${fontFamily}`;
}

/**
 * Measurement cache to avoid redundant Canvas calls.
 * Key format: "fontString|letterSpacing|text"
 */
const measurementCache = new Map<string, number>();
const MAX_CACHE_SIZE = 10000;

/**
 * Measure text width using Canvas API.
 * Returns undefined if Canvas is not available.
 */
function measureWithCanvas(
  text: string,
  fontSizePx: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: "normal" | "italic",
  letterSpacing: number,
): number | undefined {
  if (!canUseCanvas() || measurementState.context === undefined) {
    return undefined;
  }

  const ctx = measurementState.context;
  const fontString = buildFontString(fontSizePx, fontFamily, fontWeight, fontStyle);
  const cacheKey = `${fontString}|${letterSpacing}|${text}`;

  const cached = measurementCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Set font and letter spacing
  ctx.font = fontString;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing}px`;

  const metrics = ctx.measureText(text);
  const width = metrics.width;

  // Maintain cache size
  if (measurementCache.size >= MAX_CACHE_SIZE) {
    const firstKey = measurementCache.keys().next().value;
    if (firstKey !== undefined) {
      measurementCache.delete(firstKey);
    }
  }
  measurementCache.set(cacheKey, width);

  return width;
}

// =============================================================================
// Character Width Calculation
// =============================================================================

/**
 * Result of character width calculation with kerning.
 */
export type CharWidthResult = {
  /** Character width in pixels */
  readonly width: Pixels;
  /** Kerning adjustment from previous character (negative = tighter) */
  readonly kerningAdjust: Pixels;
  /** Total width including kerning adjustment */
  readonly totalWidth: Pixels;
};

/**
 * Calculate the width of a single character with kerning context.
 *
 * @param char - Current character
 * @param prevChar - Previous character (for kerning)
 * @param fontSize - Font size in points
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight (default: 400)
 * @returns Character width result with kerning adjustment
 */
export function calculateCharWidth(
  char: string,
  prevChar: string | undefined,
  fontSize: Points,
  fontFamily: string,
  fontWeight: number = 400,
): CharWidthResult {
  const charCode = char.charCodeAt(0);
  const fontSizePx = (fontSize as number) * PT_TO_PX;
  const isCjk = isCjkCodePoint(charCode);

  // Get base character width from font metrics (with bold adjustment)
  const widthRatio = getCharWidth(char, fontFamily, isCjk, fontWeight);
  const width = fontSizePx * widthRatio;

  // Calculate kerning adjustment
  const kerningAdjust = resolveKerningAdjust(prevChar, char, fontSizePx, fontFamily);

  return {
    width: px(width),
    kerningAdjust: px(kerningAdjust),
    totalWidth: px(width + kerningAdjust),
  };
}

/**
 * Resolve kerning adjustment for a character pair.
 */
function resolveKerningAdjust(
  prevChar: string | undefined,
  char: string,
  fontSizePx: number,
  fontFamily: string,
): number {
  if (prevChar === undefined) {
    return 0;
  }
  if (isMonospace(fontFamily)) {
    return 0;
  }
  const pair = prevChar + char;
  const kerningEm = getKerningAdjustment(pair, fontFamily);
  return fontSizePx * kerningEm;
}

// =============================================================================
// Text Width Measurement
// =============================================================================

/**
 * Measure the width of a text string.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Falls back to font-metrics estimation in non-browser environments.
 *
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param letterSpacing - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @param fontStyle - Font style (default: "normal")
 * @returns Width in pixels
 */
export function measureTextWidth(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
  fontStyle: "normal" | "italic" = "normal",
): Pixels {
  const fontSizePx = (fontSize as number) * PT_TO_PX;
  const letterSpacingNum = letterSpacing as number;

  // Try Canvas measurement first (matches browser rendering)
  const canvasWidth = measureWithCanvas(text, fontSizePx, fontFamily, fontWeight, fontStyle, letterSpacingNum);
  if (canvasWidth !== undefined) {
    return px(canvasWidth);
  }

  // Fallback to font-metrics estimation
  return estimateTextWidthFallback(text, fontSize, letterSpacing, fontFamily, fontWeight);
}

/**
 * Fallback text width estimation using font metrics.
 * Used when Canvas is not available (e.g., server-side rendering).
 */
export function estimateTextWidthFallback(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
): Pixels {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const width = chars.reduce((acc, char, index) => {
    const prevChar = index > 0 ? chars[index - 1] : undefined;
    const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily, fontWeight);
    const spacing = index > 0 ? letterSpacingNum : 0;
    return acc + (charResult.totalWidth as number) + spacing;
  }, 0);

  return px(width);
}

// =============================================================================
// Detailed Measurement (for kerning)
// =============================================================================

/**
 * Detailed span measurement with per-character data.
 */
export type DetailedMeasurement = {
  /** Total width in pixels */
  readonly totalWidth: Pixels;
  /** Per-character width data */
  readonly charWidths: readonly CharWidthResult[];
  /** Cumulative positions (x offset for each character) */
  readonly positions: readonly Pixels[];
};

/**
 * Calculate detailed character measurements for a text span.
 * Returns per-character width and position data for precise tspan placement.
 *
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param letterSpacing - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @returns Detailed measurement with per-character data
 */
export function measureTextDetailed(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
): DetailedMeasurement {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const measurement = chars.reduce(
    (acc, char, index) => {
      const prevChar = index > 0 ? chars[index - 1] : undefined;
      const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily, fontWeight);
      const spacing = index > 0 ? letterSpacingNum : 0;

      acc.positions.push(px(acc.totalWidth));
      acc.charWidths.push(charResult);
      acc.totalWidth += (charResult.totalWidth as number) + spacing;
      return acc;
    },
    { totalWidth: 0, charWidths: [] as CharWidthResult[], positions: [] as Pixels[] },
  );

  return {
    totalWidth: px(measurement.totalWidth),
    charWidths: measurement.charWidths,
    positions: measurement.positions,
  };
}

// =============================================================================
// Text Measurer Interface (for dependency injection)
// =============================================================================

/**
 * Text measurer interface for measuring text width.
 * Allows injection of different measurement strategies.
 */
export type TextMeasurer = {
  /**
   * Measure the width of a text string.
   *
   * @param text - Text to measure
   * @param fontSize - Font size in points
   * @param letterSpacing - Additional letter spacing in pixels
   * @param fontFamily - Font family for metrics lookup
   * @param fontWeight - Font weight (default: 400)
   * @param fontStyle - Font style (default: "normal")
   * @returns Width in pixels
   */
  measureTextWidth(
    text: string,
    fontSize: Points,
    letterSpacing: Pixels,
    fontFamily: string,
    fontWeight?: number,
    fontStyle?: "normal" | "italic",
  ): Pixels;
};

/**
 * Create a text measurer instance.
 * Returns the default Canvas-based measurer with font-metrics fallback.
 */
export function createTextMeasurer(): TextMeasurer {
  return {
    measureTextWidth,
  };
}
