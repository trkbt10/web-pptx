import type { CellRange } from "../../xlsx/domain/cell/address";
import type { StyleId } from "../../xlsx/domain/types";
import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import { resolveMergedCellXfFromStyleId } from "./cell-xf";

export type MixedBoolean = { readonly mixed: false; readonly value: boolean } | { readonly mixed: true };

export type SelectionFormatFlags = {
  readonly bold: MixedBoolean;
  readonly italic: MixedBoolean;
  readonly underline: MixedBoolean;
  readonly strikethrough: MixedBoolean;
  readonly wrapText: MixedBoolean;
  readonly tooLarge: boolean;
};

type StyleFlags = {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikethrough: boolean;
  readonly wrapText: boolean;
};

function toMixedBoolean(value: boolean): MixedBoolean {
  return { mixed: false, value };
}

function mixBoolean(current: MixedBoolean, next: boolean): MixedBoolean {
  if (current.mixed) {
    return current;
  }
  return current.value === next ? current : { mixed: true };
}

function getRangeBounds(range: CellRange): { readonly minRow: number; readonly maxRow: number; readonly minCol: number; readonly maxCol: number } {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): StyleId | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId;
    }
  }
  return undefined;
}

function styleIdToNumber(id: StyleId | undefined): number | undefined {
  return id as number | undefined;
}

export function resolveSelectionFormatFlags(params: {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly range: CellRange;
  readonly maxCellsToAnalyze?: number;
}): SelectionFormatFlags {
  const maxCells = params.maxCellsToAnalyze ?? 5000;
  const bounds = getRangeBounds(params.range);
  const rowCount = bounds.maxRow - bounds.minRow + 1;
  const colCount = bounds.maxCol - bounds.minCol + 1;
  const cellCount = rowCount * colCount;

  if (cellCount > maxCells) {
    return {
      bold: { mixed: true },
      italic: { mixed: true },
      underline: { mixed: true },
      strikethrough: { mixed: true },
      wrapText: { mixed: true },
      tooLarge: true,
    };
  }

  let hasAny = false;
  let bold = toMixedBoolean(false);
  let italic = toMixedBoolean(false);
  let underline = toMixedBoolean(false);
  let strikethrough = toMixedBoolean(false);
  let wrapText = toMixedBoolean(false);

  const styleFlagsCache = new Map<number, StyleFlags>();
  let undefinedStyleFlags: StyleFlags | undefined;

  const getStyleFlags = (styleIdValue: number | undefined): StyleFlags => {
    if (styleIdValue === undefined) {
      if (undefinedStyleFlags) {
        return undefinedStyleFlags;
      }
      const xf = resolveMergedCellXfFromStyleId(params.styles, undefined);
      const font = params.styles.fonts[xf.fontId] ?? params.styles.fonts[0]!;
      undefinedStyleFlags = {
        bold: font.bold === true,
        italic: font.italic === true,
        underline: font.underline !== undefined && font.underline !== "none",
        strikethrough: font.strikethrough === true,
        wrapText: xf.alignment?.wrapText === true,
      };
      return undefinedStyleFlags;
    }

    const cached = styleFlagsCache.get(styleIdValue);
    if (cached) {
      return cached;
    }
    const xf = resolveMergedCellXfFromStyleId(params.styles, styleIdValue);
    const font = params.styles.fonts[xf.fontId] ?? params.styles.fonts[0]!;
    const computed: StyleFlags = {
      bold: font.bold === true,
      italic: font.italic === true,
      underline: font.underline !== undefined && font.underline !== "none",
      strikethrough: font.strikethrough === true,
      wrapText: xf.alignment?.wrapText === true,
    };
    styleFlagsCache.set(styleIdValue, computed);
    return computed;
  };

  const incorporateStyleFlags = (flags: StyleFlags): void => {
    if (!hasAny) {
      hasAny = true;
      bold = toMixedBoolean(flags.bold);
      italic = toMixedBoolean(flags.italic);
      underline = toMixedBoolean(flags.underline);
      strikethrough = toMixedBoolean(flags.strikethrough);
      wrapText = toMixedBoolean(flags.wrapText);
      return;
    }

    bold = mixBoolean(bold, flags.bold);
    italic = mixBoolean(italic, flags.italic);
    underline = mixBoolean(underline, flags.underline);
    strikethrough = mixBoolean(strikethrough, flags.strikethrough);
    wrapText = mixBoolean(wrapText, flags.wrapText);
  };

  const incorporateStyleId = (styleIdValue: number | undefined): void => {
    incorporateStyleFlags(getStyleFlags(styleIdValue));
  };

  // Collect column baseline style IDs (used only for rows that do not have row-level style).
  const columnBaselineStyleIds = new Set<number | undefined>();
  for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
    columnBaselineStyleIds.add(styleIdToNumber(getColumnStyleId(params.sheet, col)));
  }

  const rowStyleIds = new Set<number>();
  const rowsWithRowStyle = new Set<number>();
  const cellOverrideStyleIds = new Set<number>();

  for (const row of params.sheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < bounds.minRow || rowNumber > bounds.maxRow) {
      continue;
    }
    const rowStyleIdValue = row.styleId as number | undefined;
    if (rowStyleIdValue !== undefined) {
      rowStyleIds.add(rowStyleIdValue);
      rowsWithRowStyle.add(rowNumber);
    }
    for (const cell of row.cells) {
      const colNumber = cell.address.col as number;
      if (colNumber < bounds.minCol || colNumber > bounds.maxCol) {
        continue;
      }
      const cellStyleIdValue = cell.styleId as number | undefined;
      if (cellStyleIdValue !== undefined) {
        cellOverrideStyleIds.add(cellStyleIdValue);
      }
    }
  }

  // If any row within the selection lacks row-level style, the effective style can depend on column styles.
  let includesRowsWithoutRowStyle = false;
  for (let rowNumber = bounds.minRow; rowNumber <= bounds.maxRow; rowNumber += 1) {
    if (!rowsWithRowStyle.has(rowNumber)) {
      includesRowsWithoutRowStyle = true;
      break;
    }
  }

  for (const styleIdValue of rowStyleIds) {
    incorporateStyleId(styleIdValue);
  }
  if (includesRowsWithoutRowStyle) {
    for (const styleIdValue of columnBaselineStyleIds) {
      incorporateStyleId(styleIdValue);
    }
  }
  for (const styleIdValue of cellOverrideStyleIds) {
    incorporateStyleId(styleIdValue);
  }

  return {
    bold,
    italic,
    underline,
    strikethrough,
    wrapText,
    tooLarge: false,
  };
}
