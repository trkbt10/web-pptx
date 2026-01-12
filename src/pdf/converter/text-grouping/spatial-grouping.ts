/**
 * @file Spatial grouping strategy for combining adjacent text elements.
 *
 * Groups PDF text elements based on spatial proximity, font properties,
 * and layout characteristics to create logical text blocks.
 *
 * ## Grouping Algorithm
 *
 * 1. **Line Detection**: Group texts by Y proximity using reference font size
 * 2. **Horizontal Merging**: Merge adjacent texts on the same line
 * 3. **Block Formation**: Combine related lines into text blocks
 *
 * ## Coordinate System (PDF)
 *
 * - Origin: bottom-left
 * - Y increases upward
 * - PdfText.y: bottom edge of text bounding box
 * - PdfText.height: full height (ascender - descender) * fontSize / 1000
 */

import type { PdfText } from "../../domain";
import type { GroupedText, GroupedParagraph, TextGroupingStrategy } from "./types";

/**
 * Options for spatial grouping behavior.
 */
export type SpatialGroupingOptions = {
  /**
   * Tolerance for considering texts on the same line.
   * Ratio of font size (default: 0.2 = 20% of fontSize).
   * Applied to the line's reference font size for consistency.
   */
  readonly lineToleranceRatio?: number;

  /**
   * Maximum horizontal gap between texts to group.
   * Ratio of average character width (default: 2.0).
   */
  readonly horizontalGapRatio?: number;

  /**
   * Maximum vertical gap between lines to group.
   * Ratio of line height (default: 1.5).
   */
  readonly verticalGapRatio?: number;
};

const DEFAULT_OPTIONS: Required<SpatialGroupingOptions> = {
  lineToleranceRatio: 0.2,
  horizontalGapRatio: 2.0,
  verticalGapRatio: 1.5,
};

/** Default character width in 1/1000 em units for fallback */
const DEFAULT_CHAR_WIDTH_EM = 500;

/**
 * Strategy that groups text elements based on spatial proximity.
 *
 * Grouping criteria:
 * 1. Same line: Y difference < fontSize * lineToleranceRatio
 * 2. Same horizontal group: X gap < avgCharWidth * horizontalGapRatio
 * 3. Same vertical block: Y gap < lineHeight * verticalGapRatio
 *    AND matching font name/size
 */
export class SpatialGroupingStrategy implements TextGroupingStrategy {
  private readonly options: Required<SpatialGroupingOptions>;

