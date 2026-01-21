/**
 * @file Formula Evaluator
 *
 * Evaluates a parsed formula AST against a workbook snapshot.
 * This module is intentionally side-effect free: it reads cell values/formulas from the workbook,
 * resolves references/ranges, and executes registered functions with caching and cycle detection.
 */

import type { CellAddress } from "../domain/cell/address";
import { parseRange } from "../domain/cell/address";
import type { CellValue, ErrorValue } from "../domain/cell/types";
import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "../domain/constants";
import type { XlsxWorkbook } from "../domain/workbook";
import { colIdx, rowIdx } from "../domain/types";
import type { FormulaAstNode } from "./ast";
import { parseFormula } from "./parser";
import type { FormulaEvaluationResult, FormulaScalar } from "./types";
import { isFormulaError } from "./types";
import { formulaFunctionHelpers, getFormulaFunction } from "./functionRegistry";
import type { EvalResult } from "./functions/helpers";
import { createFormulaError, getErrorCodeFromError } from "./functions/helpers/errors";

type FormulaCellData = {
  readonly value: CellValue;
  readonly formula?: string;
};

type SheetMatrix = {
  readonly sheetName: string;
  readonly rows: ReadonlyMap<number, ReadonlyMap<number, FormulaCellData>>;
  readonly maxRow: number;
  readonly maxCol: number;
};

type WorkbookMatrix = {
  readonly sheets: readonly SheetMatrix[];
  readonly sheetIndexByName: ReadonlyMap<string, number>;
};

function toFormulaErrorScalar(value: ErrorValue): FormulaScalar {
  return { type: "error", value };
}

function isFormulaErrorScalar(value: unknown): value is Extract<FormulaScalar, { readonly type: "error" }> {
  return typeof value === "object" && value !== null && "type" in value && (value as { readonly type?: unknown }).type === "error";
}

function cellValueToFormulaScalar(value: CellValue): FormulaScalar {
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
      return toFormulaErrorScalar(value.value);
    case "date":
      return value.value.toISOString();
  }
}

function asPrimitiveOrThrow(value: FormulaScalar): FormulaEvaluationResult {
  if (isFormulaError(value)) {
    throw createFormulaError(value.value);
  }
  return value;
}

