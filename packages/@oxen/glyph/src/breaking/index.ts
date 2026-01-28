/**
 * @file Line breaking module
 *
 * Provides line breaking and word wrapping for text layout.
 */

// Types
export type { BreakableSpan, TextWrapping, LineBreakResult, LineFontInfo } from "./types";

// Line breaker
export {
  DEFAULT_FONT_SIZE_PT,
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./line-breaker";
