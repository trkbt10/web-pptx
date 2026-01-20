import { colIdx, rowIdx } from "../domain/types";
import type { Cell, CellValue } from "../domain/cell/types";
import type { XlsxRow, XlsxWorksheet, XlsxWorkbook } from "../domain/workbook";
import { createDefaultStyleSheet } from "../domain/style/types";
import { createFormulaEvaluator } from "./evaluator";

function numberCell(col: number, row: number, value: number): Cell {
  const cellValue: CellValue = { type: "number", value };
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    value: cellValue,
  };
}

function formulaCell(col: number, row: number, formula: string): Cell {
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    value: { type: "empty" },
    formula,
  };
}

function makeWorksheet(name: string, sheetId: number, cells: readonly Cell[]): XlsxWorksheet {
  const rowsByNumber = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const current = rowsByNumber.get(rowNumber) ?? [];
    current.push(cell);
    rowsByNumber.set(rowNumber, current);
  }

  const rows: XlsxRow[] = [...rowsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: rowCells.sort((a, b) => (a.address.col as number) - (b.address.col as number)),
    }));

  return {
    name,
    sheetId,
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

function makeWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return {
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

describe("createFormulaEvaluator", () => {
  it("evaluates simple arithmetic and references", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 1), // A1
      numberCell(1, 2, 2), // A2
      formulaCell(2, 1, "A1+A2"), // B1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(3);
  });

  it("evaluates ranges via SUM", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 1), // A1
      numberCell(1, 2, 2), // A2
      formulaCell(3, 1, "SUM(A1:A2)"), // C1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(3);
  });

  it("evaluates cross-sheet references (case-insensitive)", () => {
    const sheet1 = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "other!A1+1")]);
    const other = makeWorksheet("Other", 2, [numberCell(1, 1, 41)]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet1, other]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(42);
  });

  it("evaluates IF and comparisons", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 2), // A1
      formulaCell(2, 1, "IF(A1>1,10,20)"), // B1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(10);
  });

  it("returns #REF! for unknown sheet names", () => {
    const sheet = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "NoSuchSheet!A1")]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toEqual({
      type: "error",
      value: "#REF!",
    });
  });

  it("returns #REF! for circular references", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      formulaCell(1, 1, "B1"),
      formulaCell(2, 1, "A1"),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toEqual({
      type: "error",
      value: "#REF!",
    });
  });
});

