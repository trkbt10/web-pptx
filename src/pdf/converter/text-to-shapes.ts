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

/**
 * Convert PDF text position to PPTX shape position.
 *
 * ## Coordinate Systems
 *
 * PDF (origin: bottom-left):
 * - y: baseline position from bottom
 * - Text grows upward from baseline
 *
 * PPTX (origin: top-left):
 * - y: top edge of shape from top
 * - Shape grows downward from y
 *
 * ## Conversion
 *
 * Current simplified approach:
 * - Convert the baseline position via {@link convertPoint}
 * - Subtract the text box height to approximate the top edge
 *
 * Note: This is an approximation. Accurate conversion would require font
 * ascender/descender metrics (baseline-to-top differs by font).
 */
function convertTextPosition(
  position: Readonly<{ x: number; y: number }>,
  size: Readonly<{ width: Pixels; height: Pixels }>,
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const converted = convertPoint(position, context);

  // PDF text y-coordinate represents the baseline.
  // PPTX shape y-coordinate represents the top edge.
  // Subtract height to convert from baseline to top position.
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
  const position = convertTextPosition({ x: pdfText.x, y: pdfText.y }, size, context);
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
