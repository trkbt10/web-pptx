/**
 * @file PdfText → SpShape (textbox) converter
 */

import type { PdfText } from "../domain";
import type { SpShape } from "../../pptx/domain/shape";
import type { Paragraph, TextBody, TextRun } from "../../pptx/domain/text";
import type { Pixels, Points } from "../../ooxml/domain/units";
import { deg, pt, px } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertPoint, convertSize } from "./transform-converter";
import { convertFill } from "./color-converter";
import { mapFontName, isBoldFont, isItalicFont, normalizeFontName } from "../domain/font";
import { PT_TO_PX } from "../domain/constants";
import type { GroupedText, GroupedParagraph } from "./text-grouping/types";

/**
 * Convert PDF text position to PPTX shape position.
 *
 * ## Coordinate Pipeline
 *
 * 1. **PDF Parser** (`pdf-parser.ts:convertText`):
 *    - run.y = baseline position (from text matrix + CTM)
 *    - minY = run.y + (descender * effectiveSize / 1000) = bottom edge
 *    - PdfText.y = minY (bottom edge in PDF coordinates)
 *
 * 2. **Transform Converter** (`convertPoint`):
 *    - Flips Y axis: pptxY = (pdfHeight - pdfY) * scale
 *    - After conversion, Y represents bottom edge in PPTX coord space
 *
 * 3. **This Function**:
 *    - Subtracts height to get top edge (PPTX shapes use top-left origin)
 *
 * ## Coordinate Systems
 *
 * PDF (origin: bottom-left):
 * - y: bottom edge of text bounding box
 * - Text grows upward from y
 *
 * PPTX (origin: top-left):
 * - y: top edge of shape from top
 * - Shape grows downward from y
 */
function convertTextPosition(
  position: Readonly<{ x: number; y: number }>,
  size: Readonly<{ width: Pixels; height: Pixels }>,
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const converted = convertPoint(position, context);

  // position.y is the bottom edge of the text box in PDF coordinates
  // After convertPoint(), it's the bottom edge in PPTX coordinates
  // Subtract height to get the top edge (PPTX shapes position from top-left)
  return {
    x: converted.x,
    y: px((converted.y as number) - (size.height as number)),
  };
}

/**
 * PdfTextをSpShape（テキストボックス）に変換
 */
