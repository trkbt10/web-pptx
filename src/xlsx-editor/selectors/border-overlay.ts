/**
 * @file Border overlay (SpreadsheetML)
 *
 * Computes SVG line segments for ECMA-376 styles.xml borders in the current viewport.
 * Designed to avoid per-cell DOM borders and to support more complex border rendering over time.
 */

import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import { colIdx, rowIdx } from "../../xlsx/domain/types";
import { getCell } from "../cell/query";
import { resolveCellBorderDecoration, type CellBorderEdgeDecoration } from "./cell-render-style";
import { createSheetLayout } from "./sheet-layout";

export type SvgBorderLine = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
  readonly key: string;
};

function dasharrayForBorderStyle(style: "solid" | "dashed" | "dotted" | "double"): string | undefined {
  switch (style) {
    case "solid":
      return undefined;
    case "dashed":
      return "4 2";
    case "dotted":
      return "1 2";
    case "double":
      return undefined;
  }
}

function edgeScore(edge: CellBorderEdgeDecoration): number {
  const styleScore = (() => {
    switch (edge.style) {
      case "double":
        return 4;
      case "solid":
        return 3;
      case "dashed":
        return 2;
      case "dotted":
        return 1;
    }
  })();
  return edge.width * 10 + styleScore;
}

function pickEdge(
  a: CellBorderEdgeDecoration | undefined,
  b: CellBorderEdgeDecoration | undefined,
  preferBOnTie: boolean,
): CellBorderEdgeDecoration | undefined {
  if (!a) return b;
  if (!b) return a;
  const sa = edgeScore(a);
  const sb = edgeScore(b);
  if (sa > sb) return a;
  if (sb > sa) return b;
  return preferBOnTie ? b : a;
}

function sameEdge(a: CellBorderEdgeDecoration, b: CellBorderEdgeDecoration): boolean {
  return a.width === b.width && a.style === b.style && a.color === b.color;
}

function emitLine(
  lines: SvgBorderLine[],
  baseKey: string,
  edge: CellBorderEdgeDecoration,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const dash = dasharrayForBorderStyle(edge.style);

  if (edge.style === "double") {
    if (x1 === x2) {
      lines.push(
        { key: `${baseKey}-d1`, x1: x1 - 1, y1, x2: x2 - 1, y2, strokeWidth: 1, stroke: edge.color, strokeDasharray: dash },
        { key: `${baseKey}-d2`, x1: x1 + 1, y1, x2: x2 + 1, y2, strokeWidth: 1, stroke: edge.color, strokeDasharray: dash },
      );
    } else {
      lines.push(
        { key: `${baseKey}-d1`, x1, y1: y1 - 1, x2, y2: y2 - 1, strokeWidth: 1, stroke: edge.color, strokeDasharray: dash },
        { key: `${baseKey}-d2`, x1, y1: y1 + 1, x2, y2: y2 + 1, strokeWidth: 1, stroke: edge.color, strokeDasharray: dash },
      );
    }
    return;
  }

  lines.push({
    key: baseKey,
    x1,
    y1,
    x2,
    y2,
    strokeWidth: edge.width,
    stroke: edge.color,
    ...(dash ? { strokeDasharray: dash } : {}),
  });
}

