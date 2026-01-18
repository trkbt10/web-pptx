/**
 * @file Text width measurement
 *
 * Measures text width using Canvas API for accuracy with browser rendering.
 * Falls back to font-metrics estimation in non-browser environments.
 * Shared implementation for PPTX and DOCX text layout.
 *
 * @see src/text/font-metrics.ts - Font metrics data (fallback)
 */

import type { LayoutSpan, MeasuredSpan } from "./types";
import type { Pixels, Points } from "../ooxml/domain/units";
import { px } from "../ooxml/domain/units";
import { isCjkCodePoint } from "../text/cjk";
import { getCharWidth, getKerningAdjustment } from "../text/font-metrics";
import { isMonospace } from "../text/fonts";

// =============================================================================
// Canvas Measurement
// =============================================================================

/**
 * Shared canvas context for text measurement.
 * Created lazily and reused for performance.
 */
let measurementCanvas: HTMLCanvasElement | undefined;
let measurementContext: CanvasRenderingContext2D | undefined;

/**
 * Check if Canvas measurement is available.
 */
function canUseCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (measurementContext !== undefined) {
    return true;
  }
  try {
    measurementCanvas = document.createElement("canvas");
    measurementContext = measurementCanvas.getContext("2d") ?? undefined;
    return measurementContext !== undefined;
  } catch {
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
 * Key format: "fontString|text"
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
  if (!canUseCanvas() || measurementContext === undefined) {
    return undefined;
  }

  const fontString = buildFontString(fontSizePx, fontFamily, fontWeight, fontStyle);
  const cacheKey = `${fontString}|${letterSpacing}|${text}`;

  const cached = measurementCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Set font and letter spacing
  measurementContext.font = fontString;
  (measurementContext as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing}px`;

  const metrics = measurementContext.measureText(text);
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
// Constants
// =============================================================================

/**
 * Points to pixels conversion factor at 96 DPI.
 * 1 inch = 72 points (typographic standard)
 * At 96 DPI: 1pt = 96/72 px ≈ 1.333px
 */
export const PT_TO_PX = 96 / 72;

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
function estimateTextWidthFallback(
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

/**
 * @deprecated Use measureTextWidth instead
 */
export function estimateTextWidth(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
): Pixels {
  return measureTextWidth(text, fontSize, letterSpacing, fontFamily, fontWeight);
}

// =============================================================================
// Text Transform
// =============================================================================

/**
 * Apply text transform (uppercase/lowercase) to text.
 * Must match the transform applied during rendering.
 */
function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

// =============================================================================
// Span Measurement
// =============================================================================

/**
 * Measure a single span and return MeasuredSpan.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before measuring to match rendered width.
 * For inline images, uses the image width directly.
 */
export function measureSpan(span: LayoutSpan): MeasuredSpan {
  let width = px(0);

  // Inline images use their configured width
  if (span.inlineImage !== undefined) {
    width = span.inlineImage.width;
  } else if (span.breakType === "none") {
    // Apply text transform before measuring (matches rendering)
    const transformedText = applyTextTransform(span.text, span.textTransform);
    width = measureTextWidth(
      transformedText,
      span.fontSize,
      span.letterSpacing,
      span.fontFamily,
      span.fontWeight,
      span.fontStyle,
    );
  }

  return {
    ...span,
    width,
  };
}

/**
 * Measure all spans in an array.
 */
export function measureSpans(spans: readonly LayoutSpan[]): MeasuredSpan[] {
  return spans.map(measureSpan);
}

// =============================================================================
// Bullet Measurement
// =============================================================================

/**
 * Measure bullet character width.
 * Uses Canvas API for accurate browser-consistent measurement.
 *
 * Per ECMA-376 21.1.2.2.7, the spacing between bullet and text is controlled
 * by the indent attribute, not by adding extra space to the bullet width.
 */
export function estimateBulletWidth(bulletChar: string, fontSize: Points, fontFamily: string): Pixels {
  return measureTextWidth(bulletChar, fontSize, px(0), fontFamily);
}

// =============================================================================
// Partial Span Measurement (for cursor positioning)
// =============================================================================

/**
 * Measure the width of the first N characters of a span.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before measuring to match rendered width.
 *
 * @param span - The layout span to measure
 * @param charCount - Number of characters from the start to measure
 * @returns Width in pixels
 */
export function measureSpanTextWidth(span: LayoutSpan, charCount: number): Pixels {
  if (charCount <= 0 || span.breakType !== "none") {
    return px(0);
  }

  // Apply text transform before measuring (matches rendering)
  const transformedText = applyTextTransform(span.text, span.textTransform);
  const text = transformedText.slice(0, Math.min(charCount, transformedText.length));
  return measureTextWidth(text, span.fontSize, span.letterSpacing, span.fontFamily, span.fontWeight, span.fontStyle);
}

/**
 * Get the character index at a specific X offset within a span.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before calculating to match rendered width.
 *
 * @param span - The layout span
 * @param targetX - Target X offset from span start in pixels
 * @returns Character index (0-based)
 */
export function getCharIndexAtOffset(span: LayoutSpan, targetX: number): number {
  if (targetX <= 0 || span.breakType !== "none" || span.text.length === 0) {
    return 0;
  }

  // Apply text transform before calculating (matches rendering)
  const transformedText = applyTextTransform(span.text, span.textTransform);
  const chars = Array.from(transformedText);

  // Use binary search with Canvas measurement for efficiency
  let low = 0;
  let high = chars.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const textUpToMid = chars.slice(0, mid + 1).join("");
    const widthUpToMid = measureTextWidth(
      textUpToMid,
      span.fontSize,
      span.letterSpacing,
      span.fontFamily,
      span.fontWeight,
      span.fontStyle,
    ) as number;

    // Get width up to previous character for midpoint calculation
    const textUpToPrev = mid > 0 ? chars.slice(0, mid).join("") : "";
    const widthUpToPrev = mid > 0 ? (measureTextWidth(
      textUpToPrev,
      span.fontSize,
      span.letterSpacing,
      span.fontFamily,
      span.fontWeight,
      span.fontStyle,
    ) as number) : 0;

    const charMidpoint = (widthUpToPrev + widthUpToMid) / 2;

    if (targetX < charMidpoint) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return Math.min(low, chars.length);
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
