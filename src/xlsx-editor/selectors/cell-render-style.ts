/**
 * @file Cell render style (SpreadsheetML)
 *
 * Resolves effective ECMA-376 (styles.xml) formatting into CSSProperties for rendering.
 */

import type { CSSProperties } from "react";
import type { CellAddress } from "../../xlsx/domain/cell/address";
import type { Cell } from "../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import type { XlsxStyleSheet, XlsxAlignment, XlsxCellXf } from "../../xlsx/domain/style/types";

type ColorLike =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | { readonly type: "indexed"; readonly index: number }
  | { readonly type: "auto" };

function normalizeArgb(value: string): string | undefined {
  const raw = value.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{8}$/u.test(hex)) {
    return undefined;
  }
  return hex.toUpperCase();
}

function argbToCssColor(value: string): string | undefined {
  const hex = normalizeArgb(value);
  if (!hex) {
    return undefined;
  }
  const a = Number.parseInt(hex.slice(0, 2), 16);
  const r = Number.parseInt(hex.slice(2, 4), 16);
  const g = Number.parseInt(hex.slice(4, 6), 16);
  const b = Number.parseInt(hex.slice(6, 8), 16);

  if (![a, r, g, b].every((n) => Number.isFinite(n))) {
    return undefined;
  }

  if (a === 255) {
    return `#${hex.slice(2)}`;
  }
  const alpha = Math.max(0, Math.min(1, a / 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorToCss(color: ColorLike | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  if (color.type === "rgb") {
    return argbToCssColor(color.value);
  }
  // TODO: theme/indexed/auto mapping requires theme + indexed palette support.
  return undefined;
}

function pointsToCssPx(points: number): string {
  return `${(points * 96) / 72}px`;
}

function applyAlignment(style: CSSProperties, alignment: XlsxAlignment | undefined): void {
  if (!alignment) {
    return;
  }

  if (alignment.horizontal === "left") {
    style.justifyContent = "flex-start";
  } else if (alignment.horizontal === "center" || alignment.horizontal === "centerContinuous") {
    style.justifyContent = "center";
  } else if (alignment.horizontal === "right") {
    style.justifyContent = "flex-end";
  }

  if (alignment.vertical === "top") {
    style.alignItems = "flex-start";
  } else if (alignment.vertical === "center") {
    style.alignItems = "center";
  } else if (alignment.vertical === "bottom") {
    style.alignItems = "flex-end";
  }

  if (alignment.wrapText === true) {
    style.whiteSpace = "normal";
  }
}

function getCellXf(styles: XlsxStyleSheet, styleId: number | undefined): XlsxCellXf | undefined {
  const idx = typeof styleId === "number" ? styleId : 0;
  if (idx < 0) {
    return styles.cellXfs[0];
  }
  return styles.cellXfs[idx] ?? styles.cellXfs[0];
}

function mergeCellXf(styles: XlsxStyleSheet, xf: XlsxCellXf): XlsxCellXf {
  const base = xf.xfId !== undefined ? styles.cellStyleXfs[xf.xfId] : undefined;
  if (!base) {
    return xf;
  }

  const applyFont = xf.applyFont !== false;
  const applyFill = xf.applyFill !== false;
  const applyBorder = xf.applyBorder !== false;
  const applyAlignment = xf.applyAlignment !== false;
  const applyNumberFormat = xf.applyNumberFormat !== false;
  const applyProtection = xf.applyProtection !== false;

  return {
    numFmtId: applyNumberFormat ? xf.numFmtId : base.numFmtId,
    fontId: applyFont ? xf.fontId : base.fontId,
    fillId: applyFill ? xf.fillId : base.fillId,
    borderId: applyBorder ? xf.borderId : base.borderId,
    xfId: xf.xfId,
    alignment: applyAlignment ? (xf.alignment ?? base.alignment) : base.alignment,
    protection: applyProtection ? (xf.protection ?? base.protection) : base.protection,
    applyNumberFormat: xf.applyNumberFormat,
    applyFont: xf.applyFont,
    applyFill: xf.applyFill,
    applyBorder: xf.applyBorder,
    applyAlignment: xf.applyAlignment,
    applyProtection: xf.applyProtection,
  };
}

type CssBorderStyle = "solid" | "dashed" | "dotted" | "double";

function borderStyleToCss(edgeStyle: string): { width: number; style: CssBorderStyle } | undefined {
  switch (edgeStyle) {
    case "none":
      return undefined;
    case "thin":
      return { width: 1, style: "solid" };
    case "medium":
      return { width: 2, style: "solid" };
    case "thick":
      return { width: 3, style: "solid" };
    case "dashed":
    case "mediumDashed":
    case "slantDashDot":
    case "dashDot":
    case "mediumDashDot":
    case "dashDotDot":
    case "mediumDashDotDot":
      return { width: 1, style: "dashed" };
    case "dotted":
    case "hair":
      return { width: 1, style: "dotted" };
    case "double":
      return { width: 3, style: "double" };
  }
  return { width: 1, style: "solid" };
}

export type CellBorderEdgeDecoration = {
  readonly width: number;
  readonly style: CssBorderStyle;
  readonly color: string;
};

export type CellBorderDecoration = {
  readonly left?: CellBorderEdgeDecoration;
  readonly right?: CellBorderEdgeDecoration;
  readonly top?: CellBorderEdgeDecoration;
  readonly bottom?: CellBorderEdgeDecoration;
};

function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): number | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId as number | undefined;
    }
  }
  return undefined;
}

