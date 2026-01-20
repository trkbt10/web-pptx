/**
 * @file StyleSheet mutation helpers (SpreadsheetML)
 *
 * Utilities for creating/reusing fonts/fills/borders/numFmts/cellXfs when
 * building new styleId values for edited cell formatting.
 */

import type { XlsxFont, XlsxColor as XlsxFontColor } from "./font";
import type { XlsxFill, XlsxColor as XlsxFillColor } from "./fill";
import type { XlsxBorder, XlsxBorderEdge } from "./border";
import type { XlsxAlignment, XlsxCellXf, XlsxStyleSheet } from "./types";
import type { XlsxNumberFormat } from "./number-format";
import { borderId, fillId, fontId, numFmtId, styleId, type BorderId, type FillId, type FontId, type NumFmtId, type StyleId } from "../types";

type XlsxColorLike = XlsxFontColor | XlsxFillColor;

const isEqualColor = (left: XlsxColorLike | undefined, right: XlsxColorLike | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  if (left.type !== right.type) {
    return false;
  }
  switch (left.type) {
    case "auto":
      return true;
    case "rgb":
      return right.type === "rgb" && left.value === right.value;
    case "indexed":
      return right.type === "indexed" && left.index === right.index;
    case "theme": {
      return right.type === "theme" && left.theme === right.theme && left.tint === right.tint;
    }
  }
};

const isEqualFont = (left: XlsxFont, right: XlsxFont): boolean => {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strikethrough === right.strikethrough &&
    isEqualColor(left.color, right.color) &&
    left.family === right.family &&
    left.scheme === right.scheme &&
    left.vertAlign === right.vertAlign &&
    left.outline === right.outline &&
    left.shadow === right.shadow &&
    left.condense === right.condense &&
    left.extend === right.extend
  );
};

const isEqualFill = (left: XlsxFill, right: XlsxFill): boolean => {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "none") {
    return true;
  }
  if (left.type === "pattern") {
    if (right.type !== "pattern") {
      return false;
    }
    return (
      left.pattern.patternType === right.pattern.patternType &&
      isEqualColor(left.pattern.fgColor, right.pattern.fgColor) &&
      isEqualColor(left.pattern.bgColor, right.pattern.bgColor)
    );
  }
  if (right.type !== "gradient") {
    return false;
  }
  if (left.gradient.gradientType !== right.gradient.gradientType) {
    return false;
  }
  if (left.gradient.degree !== right.gradient.degree) {
    return false;
  }
  if (left.gradient.stops.length !== right.gradient.stops.length) {
    return false;
  }
  for (let i = 0; i < left.gradient.stops.length; i += 1) {
    const lStop = left.gradient.stops[i]!;
    const rStop = right.gradient.stops[i]!;
    if (lStop.position !== rStop.position) {
      return false;
    }
    if (!isEqualColor(lStop.color, rStop.color)) {
      return false;
    }
  }
  return true;
};

const isEqualBorderEdge = (left: XlsxBorderEdge | undefined, right: XlsxBorderEdge | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.style === right.style && isEqualColor(left.color, right.color);
};

const isEqualBorder = (left: XlsxBorder, right: XlsxBorder): boolean => {
  return (
    isEqualBorderEdge(left.left, right.left) &&
    isEqualBorderEdge(left.right, right.right) &&
    isEqualBorderEdge(left.top, right.top) &&
    isEqualBorderEdge(left.bottom, right.bottom) &&
    isEqualBorderEdge(left.diagonal, right.diagonal) &&
    left.diagonalUp === right.diagonalUp &&
    left.diagonalDown === right.diagonalDown &&
    left.outline === right.outline
  );
};

const isEqualAlignment = (left: XlsxAlignment | undefined, right: XlsxAlignment | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.horizontal === right.horizontal &&
    left.vertical === right.vertical &&
    left.wrapText === right.wrapText &&
    left.shrinkToFit === right.shrinkToFit &&
    left.textRotation === right.textRotation &&
    left.indent === right.indent &&
    left.readingOrder === right.readingOrder
  );
};

