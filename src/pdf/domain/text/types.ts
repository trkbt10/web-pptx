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
};