function getRowStyleId(sheet: XlsxWorksheet, rowNumber: number): number | undefined {
  const row = sheet.rows.find((r) => (r.rowNumber as number) === rowNumber);
  return row?.styleId as number | undefined;
}

function resolveEffectiveStyleId(
  sheet: XlsxWorksheet,
  address: CellAddress,
  cell: Cell | undefined,
): number | undefined {
  return (
    (cell?.styleId as number | undefined) ??
    getRowStyleId(sheet, address.row as number) ??
    getColumnStyleId(sheet, address.col as number)
  );
}

export function resolveCellRenderStyle(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
}): CSSProperties {
  const { styles, sheet, address, cell } = params;

  const styleId = resolveEffectiveStyleId(sheet, address, cell);

  const xf = getCellXf(styles, styleId);
  if (!xf) {
    return {};
  }

  const resolvedXf = mergeCellXf(styles, xf);
  const css: CSSProperties = {};

  const font = styles.fonts[resolvedXf.fontId as number];
  if (font) {
    css.fontFamily = font.name;
    css.fontSize = pointsToCssPx(font.size);
    if (font.bold) css.fontWeight = 700;
    if (font.italic) css.fontStyle = "italic";
    if (font.color) {
      const color = colorToCss(font.color as ColorLike);
      if (color) css.color = color;
    }

    const decorations: string[] = [];
    if (font.underline && font.underline !== "none") {
      decorations.push("underline");
    }
    if (font.strikethrough) {
      decorations.push("line-through");
    }
    if (decorations.length > 0) {
      css.textDecorationLine = decorations.join(" ");
    }
  }

  const fill = styles.fills[resolvedXf.fillId as number];
  if (fill?.type === "pattern" && fill.pattern.patternType === "solid") {
    const fg = colorToCss(fill.pattern.fgColor as ColorLike | undefined);
    if (fg) {
      css.backgroundColor = fg;
    }
  }

  applyAlignment(css, resolvedXf.alignment);

  return css;
}

export function resolveCellBorderDecoration(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly defaultBorderColor?: string;
}): CellBorderDecoration | undefined {
  const { styles, sheet, address, cell } = params;
  const fallback = params.defaultBorderColor ?? "var(--border-primary)";

  const styleId = resolveEffectiveStyleId(sheet, address, cell);
  const xf = getCellXf(styles, styleId);
  if (!xf) {
    return undefined;
  }

  const resolvedXf = mergeCellXf(styles, xf);
  const border = styles.borders[resolvedXf.borderId as number];
  if (!border) {
    return undefined;
  }

  const left = border.left ? borderStyleToCss(border.left.style) : undefined;
  const right = border.right ? borderStyleToCss(border.right.style) : undefined;
  const top = border.top ? borderStyleToCss(border.top.style) : undefined;
  const bottom = border.bottom ? borderStyleToCss(border.bottom.style) : undefined;

  let result: CellBorderDecoration = {};
  if (left) {
    result = {
      ...result,
      left: { ...left, color: colorToCss(border.left?.color as ColorLike | undefined) ?? fallback },
    };
  }
  if (right) {
    result = {
      ...result,
      right: { ...right, color: colorToCss(border.right?.color as ColorLike | undefined) ?? fallback },
    };
  }
  if (top) {
    result = {
      ...result,
      top: { ...top, color: colorToCss(border.top?.color as ColorLike | undefined) ?? fallback },
    };
  }
  if (bottom) {
    result = {
      ...result,
      bottom: { ...bottom, color: colorToCss(border.bottom?.color as ColorLike | undefined) ?? fallback },
    };
  }

  const hasAny = Boolean(result.left || result.right || result.top || result.bottom);
  return hasAny ? result : undefined;
}
