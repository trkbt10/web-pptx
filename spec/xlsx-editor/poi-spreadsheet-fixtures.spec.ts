/**
 * @file Spreadsheet fixtures (POI) integration checks
 *
 * Uses `fixtures/poi-test-data/test-data/spreadsheet/*.xlsx` as regression inputs and verifies:
 * - Workbook parsing (OOXML)
 * - Formula evaluation (supported subset) and shared formula expansion
 * - Style resolution (font/fill/border/alignment) as used by the xlsx-editor UI selectors
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseXlsxWorkbook } from "../../src/xlsx/parser";
import { createFormulaEvaluator } from "../../src/xlsx/formula/evaluator";
import { colIdx, rowIdx } from "../../src/xlsx/domain/types";
import type { CellAddress } from "../../src/xlsx/domain/cell/address";
import type { CellValue } from "../../src/xlsx/domain/cell/types";
import { getCell } from "../../src/xlsx-editor/cell/query";
import { resolveCellRenderStyle } from "../../src/xlsx-editor/selectors/cell-render-style";
import { resolveCellStyleDetails } from "../../src/xlsx-editor/selectors/cell-style-details";
import { formatCellValueForDisplay, resolveCellFormatCode } from "../../src/xlsx-editor/selectors/cell-display-text";
import { createSheetLayout } from "../../src/xlsx-editor/selectors/sheet-layout";
import { buildBorderOverlayLines } from "../../src/xlsx-editor/selectors/border-overlay";
import { createGetZipTextFileContentFromBytes } from "../../src/files/ooxml-zip";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "fixtures/poi-test-data/test-data/spreadsheet", name);
}

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

async function parseWorkbookFromFixture(name: string) {
  const bytes = await readFile(fixturePath(name));
  const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
  return parseXlsxWorkbook(getFileContent);
}

function toExpectedScalar(value: CellValue): ReturnType<ReturnType<typeof createFormulaEvaluator>["evaluateCell"]> {
  switch (value.type) {
    case "empty":
      return null;
    case "string":
      return value.value;
    case "number":
      return value.value;
    case "boolean":
      return value.value;
    case "error":
      return { type: "error", value: value.value };
    case "date":
      return value.value.toISOString();
  }
}

describe("POI spreadsheet fixtures (parsing + formulas + style)", () => {
  it("formula-eval.xlsx: evaluates SUM and matches cached value", async () => {
    const workbook = await parseWorkbookFromFixture("formula-eval.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const address = createAddress(4, 1); // D1
    const cell = getCell(sheet, address);
    if (!cell?.formula) {
      throw new Error("D1 must be a formula cell");
    }

    expect(cell.formula.expression).toBe("SUM(A1:C1)");
    expect(evaluator.evaluateCell(0, address)).toBe(6.75);
    expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
  });

  it("shared_formulas.xlsx: expands shared formulas and can evaluate shifted references", async () => {
    const workbook = await parseWorkbookFromFixture("shared_formulas.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const addresses: readonly CellAddress[] = [
      createAddress(1, 2), // A2 (base)
      createAddress(1, 3), // A3 (shifted)
      createAddress(1, 41), // A41 (shifted)
    ];

    for (const address of addresses) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected shared formula cell to exist");
      }
      if (cell.formula.type !== "shared") {
        throw new Error("Expected shared formula type");
      }
      expect(cell.formula.expression.trim().length).toBeGreaterThan(0);
      expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("50784-font_theme_colours.xlsx: resolves theme vs rgb font colors", async () => {
    const workbook = await parseWorkbookFromFixture("50784-font_theme_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const themed = createAddress(1, 1); // A1
    const rgb = createAddress(2, 1); // B1

    const themedCss = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: themed, cell: getCell(sheet, themed) });
    const rgbCss = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: rgb, cell: getCell(sheet, rgb) });

    expect(themedCss.color).toBe("#B97135");
    expect(rgbCss.color).toBe("#FF0000");
    expect(typeof themedCss.fontFamily).toBe("string");
    expect(typeof themedCss.fontSize).toBe("string");
  });

  it("50786-indexed_colours.xlsx: resolves indexed fill + center alignment", async () => {
    const workbook = await parseWorkbookFromFixture("50786-indexed_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const address = createAddress(2, 3); // B3
    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell: getCell(sheet, address) });

    expect(css.backgroundColor).toBe("#CCFFCC");
    expect(css.justifyContent).toBe("center");
    expect(css.alignItems).toBe("center");
    expect(css.whiteSpace).toBe("normal");
  });

  it("50846-border_colours.xlsx: border overlay lines use resolved colors", async () => {
    const workbook = await parseWorkbookFromFixture("50846-border_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const layout = createSheetLayout(sheet, {
      rowCount: 50,
      colCount: 20,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 72,
    });

    const lines = buildBorderOverlayLines({
      sheet,
      styles: workbook.styles,
      layout,
      rowRange: { start: 0, end: 5 },
      colRange: { start: 0, end: 5 },
      rowCount: 50,
      colCount: 20,
      scrollTop: 0,
      scrollLeft: 0,
      defaultBorderColor: "#000000",
    });

    const colors = new Set(lines.map((line) => line.stroke));
    expect(lines.length).toBeGreaterThan(0);
    expect(colors.has("#903C3A")).toBe(true);
    expect(colors.has("#FF0000")).toBe(true);
  });

  it("decimal-format.xlsx: resolves number format code and formats display text", async () => {
    const workbook = await parseWorkbookFromFixture("decimal-format.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1);
    const a2 = createAddress(1, 2);

    const a1Cell = getCell(sheet, a1);
    const a2Cell = getCell(sheet, a2);
    if (!a1Cell || !a2Cell) {
      throw new Error("A1 and A2 must exist");
    }

    const a1Details = resolveCellStyleDetails({ styles: workbook.styles, sheet, address: a1, cell: a1Cell });
    const a2Details = resolveCellStyleDetails({ styles: workbook.styles, sheet, address: a2, cell: a2Cell });
    expect(a1Details.formatCode).toBe("0.00_ ");
    expect(a2Details.formatCode).toBe("0.00_ ");

    const a1FormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: a1, cell: a1Cell });
    const a2FormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: a2, cell: a2Cell });
    expect(a1FormatCode).toBe("0.00_ ");
    expect(a2FormatCode).toBe("0.00_ ");

    expect(formatCellValueForDisplay(a1Cell.value, a1FormatCode)).toBe("1.01");
    expect(formatCellValueForDisplay(a2Cell.value, a2FormatCode)).toBe("1.00");
  });

  it("NewlineInFormulas.xlsx: evaluates formulas containing newlines and matches cached value", async () => {
    const workbook = await parseWorkbookFromFixture("NewlineInFormulas.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const address = createAddress(1, 1); // A1
    const cell = getCell(sheet, address);
    if (!cell?.formula) {
      throw new Error("A1 must be a formula cell");
    }

    expect(cell.formula.expression).toBe("SUM(\r\n1,2\r\n)");
    expect(evaluator.evaluateCell(0, address)).toBe(3);
    expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
  });

  it("VLookupFullColumn.xlsx: evaluates VLOOKUP over full-column ranges and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("VLookupFullColumn.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const b4 = createAddress(2, 4); // B4
    const b5 = createAddress(2, 5); // B5

    const b4Cell = getCell(sheet, b4);
    const b5Cell = getCell(sheet, b5);
    if (!b4Cell?.formula || !b5Cell?.formula) {
      throw new Error("B4 and B5 must be formula cells");
    }

    expect(b4Cell.formula.expression).toBe("VLOOKUP(A4,$D:$E,2,0)");
    expect(evaluator.evaluateCell(0, b4)).toBe("Value1");
    expect(evaluator.evaluateCell(0, b4)).toEqual(toExpectedScalar(b4Cell.value));

    expect(b5Cell.formula.expression).toBe("VLOOKUP(A5,$D:$E,2,0)");
    expect(evaluator.evaluateCell(0, b5)).toEqual(toExpectedScalar(b5Cell.value));
  });
});