function normalizeFormulaText(formula: string): string {
  const trimmed = formula.trim();
  if (trimmed.startsWith("=")) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

function buildWorkbookMatrix(workbook: XlsxWorkbook): WorkbookMatrix {
  const sheetIndexByName = new Map<string, number>();
  const sheets = workbook.sheets.map((sheet, idx): SheetMatrix => {
    sheetIndexByName.set(sheet.name.trim().toUpperCase(), idx);

    const dimensionEndRow = sheet.dimension?.end.row as number | undefined;
    const dimensionEndCol = sheet.dimension?.end.col as number | undefined;
    const bounds = {
      maxRow: Math.max(1, dimensionEndRow ?? 1),
      maxCol: Math.max(1, dimensionEndCol ?? 1),
    };

    const rows = new Map<number, Map<number, FormulaCellData>>();
    for (const row of sheet.rows) {
      const rowNumber = row.rowNumber as number;
      bounds.maxRow = Math.max(bounds.maxRow, rowNumber);
      const rowMap = rows.get(rowNumber) ?? new Map<number, FormulaCellData>();
      for (const cell of row.cells) {
        bounds.maxCol = Math.max(bounds.maxCol, cell.address.col as number);
        rowMap.set(cell.address.col as number, { value: cell.value, formula: cell.formula?.expression });
      }
      rows.set(rowNumber, rowMap);
    }

    return { sheetName: sheet.name, rows, maxRow: bounds.maxRow, maxCol: bounds.maxCol };
  });

  return { sheets, sheetIndexByName };
}

function resolveSheetIndexByName(matrix: WorkbookMatrix, sheetName: string): number | undefined {
  return matrix.sheetIndexByName.get(sheetName.trim().toUpperCase());
}

function parseSheetQualifiedCellReference(
  reference: string,
  defaultSheetName: string,
): { readonly sheetName: string; readonly address: CellAddress } {
  const parsed = parseRange(reference);
  const isSingleCell =
    parsed.start.col === parsed.end.col &&
    parsed.start.row === parsed.end.row &&
    parsed.start.colAbsolute === parsed.end.colAbsolute &&
    parsed.start.rowAbsolute === parsed.end.rowAbsolute;
  if (!isSingleCell) {
    throw new Error("Expected single cell reference");
  }
  return {
    sheetName: parsed.sheetName ?? defaultSheetName,
    address: parsed.start,
  };
}

type EvalScope = {
  readonly defaultSheetIndex: number;
  readonly defaultSheetName: string;
  readonly resolveSheetIndexByName: (sheetName: string) => number | undefined;
  readonly resolveCell: (sheetIndex: number, address: CellAddress) => FormulaEvaluationResult;
  readonly resolveRange: (sheetIndex: number, range: { readonly start: CellAddress; readonly end: CellAddress }) => FormulaEvaluationResult[][];
  readonly origin: { readonly sheetName: string; readonly address: CellAddress };
};

function resolveScopeSheetIndex(scope: EvalScope, explicitSheetName: string | undefined): number | undefined {
  if (!explicitSheetName) {
    return scope.defaultSheetIndex;
  }
  return scope.resolveSheetIndexByName(explicitSheetName);
}

function compareOrder(left: FormulaEvaluationResult, right: FormulaEvaluationResult): number | undefined {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }
  return undefined;
}

function compareScalars(
  left: FormulaEvaluationResult,
  right: FormulaEvaluationResult,
  op: string,
): boolean {
  if (op === "=") {
    return formulaFunctionHelpers.comparePrimitiveEquality(left, right);
  }
  if (op === "<>") {
    return !formulaFunctionHelpers.comparePrimitiveEquality(left, right);
  }

  if (left === null || right === null) {
    throw createFormulaError("#VALUE!");
  }
  if (typeof left !== typeof right) {
    throw createFormulaError("#VALUE!");
  }
  if (typeof left === "boolean") {
    throw createFormulaError("#VALUE!");
  }

  const cmp = compareOrder(left, right);
  if (cmp === undefined) {
    throw createFormulaError("#VALUE!");
  }

  if (op === ">") {
    return cmp > 0;
  }
  if (op === "<") {
    return cmp < 0;
  }
  if (op === ">=") {
    return cmp >= 0;
  }
  if (op === "<=") {
    return cmp <= 0;
  }
  throw createFormulaError("#NAME?");
}

