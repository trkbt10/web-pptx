/**
 * @file Text utilities - public API
 *
 * @deprecated Use @oxen/glyph instead.
 * This package has been merged into @oxen/glyph for unified text metrics and measurement.
 *
 * Migration:
 * ```typescript
 * // Before:
 * import { isCjkChar, getCharWidth } from "@oxen/text";
 *
 * // After:
 * import { isCjkChar, getCharWidth } from "@oxen/glyph";
 * ```
 */

// Re-export everything from @oxen/glyph/metrics for backward compatibility
export { isCjkChar, isCjkCodePoint } from "@oxen/glyph";
export { getAscenderRatio, getCharWidth, getKerningAdjustment, getKerningForText } from "@oxen/glyph";
export { getFontCategory, getFontMetrics, isMonospace } from "@oxen/glyph";
export type { FontCategory, FontMetrics } from "@oxen/glyph";
