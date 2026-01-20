/**
 * @file Spreadsheet autofill (fill handle)
 *
 * Implements a minimal Excel-like autofill for extending a selected range by dragging the fill handle.
 * - Numeric sequences (when the entire base segment is numeric): increments/decrements using last/first step.
 * - Otherwise repeats the base pattern (including formulas, with relative reference shift).
 *
 * Notes:
 * - The baseRange/targetRange are inclusive (CellRange with start/end cells).
 * - This mutation is intentionally sparse: it only creates cells when needed (value/formula/style).
 */

import type { CellAddress, CellRange } from "../../xlsx/domain/cell/address";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import type { Formula } from "../../xlsx/domain/cell/formula";
import type { XlsxRow, XlsxWorksheet } from "../../xlsx/domain/workbook";
import { colIdx, rowIdx, styleId } from "../../xlsx/domain/types";
import { shiftFormulaReferences } from "../../xlsx/formula/shift";

type FillDirection = "up" | "down" | "left" | "right";

type RangeBounds = {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
};

type PatternCell = {
  readonly value: CellValue;
  readonly formula: Formula | undefined;
  readonly effectiveStyleId: number | undefined;
  readonly origin: CellAddress;
};

type PatternSeries =
  | { readonly type: "numeric"; readonly stepForward: number; readonly stepBackward: number; readonly first: number; readonly last: number }
  | { readonly type: "date"; readonly stepForwardDays: number; readonly stepBackwardDays: number; readonly first: Date; readonly last: Date }
  | { readonly type: "repeat" };

const EMPTY_VALUE: CellValue = { type: "empty" };

function getRangeBounds(range: CellRange): RangeBounds {
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

function normalizeRange(range: CellRange): CellRange {
  const bounds = getRangeBounds(range);
  return {
    start: { col: colIdx(bounds.minCol), row: rowIdx(bounds.minRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(bounds.maxCol), row: rowIdx(bounds.maxRow), colAbsolute: false, rowAbsolute: false },
  };
}

function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): number | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId as number | undefined;
    }
  }
  return undefined;
}

function buildRowStyleIdMap(sheet: XlsxWorksheet): ReadonlyMap<number, number | undefined> {
  const map = new Map<number, number | undefined>();
  for (const row of sheet.rows) {
    map.set(row.rowNumber as number, row.styleId as number | undefined);
  }
  return map;
}

function buildCellLookup(sheet: XlsxWorksheet, bounds: RangeBounds): ReadonlyMap<number, ReadonlyMap<number, Cell>> {
  const rowMap = new Map<number, Map<number, Cell>>();
  for (const row of sheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < bounds.minRow || rowNumber > bounds.maxRow) {
      continue;
    }
    const cols = new Map<number, Cell>();
    for (const cell of row.cells) {
      const colNumber = cell.address.col as number;
      if (colNumber < bounds.minCol || colNumber > bounds.maxCol) {
        continue;
      }
      cols.set(colNumber, cell);
    }
    rowMap.set(rowNumber, cols);
  }
  return rowMap;
}

function shouldCreateCell(patch: { readonly value: CellValue; readonly formula: Formula | undefined; readonly styleId: number | undefined }): boolean {
  if (patch.formula) {
    return true;
  }
  if (patch.value.type !== "empty") {
    return true;
  }
  if (patch.styleId !== undefined && patch.styleId !== 0) {
    return true;
  }
  return false;
}

function computeDirection(base: RangeBounds, target: RangeBounds): FillDirection {
  const sameCols = base.minCol === target.minCol && base.maxCol === target.maxCol;
  const sameRows = base.minRow === target.minRow && base.maxRow === target.maxRow;
  if (sameCols && !sameRows) {
    if (target.maxRow > base.maxRow) {
      return "down";
    }
    return "up";
  }
  if (sameRows && !sameCols) {
    if (target.maxCol > base.maxCol) {
      return "right";
    }
    return "left";
  }
  throw new Error("Autofill requires targetRange to extend baseRange in exactly one axis");
}