function evaluateNode(node: FormulaAstNode, scope: EvalScope): EvalResult {
  switch (node.type) {
    case "Literal": {
      if (isFormulaError(node.value)) {
        throw createFormulaError(node.value.value);
      }
      return node.value;
    }
    case "Reference": {
      const sheetIndex = resolveScopeSheetIndex(scope, node.sheetName);
      if (sheetIndex === undefined) {
        throw createFormulaError("#REF!");
      }
      return scope.resolveCell(sheetIndex, node.reference);
    }
    case "Range": {
      const sheetIndex = resolveScopeSheetIndex(scope, node.range.sheetName);
      if (sheetIndex === undefined) {
        throw createFormulaError("#REF!");
      }
      return scope.resolveRange(sheetIndex, { start: node.range.start, end: node.range.end });
    }
    case "Array": {
      const rows: FormulaEvaluationResult[][] = [];
      for (const row of node.elements) {
        const values: FormulaEvaluationResult[] = [];
        for (const el of row) {
          values.push(formulaFunctionHelpers.coerceScalar(evaluateNode(el, scope), "array literal"));
        }
        rows.push(values);
      }
      return rows;
    }
    case "Unary": {
      const value = evaluateNode(node.argument, scope);
      const n = formulaFunctionHelpers.requireNumber(value, `unary ${node.operator}`);
      return node.operator === "-" ? -n : n;
    }
    case "Binary": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      const l = formulaFunctionHelpers.requireNumber(left, `binary ${node.operator}`);
      const r = formulaFunctionHelpers.requireNumber(right, `binary ${node.operator}`);

      switch (node.operator) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) {
            throw createFormulaError("#DIV/0!");
          }
          return l / r;
        case "^":
          return l ** r;
      }
      throw createFormulaError("#NAME?");
    }
    case "Compare": {
      const left = formulaFunctionHelpers.coerceScalar(evaluateNode(node.left, scope), `comparator ${node.operator}`);
      const right = formulaFunctionHelpers.coerceScalar(evaluateNode(node.right, scope), `comparator ${node.operator}`);
      return compareScalars(left, right, node.operator);
    }
    case "Function": {
      const definition = getFormulaFunction(node.name);
      if (!definition) {
        throw new Error(`Unknown function "${node.name}"`);
      }

      if (definition.evaluateLazy) {
        return definition.evaluateLazy([...node.args], {
          evaluate: (child) => evaluateNode(child, scope),
          helpers: formulaFunctionHelpers,
          parseReference: (reference) => parseSheetQualifiedCellReference(reference, scope.origin.sheetName),
          origin: scope.origin,
        });
      }

      if (!definition.evaluate) {
        throw new Error(`Formula function "${node.name}" must provide an eager evaluator`);
      }

      const args = node.args.map((arg) => evaluateNode(arg, scope));
      return definition.evaluate(args, formulaFunctionHelpers);
    }
  }
}

export type FormulaEvaluator = {
  readonly evaluateCell: (sheetIndex: number, address: CellAddress) => FormulaScalar;
  readonly evaluateFormula: (sheetIndex: number, formula: string) => FormulaScalar;
  readonly evaluateFormulaResult: (sheetIndex: number, origin: CellAddress, formula: string) => EvalResult | FormulaScalar;
};

/**
 * Create a workbook-scoped formula evaluator.
 *
 * The returned evaluator caches parsed ASTs and computed cell results, and detects cycles
 * (returning `#REF!`) to avoid infinite recursion when formulas reference each other.
 *
 * @param workbook - Workbook snapshot to evaluate against
 * @returns Evaluator instance bound to the workbook
 */
