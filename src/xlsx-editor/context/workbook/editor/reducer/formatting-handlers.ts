/**
 * @file Formatting mutation handlers
 *
 * Handlers for formatting operations like applying styles and merge/unmerge.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";
import { applyStyleToRange } from "../../../../cell/style-mutation";
import { mergeCells, unmergeCells } from "../../../../sheet/merge-mutation";
import { getCell } from "../../../../cell/query";
import { resolveCellStyleDetails } from "../../../../selectors/cell-style-details";
import type { XlsxCellXf } from "../../../../../xlsx/domain/style/types";
import {
  upsertBorder,
  upsertCellXf,
  upsertCustomNumberFormat,
  upsertFill,
  upsertFont,
  useBuiltinNumberFormat,
} from "../../../../../xlsx/domain/style/mutation";
import type { StyleId } from "../../../../../xlsx/domain/types";

type ApplyStyleAction = Extract<XlsxEditorAction, { type: "APPLY_STYLE" }>;
type SetSelectionFormatAction = Extract<XlsxEditorAction, { type: "SET_SELECTION_FORMAT" }>;
type MergeCellsAction = Extract<XlsxEditorAction, { type: "MERGE_CELLS" }>;
type UnmergeCellsAction = Extract<XlsxEditorAction, { type: "UNMERGE_CELLS" }>;

function handleApplyStyle(
  state: XlsxEditorState,
  action: ApplyStyleAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, action.styleId),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleSetSelectionFormat(
  state: XlsxEditorState,
  action: SetSelectionFormatAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const currentWorkbook = state.workbookHistory.present;
  const sheet = currentWorkbook.sheets[sheetIndex];
  if (!sheet) {
    return state;
  }

  const anchorCell = state.cellSelection.activeCell ?? action.range.start;
  const anchorCellData = getCell(sheet, anchorCell);
  const base = resolveCellStyleDetails({
    styles: currentWorkbook.styles,
    sheet,
    address: anchorCell,
    cell: anchorCellData,
  });

  const baseXf = base.xf;
  const nextFont = action.format.font ?? base.font;
  const nextFill = action.format.fill ?? base.fill;
  const nextBorder = action.format.border ?? base.border;
  const nextAlignment = (() => {
    if (action.format.alignment === undefined) {
      return baseXf.alignment;
    }
    if (action.format.alignment === null) {
      return undefined;
    }
    return action.format.alignment;
  })();

  let styles = currentWorkbook.styles;
  const fontResult = upsertFont(styles, nextFont);
  styles = fontResult.styles;
  const fillResult = upsertFill(styles, nextFill);
  styles = fillResult.styles;
  const borderResult = upsertBorder(styles, nextBorder);
  styles = borderResult.styles;

  const numFmtResult = (() => {
    if (!action.format.numberFormat) {
      return { styles, numFmtId: baseXf.numFmtId };
    }
    if (action.format.numberFormat.type === "builtin") {
      return useBuiltinNumberFormat(styles, action.format.numberFormat.numFmtId);
    }
    const formatCode = action.format.numberFormat.formatCode.trim();
    if (formatCode.length === 0) {
      throw new Error("Custom number format code must not be empty");
    }
    return upsertCustomNumberFormat(styles, formatCode);
  })();
  styles = numFmtResult.styles;

  const xf: XlsxCellXf = {
    numFmtId: numFmtResult.numFmtId,
    fontId: fontResult.fontId,
    fillId: fillResult.fillId,
    borderId: borderResult.borderId,
    alignment: nextAlignment,
  };

  const xfResult = upsertCellXf(styles, xf);
  styles = xfResult.styles;
  const nextStyleId: StyleId = xfResult.styleId;

  const workbookWithSheetUpdated = updateWorksheetInWorkbook(
    currentWorkbook,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, nextStyleId),
  );

  const updatedWorkbook = workbookWithSheetUpdated.styles === styles ? workbookWithSheetUpdated : { ...workbookWithSheetUpdated, styles };

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

export const formattingHandlers: HandlerMap = {
  APPLY_STYLE: handleApplyStyle,
  SET_SELECTION_FORMAT: handleSetSelectionFormat,
  MERGE_CELLS: (state: XlsxEditorState, action: MergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => mergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
  UNMERGE_CELLS: (state: XlsxEditorState, action: UnmergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => unmergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
};