function positiveMod(n: number, mod: number): number {
  const r = n % mod;
  return r < 0 ? r + mod : r;
}

function getRepeatIndex(index: number, length: number, direction: "forward" | "backward"): number {
  const cycle = positiveMod(index, length);
  if (direction === "forward") {
    return cycle;
  }
  return (length - 1 - cycle + length) % length;
}

function computeNumericSeries(values: readonly PatternCell[]): PatternSeries {
  if (values.length === 0) {
    return { type: "repeat" };
  }
  if (values.some((v) => v.formula)) {
    return { type: "repeat" };
  }
  if (values.every((v) => v.value.type === "number")) {
    const nums = values.map((v) => (v.value as Extract<CellValue, { type: "number" }>).value);
    const stepForward = nums.length >= 2 ? nums[nums.length - 1] - nums[nums.length - 2] : 1;
    const stepBackward = nums.length >= 2 ? nums[1] - nums[0] : 1;
    return { type: "numeric", stepForward, stepBackward, first: nums[0]!, last: nums[nums.length - 1]! };
  }
  if (values.every((v) => v.value.type === "date")) {
    const dates = values.map((v) => (v.value as Extract<CellValue, { type: "date" }>).value);
    const toDays = (d: Date): number => Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
    const stepForwardDays = dates.length >= 2 ? toDays(dates[dates.length - 1]!) - toDays(dates[dates.length - 2]!) : 1;
    const stepBackwardDays = dates.length >= 2 ? toDays(dates[1]!) - toDays(dates[0]!) : 1;
    return { type: "date", stepForwardDays, stepBackwardDays, first: dates[0]!, last: dates[dates.length - 1]! };
  }
  return { type: "repeat" };
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildPatchedCell(params: {
  readonly address: CellAddress;
  readonly base: PatternCell;
  readonly value: CellValue;
  readonly formula: Formula | undefined;
}): Cell {
  const styleIdValue = params.base.effectiveStyleId;
  const baseCell: Cell = {
    address: params.address,
    value: params.value,
    ...(params.formula ? { formula: params.formula } : {}),
    ...(styleIdValue !== undefined && styleIdValue !== 0 ? { styleId: styleId(styleIdValue) } : {}),
  };
  return baseCell;
}

function filterCellsOutsideBounds(cells: readonly Cell[], colBounds: { readonly minCol: number; readonly maxCol: number }): readonly Cell[] {
  return cells.filter((cell) => {
    const colNumber = cell.address.col as number;
    return colNumber < colBounds.minCol || colNumber > colBounds.maxCol;
  });
}

function upsertCellsIntoRow(
  row: XlsxRow | undefined,
  updates: readonly Cell[],
  colBounds: { readonly minCol: number; readonly maxCol: number },
): XlsxRow | undefined {
  if (!row && updates.length === 0) {
    return undefined;
  }

  const keptCells = row ? filterCellsOutsideBounds(row.cells, colBounds) : [];

  if (updates.length === 0) {
    // Only clearing happened.
    if (!row) {
      return undefined;
    }
    if (keptCells.length === row.cells.length) {
      return row;
    }
    return { ...row, cells: keptCells };
  }

  const nextCells = [...keptCells, ...updates].sort((a, b) => (a.address.col as number) - (b.address.col as number));
  if (!row) {
    return { rowNumber: updates[0]!.address.row, cells: nextCells };
  }
  if (nextCells.length === row.cells.length && nextCells.every((c, idx) => c === row.cells[idx])) {
    return row;
  }
  return { ...row, cells: nextCells };
}

function getFillRowCount(direction: FillDirection, baseBounds: RangeBounds, targetBounds: RangeBounds): number {
  if (direction === "down") {
    return targetBounds.maxRow - baseBounds.maxRow;
  }
  if (direction === "up") {
    return baseBounds.minRow - targetBounds.minRow;
  }
  return 0;
}

function getFillColCount(direction: FillDirection, baseBounds: RangeBounds, targetBounds: RangeBounds): number {
  if (direction === "right") {
    return targetBounds.maxCol - baseBounds.maxCol;
  }
  if (direction === "left") {
    return baseBounds.minCol - targetBounds.minCol;
  }
  return 0;
}

export function applyAutofillToWorksheet(params: {
  readonly worksheet: XlsxWorksheet;
  readonly baseRange: CellRange;
  readonly targetRange: CellRange;
}): XlsxWorksheet {
  const baseRange = normalizeRange(params.baseRange);
  const targetRange = normalizeRange(params.targetRange);

  const baseBounds = getRangeBounds(baseRange);
  const targetBounds = getRangeBounds(targetRange);

  const direction = computeDirection(baseBounds, targetBounds);

  const fillRowCount = getFillRowCount(direction, baseBounds, targetBounds);
  const fillColCount = getFillColCount(direction, baseBounds, targetBounds);

  if (fillRowCount <= 0 && fillColCount <= 0) {
    return params.worksheet;
  }

  const worksheet = params.worksheet;
  const rowStyleIds = buildRowStyleIdMap(worksheet);

  const baseCellLookup = buildCellLookup(worksheet, baseBounds);

  const columns = Array.from({ length: baseBounds.maxCol - baseBounds.minCol + 1 }, (_, i) => baseBounds.minCol + i);
  const rows = Array.from({ length: baseBounds.maxRow - baseBounds.minRow + 1 }, (_, i) => baseBounds.minRow + i);

  const patternByCol = new Map<number, readonly PatternCell[]>();
  const seriesByCol = new Map<number, PatternSeries>();

  for (const colNumber of columns) {
    const colStyleId = getColumnStyleId(worksheet, colNumber);
    const pattern: PatternCell[] = rows.map((rowNumber) => {
      const rowStyleId = rowStyleIds.get(rowNumber);
      const cell = baseCellLookup.get(rowNumber)?.get(colNumber);
      const effectiveStyleId = (cell?.styleId as number | undefined) ?? rowStyleId ?? colStyleId;
      const origin: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };
      return {
        value: cell?.value ?? EMPTY_VALUE,
        formula: cell?.formula,
        effectiveStyleId,
        origin,
      };
    });
    patternByCol.set(colNumber, pattern);
    seriesByCol.set(colNumber, computeNumericSeries(pattern));
  }

  const buildVerticalUpdatesForRow = (rowNumber: number, stepIndex: number): readonly Cell[] => {
    const directionKind = direction === "up" ? "backward" : "forward";
    return columns
      .map((colNumber): Cell | undefined => {
        const pattern = patternByCol.get(colNumber);
        if (!pattern) {
          return undefined;
        }
        const baseIndex = getRepeatIndex(stepIndex, pattern.length, directionKind);
        const base = pattern[baseIndex]!;

        const series = seriesByCol.get(colNumber) ?? { type: "repeat" as const };
        const address: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };

        if (series.type === "numeric") {
          const styleBase = direction === "down" ? pattern[pattern.length - 1]! : pattern[0]!;
          const stepAmount = stepIndex + 1;
          const value = direction === "down"
            ? series.last + series.stepForward * stepAmount
            : series.first - series.stepBackward * stepAmount;
          const patch = { value: { type: "number", value } as const, formula: undefined, styleId: styleBase.effectiveStyleId };
          return shouldCreateCell(patch)
            ? buildPatchedCell({ address, base: styleBase, value: patch.value, formula: undefined })
            : undefined;
        }

        if (series.type === "date") {
          const styleBase = direction === "down" ? pattern[pattern.length - 1]! : pattern[0]!;
          const stepAmount = stepIndex + 1;
          const value = direction === "down"
            ? addDays(series.last, series.stepForwardDays * stepAmount)
            : addDays(series.first, -series.stepBackwardDays * stepAmount);
          const patch = { value: { type: "date", value } as const, formula: undefined, styleId: styleBase.effectiveStyleId };
          return shouldCreateCell(patch)
            ? buildPatchedCell({ address, base: styleBase, value: patch.value, formula: undefined })
            : undefined;
        }

        if (base.formula) {
          const deltaRows = (address.row as number) - (base.origin.row as number);
          const deltaCols = (address.col as number) - (base.origin.col as number);
          const shifted = shiftFormulaReferences(base.formula.expression, deltaCols, deltaRows);
          const formula: Formula = { ...base.formula, expression: shifted };
          const patch = { value: EMPTY_VALUE, formula, styleId: base.effectiveStyleId };
          return shouldCreateCell(patch)
            ? buildPatchedCell({ address, base, value: EMPTY_VALUE, formula })
            : undefined;
        }

        const patch = { value: base.value, formula: undefined, styleId: base.effectiveStyleId };
        return shouldCreateCell(patch) ? buildPatchedCell({ address, base, value: base.value, formula: undefined }) : undefined;
      })
      .filter((cell): cell is Cell => cell !== undefined);
  };

  if (direction === "down" || direction === "up") {
    const startRow = direction === "down" ? baseBounds.maxRow + 1 : baseBounds.minRow - 1;
    const step = direction === "down" ? 1 : -1;
    const count = fillRowCount;

    const updatesByRow = new Map<number, readonly Cell[]>();
    for (let i = 0; i < count; i += 1) {
      const rowNumber = startRow + step * i;
      updatesByRow.set(rowNumber, buildVerticalUpdatesForRow(rowNumber, i));
    }

    const nextRows: XlsxRow[] = [];
    const seenUpdatedRows = new Set<number>();

    for (const row of worksheet.rows) {
      const rowNumber = row.rowNumber as number;
      const updates = updatesByRow.get(rowNumber) ?? [];
      const shouldClear = updatesByRow.has(rowNumber);
      if (!shouldClear) {
        nextRows.push(row);
        continue;
      }
      const updatedRow = upsertCellsIntoRow(row, updates, { minCol: baseBounds.minCol, maxCol: baseBounds.maxCol });
      if (updatedRow) {
        nextRows.push(updatedRow);
      }
      seenUpdatedRows.add(rowNumber);
    }

    for (const [rowNumber, updates] of updatesByRow.entries()) {
      if (seenUpdatedRows.has(rowNumber)) {
        continue;
      }
      const created = upsertCellsIntoRow(undefined, updates, { minCol: baseBounds.minCol, maxCol: baseBounds.maxCol });
      if (created) {
        nextRows.push(created);
      }
    }

    nextRows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
    return { ...worksheet, rows: nextRows };
  }

  // Horizontal fill (left/right): update rows within base bounds.
  const directionKind = direction === "left" ? "backward" : "forward";
  const baseWidth = columns.length;
  const updatesByRow = new Map<number, readonly Cell[]>();

  const seriesByRow = new Map<number, PatternSeries>();
  for (const rowNumber of rows) {
    const rowIndex = rowNumber - baseBounds.minRow;
    const rowPattern = columns
      .map((colNumber) => patternByCol.get(colNumber)?.[rowIndex])
      .filter((cell): cell is PatternCell => cell !== undefined);
    seriesByRow.set(rowNumber, computeNumericSeries(rowPattern));
  }

  for (const rowNumber of rows) {
    const rowUpdates: Cell[] = [];
    const rowSeries = seriesByRow.get(rowNumber) ?? { type: "repeat" as const };
    const styleBaseForSeries = (() => {
      const rowIndex = rowNumber - baseBounds.minRow;
      const first = patternByCol.get(columns[0]!)?.[rowIndex];
      const last = patternByCol.get(columns[columns.length - 1]!)?.[rowIndex];
      return direction === "right" ? last : first;
    })();
    for (let i = 0; i < fillColCount; i += 1) {
      const colNumber = direction === "right" ? baseBounds.maxCol + 1 + i : baseBounds.minCol - 1 - i;
      const cycleIndex = getRepeatIndex(i, baseWidth, directionKind);
      const baseColNumber = columns[cycleIndex]!;

      const colPattern = patternByCol.get(baseColNumber);
      if (!colPattern) {
        continue;
      }

      const baseRowIndex = rowNumber - baseBounds.minRow;
      const base = colPattern[baseRowIndex]!;

      const address: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };

      if (rowSeries.type === "numeric" && styleBaseForSeries) {
        const stepAmount = i + 1;
        const value = direction === "right"
          ? rowSeries.last + rowSeries.stepForward * stepAmount
          : rowSeries.first - rowSeries.stepBackward * stepAmount;
        const patch = { value: { type: "number", value } as const, formula: undefined, styleId: styleBaseForSeries.effectiveStyleId };
        if (shouldCreateCell(patch)) {
          rowUpdates.push(buildPatchedCell({ address, base: styleBaseForSeries, value: patch.value, formula: undefined }));
        }
        continue;
      }

      if (rowSeries.type === "date" && styleBaseForSeries) {
        const stepAmount = i + 1;
        const value = direction === "right"
          ? addDays(rowSeries.last, rowSeries.stepForwardDays * stepAmount)
          : addDays(rowSeries.first, -rowSeries.stepBackwardDays * stepAmount);
        const patch = { value: { type: "date", value } as const, formula: undefined, styleId: styleBaseForSeries.effectiveStyleId };
        if (shouldCreateCell(patch)) {
          rowUpdates.push(buildPatchedCell({ address, base: styleBaseForSeries, value: patch.value, formula: undefined }));
        }
        continue;
      }

      if (base.formula) {
        const deltaRows = (address.row as number) - (base.origin.row as number);
        const deltaCols = (address.col as number) - (base.origin.col as number);
        const shifted = shiftFormulaReferences(base.formula.expression, deltaCols, deltaRows);
        const formula: Formula = { ...base.formula, expression: shifted };
        const patch = { value: EMPTY_VALUE, formula, styleId: base.effectiveStyleId };
        if (shouldCreateCell(patch)) {
          rowUpdates.push(buildPatchedCell({ address, base, value: EMPTY_VALUE, formula }));
        }
        continue;
      }

      const patch = { value: base.value, formula: undefined, styleId: base.effectiveStyleId };
      if (shouldCreateCell(patch)) {
        rowUpdates.push(buildPatchedCell({ address, base, value: base.value, formula: undefined }));
      }
    }
    updatesByRow.set(rowNumber, rowUpdates);
  }

  const clearBounds = (() => {
    if (direction === "right") {
      return { minCol: baseBounds.maxCol + 1, maxCol: targetBounds.maxCol };
    }
    return { minCol: targetBounds.minCol, maxCol: baseBounds.minCol - 1 };
  })();

  const nextRows: XlsxRow[] = [];
  const seenUpdatedRows = new Set<number>();

  for (const row of worksheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < baseBounds.minRow || rowNumber > baseBounds.maxRow) {
      nextRows.push(row);
      continue;
    }

    const updates = updatesByRow.get(rowNumber) ?? [];
    const updatedRow = upsertCellsIntoRow(row, updates, clearBounds);
    if (updatedRow) {
      nextRows.push(updatedRow);
    }
    seenUpdatedRows.add(rowNumber);
  }

  for (const [rowNumber, updates] of updatesByRow.entries()) {
    if (seenUpdatedRows.has(rowNumber)) {
      continue;
    }
    const created = upsertCellsIntoRow(undefined, updates, clearBounds);
    if (created) {
      nextRows.push(created);
    }
  }

  nextRows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
  return { ...worksheet, rows: nextRows };
}
