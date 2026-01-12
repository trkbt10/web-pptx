/**
 * @file PDF text types
 *
 * Types for PDF text elements.
 */

import type { PdfGraphicsState } from "../graphics-state";

// =============================================================================
// Text Element
// =============================================================================

export type PdfText = {
  readonly type: "text";
  readonly text: string;
  /**
   * Text X position in PDF points (from left edge).
   */
  readonly x: number;
  /**
   * Text Y position in PDF points (from bottom edge).
   */
  readonly y: number;
  /**
   * Text bounding width in PDF points.
   */
  readonly width: number;
  /**
   * Text bounding height in PDF points.
   */
  readonly height: number;
  readonly fontName: string;
  /**
   * Font size in PDF points (1 point = 1/72 inch).
   */
  readonly fontSize: number;
  readonly graphicsState: PdfGraphicsState;

  // =============================================================================
  // Spacing Properties (from PDF text state operators)
  // =============================================================================

  /**
   * Character spacing in PDF points (Tc operator).
   * Added to each character's displacement after glyph width.
   * @see PDF Reference 9.3.2
   */
  readonly charSpacing?: number;

  /**
   * Word spacing in PDF points (Tw operator).
   * Added to space character (0x20) displacement only.
   * @see PDF Reference 9.3.3
   */
  readonly wordSpacing?: number;

  /**
   * Horizontal scaling as percentage (Tz operator).
   * Default: 100 (no scaling).
   * @see PDF Reference 9.3.4
   */
  readonly horizontalScaling?: number;

  // =============================================================================
  // Font Metrics (for precise positioning)
  // =============================================================================

  /**
   * Font metrics for precise baseline/positioning calculations.
   * If undefined, default values (ascender: 800, descender: -200) are used.
   */
  readonly fontMetrics?: PdfTextFontMetrics;
};

/**
 * Font metrics for precise text positioning.
 */
export type PdfTextFontMetrics = {
  /**
   * Font ascender in 1/1000 em units.
   * Height above the baseline (positive value).
   * Typical range: 700-900
   */
  readonly ascender: number;

  /**
   * Font descender in 1/1000 em units.
   * Depth below the baseline (negative value).
   * Typical range: -200 to -300
   */
  readonly descender: number;
};