const isEqualCellXf = (left: XlsxCellXf, right: XlsxCellXf): boolean => {
  return (
    left.numFmtId === right.numFmtId &&
    left.fontId === right.fontId &&
    left.fillId === right.fillId &&
    left.borderId === right.borderId &&
    left.xfId === right.xfId &&
    isEqualAlignment(left.alignment, right.alignment) &&
    left.applyNumberFormat === right.applyNumberFormat &&
    left.applyFont === right.applyFont &&
    left.applyFill === right.applyFill &&
    left.applyBorder === right.applyBorder &&
    left.applyAlignment === right.applyAlignment &&
    left.applyProtection === right.applyProtection
  );
};

export type UpsertFontResult = { readonly styles: XlsxStyleSheet; readonly fontId: FontId };
export type UpsertFillResult = { readonly styles: XlsxStyleSheet; readonly fillId: FillId };
export type UpsertBorderResult = { readonly styles: XlsxStyleSheet; readonly borderId: BorderId };
export type UpsertNumberFormatResult = { readonly styles: XlsxStyleSheet; readonly numFmtId: NumFmtId };
export type UpsertCellXfResult = { readonly styles: XlsxStyleSheet; readonly styleId: StyleId };

export function upsertFont(styles: XlsxStyleSheet, font: XlsxFont): UpsertFontResult {
  const existingIndex = styles.fonts.findIndex((candidate) => isEqualFont(candidate, font));
  if (existingIndex >= 0) {
    return { styles, fontId: fontId(existingIndex) };
  }
  return { styles: { ...styles, fonts: [...styles.fonts, font] }, fontId: fontId(styles.fonts.length) };
}

export function upsertFill(styles: XlsxStyleSheet, fill: XlsxFill): UpsertFillResult {
  const existingIndex = styles.fills.findIndex((candidate) => isEqualFill(candidate, fill));
  if (existingIndex >= 0) {
    return { styles, fillId: fillId(existingIndex) };
  }
  return { styles: { ...styles, fills: [...styles.fills, fill] }, fillId: fillId(styles.fills.length) };
}

export function upsertBorder(styles: XlsxStyleSheet, border: XlsxBorder): UpsertBorderResult {
  const existingIndex = styles.borders.findIndex((candidate) => isEqualBorder(candidate, border));
  if (existingIndex >= 0) {
    return { styles, borderId: borderId(existingIndex) };
  }
  return { styles: { ...styles, borders: [...styles.borders, border] }, borderId: borderId(styles.borders.length) };
}

function nextCustomNumFmtId(numberFormats: readonly XlsxNumberFormat[]): number {
  const max = numberFormats.reduce<number>((acc, entry) => Math.max(acc, entry.numFmtId), 163);
  return Math.max(164, max + 1);
}

export function upsertCustomNumberFormat(styles: XlsxStyleSheet, formatCode: string): UpsertNumberFormatResult {
  const existing = styles.numberFormats.find((candidate) => candidate.formatCode === formatCode);
  if (existing) {
    return { styles, numFmtId: existing.numFmtId };
  }
  const nextId = nextCustomNumFmtId(styles.numberFormats);
  const entry: XlsxNumberFormat = { numFmtId: numFmtId(nextId), formatCode };
  return { styles: { ...styles, numberFormats: [...styles.numberFormats, entry] }, numFmtId: entry.numFmtId };
}

export function useBuiltinNumberFormat(styles: XlsxStyleSheet, builtinId: number): UpsertNumberFormatResult {
  void styles;
  return { styles, numFmtId: numFmtId(builtinId) };
}

export function upsertCellXf(styles: XlsxStyleSheet, xf: XlsxCellXf): UpsertCellXfResult {
  const existingIndex = styles.cellXfs.findIndex((candidate) => isEqualCellXf(candidate, xf));
  if (existingIndex >= 0) {
    return { styles, styleId: styleId(existingIndex) };
  }
  return { styles: { ...styles, cellXfs: [...styles.cellXfs, xf] }, styleId: styleId(styles.cellXfs.length) };
}
