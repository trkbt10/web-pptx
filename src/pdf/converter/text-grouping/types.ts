/**
 * @file Text grouping strategy types for PDF to PPTX conversion.
 *
 * These types enable pluggable text grouping strategies to control
 * how individual PDF text elements are combined into PPTX TextBoxes.
 */

import type { PdfText } from "../../domain";

/**
 * Strategy interface for grouping PDF text elements.
 *
 * Implementations control how individual PdfText elements are
 * combined into logical groups (TextBoxes in PPTX).
 */
export interface TextGroupingStrategy {
  /**
   * Group PdfText elements into logical blocks.
   *
   * @param texts - Array of PdfText elements to group
   * @returns Array of grouped text blocks
   */
  group(texts: readonly PdfText[]): readonly GroupedText[];
}

/**
 * Bounding box for a text group.
 */
export type TextBounds = {
  /** Left edge X coordinate in PDF points */
  readonly x: number;
  /** Bottom edge Y coordinate in PDF points */
  readonly y: number;
  /** Width in PDF points */
  readonly width: number;
  /** Height in PDF points */
  readonly height: number;
};

/**
 * A logical group of text elements that will become a single TextBox.
 */
export type GroupedText = {
  /** Bounding box encompassing all text in this group */
  readonly bounds: TextBounds;
  /** Paragraphs within this group (each becomes a <a:p> in PPTX) */
  readonly paragraphs: readonly GroupedParagraph[];
};

/**
 * A paragraph within a text group (typically a single line).
 */
export type GroupedParagraph = {
  /** Text runs in this paragraph */
  readonly runs: readonly PdfText[];
  /** Baseline Y coordinate in PDF points */
  readonly baselineY: number;
};
