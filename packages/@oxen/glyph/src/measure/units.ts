/**
 * @file Unit types and conversion constants for text measurement
 *
 * Provides branded types for type-safe unit handling in text layout.
 */

declare const __brand: unique symbol;
type Brand<K, T> = K & { readonly [__brand]: T };

/**
 * Pixels unit type (branded number).
 * Represents measurements in screen pixels.
 */
export type Pixels = Brand<number, "Pixels">;

/**
 * Points unit type (branded number).
 * Represents typographic points (1pt = 1/72 inch).
 */
export type Points = Brand<number, "Points">;

/**
 * Create a Pixels value from a number.
 */
export const px = (value: number): Pixels => value as Pixels;

/**
 * Create a Points value from a number.
 */
export const pt = (value: number): Points => value as Points;

/**
 * Points to pixels conversion factor at 96 DPI.
 * 1 inch = 72 points (typographic standard)
 * At 96 DPI: 1pt = 96/72 px ≈ 1.333px
 */
export const PT_TO_PX = 96 / 72;

/**
 * Pixels to points conversion factor at 96 DPI.
 * 1pt = 96/72 px, so 1px = 72/96 pt
 */
export const PX_TO_PT = 72 / 96;

/**
 * Convert points to pixels.
 */
export function pointsToPixels(points: Points): Pixels {
  return px((points as number) * PT_TO_PX);
}

/**
 * Convert pixels to points.
 */
export function pixelsToPoints(pixels: Pixels): Points {
  return pt((pixels as number) * PX_TO_PT);
}