export function createFormulaEvaluator(workbook: XlsxWorkbook): FormulaEvaluator {
  const matrix = buildWorkbookMatrix(workbook);
  const astCache = new Map<string, FormulaAstNode | null>();
  const valueCache = new Map<string, FormulaScalar>();
  const inProgress = new Set<string>();

  const getOrParseAst = (cacheKey: string, formula: string): FormulaAstNode | null => {
    const cached = astCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const parsed = parseFormula(formula);
      astCache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      astCache.set(cacheKey, null);
      return null;
    }
  };

  const evaluateFormulaResultInternal = (
    sheetIndex: number,
    origin: CellAddress,
    formula: string,
  ): EvalResult | FormulaScalar => {
    const normalized = normalizeFormulaText(formula);
    const cacheKey = `${sheetIndex}|${normalized}`;
    const ast = getOrParseAst(cacheKey, normalized);
    if (!ast) {
      return toFormulaErrorScalar("#NAME?");
    }

    const defaultSheetName = matrix.sheets[sheetIndex]?.sheetName;
    if (!defaultSheetName) {
      return toFormulaErrorScalar("#REF!");
    }

    const scope: EvalScope = {
      defaultSheetIndex: sheetIndex,
      defaultSheetName,
      resolveSheetIndexByName: (sheetName) => resolveSheetIndexByName(matrix, sheetName),
      resolveCell: (si, addr) => resolveCellPrimitive(si, addr),
      resolveRange: (si, range) => resolveRangePrimitive(si, range),
      origin: { sheetName: defaultSheetName, address: origin },
    };

    try {
      return evaluateNode(ast, scope);
    } catch (error) {
      const code = getErrorCodeFromError(error);
      return toFormulaErrorScalar(code);
    }
  };

  const evaluateFormulaInternal = (sheetIndex: number, origin: CellAddress, formula: string): FormulaScalar => {
    const evaluated = evaluateFormulaResultInternal(sheetIndex, origin, formula);
    if (isFormulaErrorScalar(evaluated)) {
      return evaluated;
    }
    try {
      return formulaFunctionHelpers.coerceScalar(evaluated, "formula");
    } catch (error) {
      const code = getErrorCodeFromError(error);
      return toFormulaErrorScalar(code);
    }
  };

  const computeCellScalarValue = (
    sheetIndex: number,
    address: CellAddress,
    cellData: FormulaCellData | undefined,
  ): FormulaScalar => {
    if (!cellData) {
      return null;
    }
    if (cellData.formula) {
      return evaluateFormulaInternal(sheetIndex, address, cellData.formula);
    }
    return cellValueToFormulaScalar(cellData.value);
  };

  const resolveCellScalar = (sheetIndex: number, address: CellAddress): FormulaScalar => {
    const key = `${sheetIndex}|${address.col as number}:${address.row as number}`;
    const cached = valueCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    if (inProgress.has(key)) {
      return toFormulaErrorScalar("#REF!");
    }

    inProgress.add(key);

    const sheet = matrix.sheets[sheetIndex];
    const cellData = sheet?.rows.get(address.row as number)?.get(address.col as number);

    const result = computeCellScalarValue(sheetIndex, address, cellData);

    valueCache.set(key, result);
    inProgress.delete(key);
    return result;
  };

  const resolveCellPrimitive = (sheetIndex: number, address: CellAddress): FormulaEvaluationResult => {
    return asPrimitiveOrThrow(resolveCellScalar(sheetIndex, address));
  };

  const resolveRangePrimitive = (
    sheetIndex: number,
    range: { readonly start: CellAddress; readonly end: CellAddress },
  ): FormulaEvaluationResult[][] => {
    const minRow = Math.min(range.start.row as number, range.end.row as number);
    const requestedMaxRow = Math.max(range.start.row as number, range.end.row as number);
    const minCol = Math.min(range.start.col as number, range.end.col as number);
    const requestedMaxCol = Math.max(range.start.col as number, range.end.col as number);

    const sheet = matrix.sheets[sheetIndex];
    const sheetMaxRow = sheet?.maxRow ?? EXCEL_MAX_ROWS;
    const sheetMaxCol = sheet?.maxCol ?? EXCEL_MAX_COLS;

    const maxRow = requestedMaxRow === EXCEL_MAX_ROWS ? sheetMaxRow : requestedMaxRow;
    const maxCol = requestedMaxCol === EXCEL_MAX_COLS ? sheetMaxCol : requestedMaxCol;

    const rows: FormulaEvaluationResult[][] = [];
    for (let r = minRow; r <= maxRow; r += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let c = minCol; c <= maxCol; c += 1) {
        rowValues.push(
          resolveCellPrimitive(sheetIndex, { col: colIdx(c), row: rowIdx(r), colAbsolute: false, rowAbsolute: false }),
        );
      }
      rows.push(rowValues);
    }
    return rows;
  };

  return {
    evaluateCell: (sheetIndex, address) => resolveCellScalar(sheetIndex, address),
    evaluateFormula: (sheetIndex, formula) =>
      evaluateFormulaInternal(sheetIndex, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, formula),
    evaluateFormulaResult: (sheetIndex, origin, formula) => evaluateFormulaResultInternal(sheetIndex, origin, formula),
  };
}