export function convertTextToShape(
  pdfText: PdfText,
  context: ConversionContext,
  shapeId: string
): SpShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }
  if (!Number.isFinite(pdfText.x) || !Number.isFinite(pdfText.y)) {
    throw new Error(`Invalid PdfText position: (${pdfText.x}, ${pdfText.y})`);
  }
  if (!Number.isFinite(pdfText.width) || pdfText.width < 0) {
    throw new Error(`Invalid PdfText width: ${pdfText.width}`);
  }
  if (!Number.isFinite(pdfText.height) || pdfText.height < 0) {
    throw new Error(`Invalid PdfText height: ${pdfText.height}`);
  }

  const size = convertSize(pdfText.width, pdfText.height, context);
  const position = convertTextPosition(
    { x: pdfText.x, y: pdfText.y },
    size,
    context
  );
  const textBody = createTextBody(pdfText);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `TextBox ${shapeId}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody,
  };
}

/**
 * TextBodyを構築
 *
 * Sets insets to 0 for precise text positioning.
 */
function createTextBody(pdfText: PdfText): TextBody {
  const paragraph = createParagraph(pdfText);

  return {
    bodyProperties: {
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
      // Set all insets to 0 for precise positioning
      insets: {
        left: px(0),
        top: px(0),
        right: px(0),
        bottom: px(0),
      },
    },
    paragraphs: [paragraph],
  };
}

/**
 * Paragraphを構築
 */
function createParagraph(pdfText: PdfText): Paragraph {
  const textRun = createTextRun(pdfText);

  return {
    properties: {
      alignment: "left",
    },
    runs: [textRun],
    endProperties: {},
  };
}

/**
 * TextRunを構築
 */
function createTextRun(pdfText: PdfText): TextRun {
  const normalizedName = normalizeFontName(pdfText.fontName);
  const spacing = convertSpacing(
    pdfText.charSpacing,
    pdfText.horizontalScaling
  );

  // Use isBold/isItalic from PdfText if available (from FontDescriptor),
  // otherwise fall back to font name detection
  const bold = pdfText.isBold ?? isBoldFont(normalizedName);
  const italic = pdfText.isItalic ?? isItalicFont(normalizedName);

  return {
    type: "text",
    text: pdfText.text,
    properties: {
      fontSize: convertFontSize(pdfText.fontSize),
      fontFamily: mapFontName(pdfText.fontName),
      fill: convertFill(pdfText.graphicsState.fillColor, pdfText.graphicsState.fillAlpha),
      bold,
      italic,
      underline: "none",
      // Add spacing if present
      ...(spacing !== undefined && { spacing }),
    },
  };
}

/**
 * PDFフォントサイズをPPTXフォントサイズに変換
 * PDFとPPTXは共にポイント単位
 * 内部のPoints型は実際のポイント値を保持する
 */
function convertFontSize(pdfFontSize: number): Points {
  if (!Number.isFinite(pdfFontSize) || pdfFontSize <= 0) {
    throw new Error(`Invalid pdfFontSize: ${pdfFontSize}`);
  }
  return pt(pdfFontSize);
}

/**
 * PPTX spacing limits in pixels.
 * OOXML ST_TextPointUnqualified has practical limits around ±4000 points (±400000 centipoints).
 * Converted to pixels: ±4000pt × 1.333px/pt ≈ ±5333px
 * We use more conservative limits for practical text rendering.
 */
const SPACING_MIN_PX = -1000 * PT_TO_PX;
const SPACING_MAX_PX = 1000 * PT_TO_PX;

/**
 * Convert PDF spacing properties to PPTX spacing.
 *
 * ## PDF Spacing Properties (ISO 32000-1)
 *
 * - **charSpacing (Tc)**: Added to every character displacement (in points)
 * - **wordSpacing (Tw)**: Added only to space characters (0x20) - not mapped to PPTX
 * - **horizontalScaling (Tz)**: Scales all spacing (percentage, default 100)
 *
 * ## PPTX Spacing (ECMA-376)
 *
 * PPTX has a single spacing value per TextRun (RunProperties.spacing).
 * This maps directly to PDF's charSpacing (Tc) operator.
 *
 * Note: wordSpacing (Tw) is intentionally not included because PPTX's spacing
 * applies uniformly to all characters, while PDF's Tw only affects spaces.
 * Attempting to average Tw across all gaps produces inaccurate results.
 *
 * @param charSpacing - PDF Tc value in points
 * @param horizontalScaling - PDF Tz value as percentage (default 100)
 * @returns PPTX spacing value in pixels, or undefined if no significant spacing
 */
function convertSpacing(
  charSpacing: number | undefined,
  horizontalScaling: number | undefined
): Pixels | undefined {
  // Early return if no charSpacing
  if (charSpacing === undefined || charSpacing === 0) {
    return undefined;
  }

  // Apply horizontal scaling to charSpacing
  const scale = (horizontalScaling ?? 100) / 100;
  const spacingPts = charSpacing * scale;

  // Skip negligible spacing (less than 0.01pt)
  if (Math.abs(spacingPts) < 0.01) {
    return undefined;
  }

  // Convert from PDF points to CSS pixels
  const spacingPx = spacingPts * PT_TO_PX;

  return validateAndClampSpacing(spacingPx);
}

/**
 * Validate and clamp spacing value to PPTX limits.
 *
 * @param spacingPx - Spacing value in pixels
 * @returns Clamped spacing value in pixels, or undefined if too small to matter
 */
function validateAndClampSpacing(spacingPx: number): Pixels | undefined {
  // Skip negligible spacing (less than 0.1px ≈ 0.075pt)
  if (Math.abs(spacingPx) < 0.1) {
    return undefined;
  }

  // Clamp to PPTX limits
  if (spacingPx < SPACING_MIN_PX || spacingPx > SPACING_MAX_PX) {
    console.warn(
      `[PDF] Spacing ${spacingPx.toFixed(2)}px exceeds limits, clamping to [${SPACING_MIN_PX.toFixed(0)}, ${SPACING_MAX_PX.toFixed(0)}]`
    );
    return px(Math.max(SPACING_MIN_PX, Math.min(SPACING_MAX_PX, spacingPx)));
  }

  return px(spacingPx);
}

// =============================================================================
// Grouped Text Conversion
// =============================================================================

/**
 * Convert grouped text position from PDF to PPTX coordinates.
 *
 * Same coordinate pipeline as {@link convertTextPosition}.
 * bounds.y is the bottom edge in PDF coordinates.
 */
function convertGroupedTextPosition(
  bounds: { x: number; y: number; width: number; height: number },
  size: { width: Pixels; height: Pixels },
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const converted = convertPoint({ x: bounds.x, y: bounds.y }, context);
  return {
    x: converted.x,
    y: px((converted.y as number) - (size.height as number)),
  };
}

/**
 * Threshold for paragraph break detection.
 * If extra space between lines exceeds this ratio of font size,
 * treat it as a new paragraph. Otherwise, flatten into same paragraph.
 */
const PARAGRAPH_BREAK_THRESHOLD_RATIO = 0.5;

/**
 * Create TextBody from grouped paragraphs.
 *
 * Sets insets to 0 to ensure text is positioned exactly at the TextBox origin.
 * PPTX default insets are 0.1 inch (~9.6px), which would cause visible offset.
 *
 * ## Text Wrapping Strategy
 *
 * For text wrapping to work in PPTX, text must be in the SAME paragraph.
 * This function flattens consecutive lines that have normal line spacing
 * into a single PPTX paragraph, enabling proper text wrapping.
 *
 * Lines are considered part of the same paragraph if:
 * - extraSpace <= fontSize * PARAGRAPH_BREAK_THRESHOLD_RATIO
 *
 * A new paragraph is created only when:
 * - There's significant extra space (actual paragraph break in the PDF)
 *
 * ## Coordinate System
 *
 * PDF baselineY is in page coordinates (Y increases upward), so:
 * - First paragraph has highest baselineY
 * - Subsequent paragraphs have lower baselineY values
 * - baselineDistance = prevBaselineY - currentBaselineY
 */
function createTextBodyFromGroup(group: GroupedText): TextBody {
  // Flatten consecutive lines into logical paragraphs based on spacing
  const logicalParagraphs = flattenToParagraphs(group.paragraphs);

  return {
    bodyProperties: {
      // Use "square" wrapping to enable text wrapping within TextBox bounds
      // This improves editability in PPTX while maintaining layout from PDF
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      // Set all insets to 0 for precise positioning
      // Default PPTX insets are 91440 EMU = 0.1 inch = ~9.6px
      insets: {
        left: px(0),
        top: px(0),
        right: px(0),
        bottom: px(0),
      },
    },
    paragraphs: logicalParagraphs,
  };
}

/**
 * Flatten GroupedParagraphs (PDF lines) into logical PPTX paragraphs.
 *
 * Consecutive lines with normal line spacing are combined into one paragraph
 * to enable text wrapping. A new paragraph is created only when there's
 * significant extra space (indicating a real paragraph break).
 */
function flattenToParagraphs(groupedParas: readonly GroupedParagraph[]): Paragraph[] {
  if (groupedParas.length === 0) return [];
  if (groupedParas.length === 1) {
    return [createFlatParagraph(groupedParas[0].runs, undefined)];
  }

  const result: Paragraph[] = [];
  let currentRuns: PdfText[] = [...groupedParas[0].runs];
  let spaceBefore: number | undefined = undefined;

  for (let i = 1; i < groupedParas.length; i++) {
    const prevPara = groupedParas[i - 1];
    const currPara = groupedParas[i];

    // Calculate spacing between lines
    const baselineDistance = prevPara.baselineY - currPara.baselineY;
    const prevFontSize = prevPara.runs[0]?.fontSize ?? 12;
    const extraSpace = baselineDistance - prevFontSize;

    // Check if this is a paragraph break (significant extra space)
    const threshold = prevFontSize * PARAGRAPH_BREAK_THRESHOLD_RATIO;
    const isParagraphBreak = extraSpace > threshold;

    if (isParagraphBreak) {
      // Finish current paragraph and start new one
      result.push(createFlatParagraph(currentRuns, spaceBefore));
      currentRuns = [...currPara.runs];
      // Set spaceBefore for the new paragraph
      spaceBefore = extraSpace > 0 ? extraSpace : undefined;
    } else {
      // Continue same paragraph - add runs from this line
      currentRuns.push(...currPara.runs);
    }
  }

  // Don't forget the last paragraph
  if (currentRuns.length > 0) {
    result.push(createFlatParagraph(currentRuns, spaceBefore));
  }

  return result;
}

/**
 * Create a flattened PPTX Paragraph from multiple runs.
 */
function createFlatParagraph(runs: readonly PdfText[], spaceBeforePts: number | undefined): Paragraph {
  return {
    properties: {
      alignment: "left",
      ...(spaceBeforePts !== undefined && spaceBeforePts > 0 && {
        spaceBefore: { type: "points" as const, value: pt(spaceBeforePts) },
      }),
    },
    runs: runs.map(createTextRun),
    endProperties: {},
  };
}

/**
 * Convert a GroupedText to a PPTX SpShape (TextBox).
 *
 * This handles the case where multiple PdfText elements are
 * combined into a single TextBox with multiple paragraphs/runs.
 */
export function convertGroupedTextToShape(
  group: GroupedText,
  context: ConversionContext,
  shapeId: string
): SpShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const size = convertSize(group.bounds.width, group.bounds.height, context);
  const position = convertGroupedTextPosition(
    group.bounds,
    size,
    context
  );
  const textBody = createTextBodyFromGroup(group);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `TextBox ${shapeId}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody,
  };
}