  constructor(options: SpatialGroupingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  group(texts: readonly PdfText[]): readonly GroupedText[] {
    if (texts.length === 0) return [];

    // Step 1: Sort by Y (top to bottom in PDF coords = descending)
    const sorted = [...texts].sort((a, b) => b.y - a.y);

    // Step 2: Group into lines
    const lines = this.groupIntoLines(sorted);

    // Step 3: Merge adjacent lines into blocks
    const blocks = this.mergeAdjacentLines(lines);

    return blocks;
  }

  /**
   * Group texts into lines based on Y proximity.
   *
   * Uses the line's reference font size (first text in line) for consistent
   * tolerance calculation, avoiding issues with mixed font sizes.
   */
  private groupIntoLines(texts: PdfText[]): GroupedParagraph[] {
    const lines: GroupedParagraph[] = [];
    let currentLine: PdfText[] = [];
    let currentY = texts[0]?.y ?? 0;
    // Use first text's fontSize as reference for consistent tolerance
    let referenceFontSize = texts[0]?.fontSize ?? 12;

    for (const text of texts) {
      // Use reference font size for consistent tolerance across the line
      const tolerance = referenceFontSize * this.options.lineToleranceRatio;

      if (Math.abs(text.y - currentY) <= tolerance) {
        // Same line
        currentLine.push(text);
      } else {
        // New line
        if (currentLine.length > 0) {
          lines.push(this.createParagraph(currentLine));
        }
        currentLine = [text];
        currentY = text.y;
        // Update reference font size for new line
        referenceFontSize = text.fontSize;
      }
    }

    // Don't forget the last line
    if (currentLine.length > 0) {
      lines.push(this.createParagraph(currentLine));
    }

    return lines;
  }

  /**
   * Create a paragraph from texts on the same line.
   * Sorts by X and merges horizontally adjacent texts.
   *
   * ## Baseline Calculation
   *
   * The baseline is calculated from font metrics:
   * - PdfText.y is the bottom edge of the bounding box
   * - baseline = y + |descender| * fontSize / 1000
   *
   * With default metrics (descender = -200):
   * - baseline = y + 200 * fontSize / 1000 = y + 0.2 * fontSize
   */
  private createParagraph(texts: PdfText[]): GroupedParagraph {
    // Sort by X (left to right)
    const sorted = [...texts].sort((a, b) => a.x - b.x);

    // Filter out texts that are too far apart horizontally
    const merged = this.mergeHorizontallyAdjacent(sorted);

    // Calculate baseline from font metrics
    // y is bottom edge, baseline = y - descender (descender is negative)
    const firstText = merged[0];
    const descender = firstText?.fontMetrics?.descender ?? -200;
    const fontSize = firstText?.fontSize ?? 12;
    // baseline = bottom_edge - descender_offset
    // descender is negative, so we add |descender| to y
    const baseline = (firstText?.y ?? 0) - (descender * fontSize) / 1000;

    return {
      runs: merged,
      baselineY: baseline,
    };
  }

  /**
   * Merge horizontally adjacent texts into runs.
   *
   * ## Character Width Estimation
   *
   * Uses fontMetrics.defaultWidth when available (in 1/1000 em units),
   * otherwise falls back to empirical estimation from text width.
   *
   * ## Gap Calculation
   *
   * Expected gap between texts includes:
   * - Character width (for natural spacing)
   * - charSpacing (PDF Tc operator)
   * - wordSpacing (PDF Tw operator, if ending with space)
   * - horizontalScaling (PDF Tz operator)
   */
  private mergeHorizontallyAdjacent(texts: PdfText[]): PdfText[] {
    if (texts.length <= 1) return texts;

    const result: PdfText[] = [texts[0]];

    for (let i = 1; i < texts.length; i++) {
      const prev = texts[i - 1];
      const curr = texts[i];

      // Calculate actual gap
      const gap = curr.x - (prev.x + prev.width);

      // Calculate expected gap based on character width and spacing
      const expectedGap = this.calculateExpectedGap(prev, curr);
      const maxGap = expectedGap * this.options.horizontalGapRatio;

      if (gap <= maxGap && this.hasSameStyle(prev, curr)) {
        // Include in same paragraph
        result.push(curr);
      }
      // If gap too large or different style, don't include in this group
      // Note: Texts not included here are still preserved in the parent line
      // and will be processed in subsequent passes
    }

    return result;
  }

  /**
   * Estimate character width for a text element.
   *
   * Uses fontMetrics.defaultWidth when available, otherwise calculates
   * from the text's width and length with a minimum bound.
   */
  private estimateCharWidth(text: PdfText): number {
    // Use font metrics if available (in 1/1000 em units -> convert to points)
    if (text.fontMetrics) {
      const metricsWidth = DEFAULT_CHAR_WIDTH_EM; // 500 em units
      return (metricsWidth * text.fontSize) / 1000;
    }

    // Fallback: estimate from text width
    // Ensure minimum width to avoid division issues with short texts
    const estimatedWidth = text.width / Math.max(text.text.length, 1);
    const minWidth = text.fontSize * 0.3; // Minimum 30% of font size
    return Math.max(estimatedWidth, minWidth);
  }

  /**
   * Calculate expected gap between two adjacent texts.
   *
   * Takes into account:
   * - Character width (base spacing)
   * - charSpacing (PDF Tc operator)
   * - wordSpacing (PDF Tw operator, if previous text ends with space)
   * - horizontalScaling (PDF Tz operator)
   */
  private calculateExpectedGap(prev: PdfText, curr: PdfText): number {
    const baseCharWidth = (this.estimateCharWidth(prev) + this.estimateCharWidth(curr)) / 2;

    // Get spacing properties with defaults
    const charSpacing = prev.charSpacing ?? 0;
    const hScale = (prev.horizontalScaling ?? 100) / 100;

    // Add wordSpacing if previous text ends with space
    const endsWithSpace = prev.text.endsWith(" ");
    const wordSpacing = endsWithSpace ? (prev.wordSpacing ?? 0) : 0;

    // Apply horizontal scaling to spacing values
    return (baseCharWidth + charSpacing + wordSpacing) * hScale;
  }

  /**
   * Merge adjacent lines into blocks.
   */
  private mergeAdjacentLines(lines: GroupedParagraph[]): GroupedText[] {
    if (lines.length === 0) return [];

    const blocks: GroupedText[] = [];
    let currentParagraphs: GroupedParagraph[] = [lines[0]];

    for (let i = 1; i < lines.length; i++) {
      const prevLine = lines[i - 1];
      const currLine = lines[i];

      if (this.shouldMergeLines(prevLine, currLine)) {
        currentParagraphs.push(currLine);
      } else {
        // Start new block
        blocks.push(this.createGroupedText(currentParagraphs));
        currentParagraphs = [currLine];
      }
    }

    // Don't forget the last block
    if (currentParagraphs.length > 0) {
      blocks.push(this.createGroupedText(currentParagraphs));
    }

    return blocks;
  }

  /**
   * Check if two lines should be merged into same block.
   */
  private shouldMergeLines(
    line1: GroupedParagraph,
    line2: GroupedParagraph
  ): boolean {
    const text1 = line1.runs[0];
    const text2 = line2.runs[0];
    if (!text1 || !text2) return false;

    // Check font match
    if (!this.hasSameStyle(text1, text2)) return false;

    // Check vertical distance
    const lineHeight = Math.max(text1.height, text2.height);
    const verticalGap = Math.abs(line1.baselineY - line2.baselineY) - lineHeight;
    const maxGap = lineHeight * this.options.verticalGapRatio;

    return verticalGap <= maxGap;
  }

  /**
   * Check if two texts have the same font style.
   */
  private hasSameStyle(t1: PdfText, t2: PdfText): boolean {
    // Font name (ignore subset prefix)
    const name1 = this.normalizeFontName(t1.fontName);
    const name2 = this.normalizeFontName(t2.fontName);
    if (name1 !== name2) return false;

    // Font size (5% tolerance)
    const sizeDiff = Math.abs(t1.fontSize - t2.fontSize);
    if (sizeDiff > t1.fontSize * 0.05) return false;

    return true;
  }

  /**
   * Normalize font name by removing subset prefix.
   */
  private normalizeFontName(name: string): string {
    const plusIndex = name.indexOf("+");
    return plusIndex > 0 ? name.slice(plusIndex + 1) : name;
  }

  /**
   * Create GroupedText from paragraphs.
   */
  private createGroupedText(paragraphs: GroupedParagraph[]): GroupedText {
    const allRuns = paragraphs.flatMap((p) => p.runs);

    const minX = Math.min(...allRuns.map((r) => r.x));
    const maxX = Math.max(...allRuns.map((r) => r.x + r.width));
    const minY = Math.min(...allRuns.map((r) => r.y));
    const maxY = Math.max(...allRuns.map((r) => r.y + r.height));

    return {
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      paragraphs,
    };
  }
}
