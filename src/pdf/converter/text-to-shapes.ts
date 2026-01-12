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
 */
function createTextBody(pdfText: PdfText): TextBody {
  const paragraph = createParagraph(pdfText);

  return {
    bodyProperties: {
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
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
    pdfText.wordSpacing,
    pdfText.horizontalScaling,
    pdfText.text
  );

  return {
    type: "text",
    text: pdfText.text,
    properties: {
      fontSize: convertFontSize(pdfText.fontSize),
      fontFamily: mapFontName(pdfText.fontName),
      fill: convertFill(pdfText.graphicsState.fillColor, pdfText.graphicsState.fillAlpha),
      bold: isBoldFont(normalizedName),
      italic: isItalicFont(normalizedName),
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
 * PPTX spacing limits in pixels (approx ±1000pt after conversion)
 * OOXML ST_TextPoint has practical limits around ±400000 centipoints
 */
const SPACING_MIN_PX = -1000 * PT_TO_PX;
const SPACING_MAX_PX = 1000 * PT_TO_PX;

/**
 * Convert PDF spacing properties to PPTX spacing.
 *
 * ## PDF Spacing Properties
 *
 * - **charSpacing (Tc)**: Added to every character (in points)
 * - **wordSpacing (Tw)**: Added only to space characters (in points)
 * - **horizontalScaling (Tz)**: Scales all spacing (percentage, default 100)
 *
 * ## PPTX Spacing
 *
 * PPTX has a single spacing value per TextRun (RunProperties.spacing).
 * We compute an effective spacing by combining charSpacing and wordSpacing
 * weighted by the frequency of spaces in the text.
 *
 * @param charSpacing - PDF Tc value in points
 * @param wordSpacing - PDF Tw value in points
 * @param horizontalScaling - PDF Tz value as percentage (default 100)
 * @param text - The text content (needed to calculate wordSpacing contribution)
 * @returns PPTX spacing value in pixels, or undefined if no significant spacing
 */
function convertSpacing(
  charSpacing: number | undefined,
  wordSpacing: number | undefined,
  horizontalScaling: number | undefined,
  text: string
): Pixels | undefined {
  // Early return if no spacing values
  if (
    (charSpacing === undefined || charSpacing === 0) &&
    (wordSpacing === undefined || wordSpacing === 0)
  ) {
    return undefined;
  }

  const scale = (horizontalScaling ?? 100) / 100;
  const baseSpacing = (charSpacing ?? 0) * scale;

  // Calculate effective spacing with wordSpacing contribution
  let effectiveSpacing = baseSpacing;

  if (wordSpacing && wordSpacing !== 0) {
    // Count spaces in text to calculate wordSpacing contribution
    // wordSpacing is applied only to space characters
    const spaceCount = (text.match(/ /g) ?? []).length;
    const totalGaps = Math.max(text.length - 1, 1); // Number of inter-character gaps

    // Weighted average: add wordSpacing contribution proportional to space frequency
    const wordSpacingContribution = (wordSpacing * scale * spaceCount) / totalGaps;
    effectiveSpacing += wordSpacingContribution;
  }

  // Skip if effective spacing is zero
  if (effectiveSpacing === 0) {
    return undefined;
  }

  // Convert to pixels and clamp to valid range
  const spacingPx = effectiveSpacing * PT_TO_PX;
  return validateAndClampSpacing(spacingPx);
}

/**
 * Validate and clamp spacing value to PPTX limits.
 *
 * @param spacingPx - Spacing value in pixels
 * @returns Clamped spacing value, or undefined if too small to matter
 */
function validateAndClampSpacing(spacingPx: number): Pixels | undefined {
  // Skip negligible spacing (less than 0.1px)
  if (Math.abs(spacingPx) < 0.1) {
    return undefined;
  }

  // Clamp to PPTX limits
  if (spacingPx < SPACING_MIN_PX || spacingPx > SPACING_MAX_PX) {
    console.warn(
      `[PDF] Spacing ${spacingPx.toFixed(2)}px exceeds limits, clamping to [${SPACING_MIN_PX}, ${SPACING_MAX_PX}]`
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
 * Create TextBody from grouped paragraphs.
 */
function createTextBodyFromGroup(group: GroupedText): TextBody {
  return {
    bodyProperties: {
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
    },
    paragraphs: group.paragraphs.map(createParagraphFromGrouped),
  };
}

/**
 * Create a Paragraph from a GroupedParagraph.
 */
function createParagraphFromGrouped(para: GroupedParagraph): Paragraph {
  return {
    properties: { alignment: "left" },
    runs: para.runs.map(createTextRun),
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
