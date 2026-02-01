/**
 * @file formulas command - display and evaluate formulas
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { createFormulaEvaluator, type FormulaEvaluator } from "@oxen-office/xlsx/formula/evaluator";
import { formatCellRef } from "@oxen-office/xlsx/domain/cell/address";
import type { FormulaScalar } from "@oxen-office/xlsx/formula/types";

// =============================================================================
// Types
// =============================================================================

export type FormulaItemJson = {
  readonly ref: string;
  readonly formula: string;
  readonly storedValue: string | number | boolean | null;
  readonly calculatedValue?: string | number | boolean | null;
};

export type SheetFormulasJson = {
  readonly sheetName: string;
  readonly formulas: readonly FormulaItemJson[];
};

export type FormulasData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetFormulasJson[];
};

export type FormulasOptions = {
  readonly sheet?: string;
  readonly evaluate?: boolean;
};

// =============================================================================
// Helpers
// =============================================================================

function formatScalarValue(value: FormulaScalar): string | number | boolean | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object" && "type" in value && value.type === "error") {
    return value.value;
  }
  return String(value);
}

function formatCellValue(value: { type: string; value?: unknown }): string | number | boolean | null {
  switch (value.type) {
    case "string":
      return value.value as string;
    case "number":
      return value.value as number;
    case "boolean":
      return value.value as boolean;
    case "error":
      return value.value as string;
    case "date":
      return (value.value as Date).toISOString();
    case "empty":
      return null;
    default:
      return null;
  }
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display formulas from an XLSX file with optional evaluation.
 */
export async function runFormulas(filePath: string, options: FormulasOptions = {}): Promise<Result<FormulasData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const evaluator = options.evaluate ? createFormulaEvaluator(workbook) : undefined;

    const sheets: SheetFormulasJson[] = [];
    let totalCount = 0;

    for (let sheetIndex = 0; sheetIndex < workbook.sheets.length; sheetIndex++) {
      const sheet = workbook.sheets[sheetIndex];

      // Filter by sheet name if specified
      if (options.sheet && sheet.name !== options.sheet) {
        continue;
      }

      const formulas: FormulaItemJson[] = [];

      for (const row of sheet.rows) {
        for (const cell of row.cells) {
          if (cell.formula) {
            const ref = formatCellRef(cell.address);
            const storedValue = formatCellValue(cell.value);

            let calculatedValue: string | number | boolean | null | undefined;
            if (evaluator) {
              try {
                const result = evaluator.evaluateCell(sheetIndex, cell.address);
                calculatedValue = formatScalarValue(result);
              } catch {
                calculatedValue = "#ERROR!";
              }
            }

            formulas.push({
              ref,
              formula: cell.formula.expression,
              storedValue,
              ...(calculatedValue !== undefined && { calculatedValue }),
            });
          }
        }
      }

      if (formulas.length > 0) {
        totalCount += formulas.length;
        sheets.push({
          sheetName: sheet.name,
          formulas,
        });
      }
    }

    return success({
      totalCount,
      sheets,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