export function buildBorderOverlayLines(params: {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly rowCount: number;
  readonly colCount: number;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly defaultBorderColor: string;
}): readonly SvgBorderLine[] {
  const { sheet, styles, layout, rowRange, colRange, rowCount, colCount, scrollTop, scrollLeft, defaultBorderColor } = params;

  const edgeCache = new Map<string, ReturnType<typeof resolveCellBorderDecoration> | null>();

  const getCellEdges = (col0: number, row0: number): ReturnType<typeof resolveCellBorderDecoration> | undefined => {
    const key = `${col0}:${row0}`;
    if (edgeCache.has(key)) {
      return edgeCache.get(key) ?? undefined;
    }

    const address = { col: colIdx(col0 + 1), row: rowIdx(row0 + 1), colAbsolute: false, rowAbsolute: false };
    const cell = getCell(sheet, address);
    const resolved = resolveCellBorderDecoration({ styles, sheet, address, cell, defaultBorderColor });
    edgeCache.set(key, resolved ?? null);
    return resolved;
  };

  const lines: SvgBorderLine[] = [];

  // Vertical boundaries (between columns)
  for (let boundaryCol0 = colRange.start; boundaryCol0 <= colRange.end + 1; boundaryCol0 += 1) {
    const x = layout.cols.getBoundaryOffsetPx(boundaryCol0) - scrollLeft;
    let active:
      | { readonly startY: number; endY: number; readonly edge: CellBorderEdgeDecoration }
      | undefined;

    for (let row0 = rowRange.start; row0 <= rowRange.end; row0 += 1) {
      const y1 = layout.rows.getBoundaryOffsetPx(row0) - scrollTop;
      const y2 = layout.rows.getBoundaryOffsetPx(row0 + 1) - scrollTop;

      const leftCell = boundaryCol0 > 0 ? getCellEdges(boundaryCol0 - 1, row0) : undefined;
      const rightCell = boundaryCol0 < colCount ? getCellEdges(boundaryCol0, row0) : undefined;
      const chosen = pickEdge(leftCell?.right, rightCell?.left, true);

      if (!chosen) {
        if (active) {
          emitLine(lines, `vb-${boundaryCol0}-${row0}-seg`, active.edge, x, active.startY, x, active.endY);
          active = undefined;
        }
        continue;
      }

      if (active && sameEdge(active.edge, chosen) && Math.abs(active.endY - y1) < 0.001) {
        active.endY = y2;
      } else {
        if (active) {
          emitLine(lines, `vb-${boundaryCol0}-${row0}-seg`, active.edge, x, active.startY, x, active.endY);
        }
        active = { edge: chosen, startY: y1, endY: y2 };
      }
    }

    if (active) {
      emitLine(lines, `vb-${boundaryCol0}-end`, active.edge, x, active.startY, x, active.endY);
    }
  }

  // Horizontal boundaries (between rows)
  for (let boundaryRow0 = rowRange.start; boundaryRow0 <= rowRange.end + 1; boundaryRow0 += 1) {
    const y = layout.rows.getBoundaryOffsetPx(boundaryRow0) - scrollTop;
    let active:
      | { readonly startX: number; endX: number; readonly edge: CellBorderEdgeDecoration }
      | undefined;

    for (let col0 = colRange.start; col0 <= colRange.end; col0 += 1) {
      const x1 = layout.cols.getBoundaryOffsetPx(col0) - scrollLeft;
      const x2 = layout.cols.getBoundaryOffsetPx(col0 + 1) - scrollLeft;

      const topCell = boundaryRow0 > 0 ? getCellEdges(col0, boundaryRow0 - 1) : undefined;
      const bottomCell = boundaryRow0 < rowCount ? getCellEdges(col0, boundaryRow0) : undefined;
      const chosen = pickEdge(topCell?.bottom, bottomCell?.top, true);

      if (!chosen) {
        if (active) {
          emitLine(lines, `hb-${boundaryRow0}-${col0}-seg`, active.edge, active.startX, y, active.endX, y);
          active = undefined;
        }
        continue;
      }

      if (active && sameEdge(active.edge, chosen) && Math.abs(active.endX - x1) < 0.001) {
        active.endX = x2;
      } else {
        if (active) {
          emitLine(lines, `hb-${boundaryRow0}-${col0}-seg`, active.edge, active.startX, y, active.endX, y);
        }
        active = { edge: chosen, startX: x1, endX: x2 };
      }
    }

    if (active) {
      emitLine(lines, `hb-${boundaryRow0}-end`, active.edge, active.startX, y, active.endX, y);
    }
  }

  return lines;
}
