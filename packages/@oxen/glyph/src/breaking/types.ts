/**
 * @file Line breaking types
 *
 * Generic types for line breaking that work with any text layout system.
 */

import type { Pixels, Points } from "../measure/units";

/**
 * Minimum span information required for line breaking.
 * Consumers can extend this type with additional properties.
 */
export type BreakableSpan = {
  /** Text content */
  readonly text: string;
  /** Span width in pixels */
  readonly width: Pixels;
  /** Font size in points */
  readonly fontSize: Points;
  /** Font family name */
  readonly fontFamily: string;
  /** Font weight (bold: 700, normal: 400) */
  readonly fontWeight: number;
  /** Font style (normal/italic) */
  readonly fontStyle: "normal" | "italic";
  /** Letter spacing in pixels */
  readonly letterSpacing: Pixels;
  /**
   * Break type for this span.
   * - "none": No break
   * - "page": Page break
   * - "column": Column break
   * - "line": Line break
   */
  readonly breakType: "none" | "page" | "column" | "line";
  /** Text transform (uppercase, etc.) */
  readonly textTransform?: "none" | "uppercase" | "lowercase";
};

/**
 * Text wrapping mode.
 */
export type TextWrapping = "wrap" | "none" | "square" | "tight" | "through";

/**
 * Result of breaking spans into lines.
 */
export type LineBreakResult<T extends BreakableSpan> = {
  /** Lines of spans */
  readonly lines: readonly (readonly T[])[];
  /** Height of each line in points */
  readonly lineHeights: readonly Points[];
  /**
   * Page break flags for each line.
   * True if the line ends with a page break.
   */
  readonly pageBreaksAfter: readonly boolean[];
};

/**
 * Line font info for baseline calculation.
 */
export type LineFontInfo = {
  readonly fontSize: Points;
  readonly fontFamily: string;
};
