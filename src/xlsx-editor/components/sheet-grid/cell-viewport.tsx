import { useCallback, useMemo, type CSSProperties } from "react";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { XlsxStyleSheet } from "../../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { colorTokens } from "../../../office-editor-components";
import { XlsxCellEditorOverlay } from "../cell-input/XlsxCellEditorOverlay";
import type { ParseCellUserInputResult } from "../cell-input/parse-cell-user-input";
import { buildBorderOverlayLines } from "../../selectors/border-overlay";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { getVisibleGridLineSegments } from "./gridline-geometry";
import { clipRectToViewport, getActiveCellRect, getSelectedRangeRect } from "./selection-geometry";
import { createSheetLayout } from "../../selectors/sheet-layout";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";

const selectionOutlineStyle: CSSProperties = {
  position: "absolute",
  border: `2px solid var(--accent, ${colorTokens.accent.primary})`,
  pointerEvents: "none",
  boxSizing: "border-box",
};

const selectionFillStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 18%, transparent)`,
  pointerEvents: "none",
};

export type XlsxSheetGridCellViewportProps = {
  readonly sheet: XlsxWorksheet;
  readonly workbookStyles: XlsxStyleSheet;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
    readonly rowHeaderWidthPx: number;
    readonly colHeaderHeightPx: number;
  };
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly selection: {
    readonly selectedRange: { readonly start: CellAddress; readonly end: CellAddress } | undefined;
    readonly activeCell: CellAddress | undefined;
  };
  readonly state: {
    readonly editingCell: CellAddress | undefined;
  };
  readonly activeSheetIndex: number | undefined;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly children: React.ReactNode;
};

export function XlsxSheetGridCellViewport({
  sheet,
  workbookStyles,
  layout,
  metrics,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  selection,
  state,
  activeSheetIndex,
  normalizedMerges,
  dispatch,
  children,
}: XlsxSheetGridCellViewportProps) {
  const rowHeaderWidthPx = metrics.rowHeaderWidthPx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx;

  const gridViewportWidth = Math.max(0, viewportWidth - rowHeaderWidthPx);
  const gridViewportHeight = Math.max(0, viewportHeight - colHeaderHeightPx);

  const selectedRangeRect = useMemo(() => {
    const rect = getSelectedRangeRect(selection.selectedRange, layout, scrollTop, scrollLeft);
    return clipRectToViewport(rect, gridViewportWidth, gridViewportHeight);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.selectedRange]);

  const gridLineSegments = useMemo(() => {
    if (sheet.sheetView?.showGridLines === false) {
      return { vertical: [], horizontal: [] } as const;
    }
    return getVisibleGridLineSegments({
      rowRange,
      colRange,
      layout,
      scrollTop,
      scrollLeft,
      viewportWidth: gridViewportWidth,
      viewportHeight: gridViewportHeight,
      normalizedMerges,
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
    });
  }, [
    colRange,
    gridViewportHeight,
    gridViewportWidth,
    layout,
    metrics.colCount,
    metrics.rowCount,
    normalizedMerges,
    rowRange,
    scrollLeft,
    scrollTop,
    sheet.sheetView?.showGridLines,
  ]);

  const borderLines = useMemo(() => {
    return buildBorderOverlayLines({
      sheet,
      styles: workbookStyles,
      layout,
      rowRange,
      colRange,
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
      scrollTop,
      scrollLeft,
      defaultBorderColor: `var(--border-primary, ${colorTokens.border.primary})`,
    });
  }, [colRange, layout, metrics.colCount, metrics.rowCount, rowRange, scrollLeft, scrollTop, sheet, workbookStyles]);

  const editingCell = state.editingCell;
  const editingRect = useMemo(() => {
    if (!editingCell) {
      return null;
    }
    const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, editingCell) : undefined;
    if (merge && (editingCell.col as number) === merge.minCol && (editingCell.row as number) === merge.minRow) {
      const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
      const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
      const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
      const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
      const width = Math.max(0, rightPx - leftPx);
      const height = Math.max(0, bottomPx - topPx);
      if (width === 0 || height === 0) {
        return null;
      }
      return {
        left: leftPx - scrollLeft,
        top: topPx - scrollTop,
        width,
        height,
      };
    }
    return getActiveCellRect(editingCell, layout, scrollTop, scrollLeft);
  }, [editingCell, layout, normalizedMerges, scrollLeft, scrollTop]);

  const handleCommitEdit = useCallback(
    (result: ParseCellUserInputResult): void => {
      if (activeSheetIndex === undefined) {
        throw new Error("activeSheetIndex is required to commit cell edit");
      }
      if (!editingCell) {
        throw new Error("editingCell is required to commit cell edit");
      }
      if (result.type === "formula") {
        dispatch({ type: "SET_CELL_FORMULA", address: editingCell, formula: result.formula });
        dispatch({ type: "EXIT_CELL_EDIT" });
        return;
      }
      dispatch({ type: "COMMIT_CELL_EDIT", value: result.value });
    },
    [activeSheetIndex, dispatch, editingCell],
  );

  return (
    <div
      style={{
        position: "absolute",
        left: rowHeaderWidthPx,
        top: colHeaderHeightPx,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
      }}
    >
      {sheet.sheetView?.showGridLines !== false && gridViewportWidth > 0 && gridViewportHeight > 0 && (
        <svg
          data-testid="xlsx-gridlines"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={gridViewportWidth}
          height={gridViewportHeight}
          viewBox={`0 0 ${gridViewportWidth} ${gridViewportHeight}`}
        >
          {gridLineSegments.vertical.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`var(--border-primary, ${colorTokens.border.primary})`}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ))}
          {gridLineSegments.horizontal.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`var(--border-primary, ${colorTokens.border.primary})`}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ))}
        </svg>
      )}

      {children}

      {borderLines.length > 0 && gridViewportWidth > 0 && gridViewportHeight > 0 && (
        <svg
          data-testid="xlsx-borders"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={gridViewportWidth}
          height={gridViewportHeight}
          viewBox={`0 0 ${gridViewportWidth} ${gridViewportHeight}`}
        >
          {borderLines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              strokeDasharray={line.strokeDasharray}
              shapeRendering="crispEdges"
              strokeLinecap="square"
            />
          ))}
        </svg>
      )}

      {selectedRangeRect && (
        <div
          style={{
            ...selectionFillStyle,
            left: selectedRangeRect.left,
            top: selectedRangeRect.top,
            width: selectedRangeRect.width,
            height: selectedRangeRect.height,
          }}
        />
      )}
      {selectedRangeRect && (
        <div
          style={{
            ...selectionOutlineStyle,
            left: selectedRangeRect.left,
            top: selectedRangeRect.top,
            width: selectedRangeRect.width,
            height: selectedRangeRect.height,
          }}
        />
      )}

      {editingCell && editingRect && (
        <XlsxCellEditorOverlay
          sheet={sheet}
          address={editingCell}
          rect={editingRect}
          onCommitValue={handleCommitEdit}
          onCancel={() => dispatch({ type: "EXIT_CELL_EDIT" })}
        />
      )}
    </div>
  );
}
