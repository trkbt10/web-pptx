import type { CellAddress } from "../domain/cell/address";
import type { CellValue, ErrorValue } from "../domain/cell/types";
import type { XlsxWorkbook } from "../domain/workbook";
import { colIdx, rowIdx } from "../domain/types";
import type { FormulaAstNode } from "./ast";
import { parseFormula } from "./parser";
import type { EvalResult, FormulaArray, FormulaError, FormulaScalar } from "./types";
import { isFormulaError } from "./types";

type FormulaCellData = {
  readonly value: CellValue;
  readonly formula?: string;
};

type SheetMatrix = {
  readonly sheetName: string;
  readonly rows: ReadonlyMap<number, ReadonlyMap<number, FormulaCellData>>;
};

type WorkbookMatrix = {
  readonly sheets: readonly SheetMatrix[];
  readonly sheetIndexByName: ReadonlyMap<string, number>;
};

function toFormulaError(value: ErrorValue): FormulaError {
  return { type: "error", value };
}

function cellValueToScalar(value: CellValue): FormulaScalar {
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
      return toFormulaError(value.value);
    case "date":
      return value.value.toISOString();
  }
}

function asArray(values: readonly (readonly FormulaScalar[])[]): FormulaArray {
  return { type: "array", values };
}

function coerceScalar(value: EvalResult): FormulaScalar {
  if (typeof value === "object" && value !== null && "type" in value && value.type === "array") {
    return value.values[0]?.[0] ?? null;
  }
  return value;
}

function requireNumber(value: FormulaScalar, context: string): number | FormulaError {
  if (isFormulaError(value)) {
    return value;
  }
  if (value === null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  void context;
  return toFormulaError("#VALUE!");
}

function flattenToScalars(value: EvalResult): readonly FormulaScalar[] {
  if (typeof value === "object" && value !== null && "type" in value && value.type === "array") {
    return value.values.flatMap((row) => [...row]);
  }
  return [value];
}

function compareScalars(left: FormulaScalar, right: FormulaScalar, op: string): FormulaScalar {
  if (isFormulaError(left)) {
    return left;
  }
  if (isFormulaError(right)) {
    return right;
  }
  if (op === "=") {
    return Object.is(left, right);
  }
  if (op === "<>") {
    return !Object.is(left, right);
  }
  if (left === null || right === null) {
    return toFormulaError("#VALUE!");
  }
  if (typeof left !== typeof right) {
    return toFormulaError("#VALUE!");
  }
  if (typeof left === "boolean") {
    return toFormulaError("#VALUE!");
  }

  const cmp = (() => {
    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }
    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right);
    }
    return undefined;
  })();
  if (cmp === undefined) {
    return toFormulaError("#VALUE!");
  }

  if (op === ">") return cmp > 0;
  if (op === "<") return cmp < 0;
  if (op === ">=") return cmp >= 0;
  if (op === "<=") return cmp <= 0;
  return toFormulaError("#NAME?");
}

function buildWorkbookMatrix(workbook: XlsxWorkbook): WorkbookMatrix {
  const sheetIndexByName = new Map<string, number>();
  const sheets = workbook.sheets.map((sheet, idx): SheetMatrix => {
    sheetIndexByName.set(sheet.name.trim().toUpperCase(), idx);

    const rows = new Map<number, Map<number, FormulaCellData>>();
    for (const row of sheet.rows) {
      const rowNumber = row.rowNumber as number;
      const rowMap = rows.get(rowNumber) ?? new Map<number, FormulaCellData>();
      for (const cell of row.cells) {
        rowMap.set(cell.address.col as number, { value: cell.value, formula: cell.formula });
      }
      rows.set(rowNumber, rowMap);
    }

    return { sheetName: sheet.name, rows };
  });

  return { sheets, sheetIndexByName };
}

type EvalScope = {
  readonly defaultSheetIndex: number;
  readonly resolveSheetIndexByName: (sheetName: string) => number | undefined;
  readonly resolveCell: (sheetIndex: number, address: CellAddress) => FormulaScalar;
  readonly resolveRange: (sheetIndex: number, range: { readonly start: CellAddress; readonly end: CellAddress }) => FormulaArray;
};

function evaluateFunction(name: string, args: readonly EvalResult[]): FormulaScalar {
  const upper = name.toUpperCase();

  if (upper === "SUM") {
    let sum = 0;
    for (const arg of args) {
      for (const scalar of flattenToScalars(arg)) {
        const n = requireNumber(scalar, "SUM");
        if (typeof n !== "number") {
          return n;
        }
        sum += n;
      }
    }
    return sum;
  }

  if (upper === "AVERAGE") {
    const nums: number[] = [];
    for (const arg of args) {
      for (const scalar of flattenToScalars(arg)) {
        const n = requireNumber(scalar, "AVERAGE");
        if (typeof n !== "number") {
          return n;
        }
        nums.push(n);
      }
    }
    if (nums.length === 0) {
      return toFormulaError("#DIV/0!");
    }
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  if (upper === "MIN" || upper === "MAX") {
    const nums: number[] = [];
    for (const arg of args) {
      for (const scalar of flattenToScalars(arg)) {
        const n = requireNumber(scalar, upper);
        if (typeof n !== "number") {
          return n;
        }
        nums.push(n);
      }
    }
    if (nums.length === 0) {
      return 0;
    }
    return upper === "MIN" ? Math.min(...nums) : Math.max(...nums);
  }

  if (upper === "IF") {
    const cond = coerceScalar(args[0] ?? null);
    const thenVal = coerceScalar(args[1] ?? null);
    const elseVal = coerceScalar(args[2] ?? null);
    if (isFormulaError(cond)) {
      return cond;
    }
    const truthy = (() => {
      if (cond === null) return false;
      if (typeof cond === "boolean") return cond;
      if (typeof cond === "number") return cond !== 0;
      if (typeof cond === "string") return cond.length > 0;
      return false;
    })();
    return truthy ? thenVal : elseVal;
  }

  return toFormulaError("#NAME?");
}

function evaluateNode(node: FormulaAstNode, scope: EvalScope): EvalResult {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Reference": {
      const sheetIndex = (() => {
        if (!node.sheetName) {
          return scope.defaultSheetIndex;
        }
        return scope.resolveSheetIndexByName(node.sheetName);
      })();
      if (sheetIndex === undefined) {
        return toFormulaError("#REF!");
      }
      return scope.resolveCell(sheetIndex, node.reference);
    }
    case "Range": {
      const sheetIndex = (() => {
        if (!node.range.sheetName) {
          return scope.defaultSheetIndex;
        }
        return scope.resolveSheetIndexByName(node.range.sheetName);
      })();
      if (sheetIndex === undefined) {
        return toFormulaError("#REF!");
      }
      return scope.resolveRange(sheetIndex, { start: node.range.start, end: node.range.end });
    }
    case "Unary": {
      const arg = coerceScalar(evaluateNode(node.argument, scope));
      const n = requireNumber(arg, "unary");
      if (typeof n !== "number") {
        return n;
      }
      return node.operator === "-" ? -n : n;
    }
    case "Binary": {
      const left = coerceScalar(evaluateNode(node.left, scope));
      const right = coerceScalar(evaluateNode(node.right, scope));
      const l = requireNumber(left, "binary");
      if (typeof l !== "number") {
        return l;
      }
      const r = requireNumber(right, "binary");
      if (typeof r !== "number") {
        return r;
      }
      switch (node.operator) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? toFormulaError("#DIV/0!") : l / r;
        case "^":
          return Math.pow(l, r);
      }
      return toFormulaError("#NAME?");
    }
    case "Compare": {
      const left = coerceScalar(evaluateNode(node.left, scope));
      const right = coerceScalar(evaluateNode(node.right, scope));
      return compareScalars(left, right, node.operator);
    }
    case "Function": {
      const args = node.args.map((arg) => evaluateNode(arg, scope));
      return evaluateFunction(node.name, args);
    }
  }
}

function resolveSheetIndexByName(matrix: WorkbookMatrix, sheetName: string): number | undefined {
  return matrix.sheetIndexByName.get(sheetName.trim().toUpperCase());
}

export type FormulaEvaluator = {
  readonly evaluateCell: (sheetIndex: number, address: CellAddress) => FormulaScalar;
  readonly evaluateFormula: (sheetIndex: number, formula: string) => FormulaScalar;
};

export function createFormulaEvaluator(workbook: XlsxWorkbook): FormulaEvaluator {
  const matrix = buildWorkbookMatrix(workbook);
  const astCache = new Map<string, FormulaAstNode>();
  const valueCache = new Map<string, FormulaScalar>();
  const inProgress = new Set<string>();

  const getOrParseAst = (cacheKey: string, formula: string): FormulaAstNode | undefined => {
    const cached = astCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const parsed = parseFormula(formula);
      astCache.set(cacheKey, parsed);
      return parsed;
    } catch {
      return undefined;
    }
  };

  const resolveCell = (sheetIndex: number, address: CellAddress): FormulaScalar => {
    const key = `${sheetIndex}|${address.col as number}:${address.row as number}`;
    const cached = valueCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    if (inProgress.has(key)) {
      return toFormulaError("#REF!");
    }

    inProgress.add(key);

    const sheet = matrix.sheets[sheetIndex];
    const cellData = sheet?.rows.get(address.row as number)?.get(address.col as number);
    let result: FormulaScalar;
    if (!cellData) {
      result = null;
    } else if (cellData.formula) {
      result = evaluateFormula(sheetIndex, cellData.formula);
    } else {
      result = cellValueToScalar(cellData.value);
    }

    valueCache.set(key, result);
    inProgress.delete(key);
    return result;
  };

  const resolveRange = (sheetIndex: number, range: { readonly start: CellAddress; readonly end: CellAddress }): FormulaArray => {
    const minRow = Math.min(range.start.row as number, range.end.row as number);
    const maxRow = Math.max(range.start.row as number, range.end.row as number);
    const minCol = Math.min(range.start.col as number, range.end.col as number);
    const maxCol = Math.max(range.start.col as number, range.end.col as number);

    const rows: FormulaScalar[][] = [];
    for (let r = minRow; r <= maxRow; r += 1) {
      const rowValues: FormulaScalar[] = [];
      for (let c = minCol; c <= maxCol; c += 1) {
        rowValues.push(resolveCell(sheetIndex, { col: colIdx(c), row: rowIdx(r), colAbsolute: false, rowAbsolute: false }));
      }
      rows.push(rowValues);
    }
    return asArray(rows);
  };

  const evaluateFormula = (sheetIndex: number, formula: string): FormulaScalar => {
    const cacheKey = `${sheetIndex}|${formula}`;
    const ast = getOrParseAst(cacheKey, formula);

    if (!ast) {
      return toFormulaError("#NAME?");
    }

    const scope: EvalScope = {
      defaultSheetIndex: sheetIndex,
      resolveSheetIndexByName: (sheetName) => resolveSheetIndexByName(matrix, sheetName),
      resolveCell,
      resolveRange,
    };

    try {
      const evaluated = evaluateNode(ast, scope);
      return coerceScalar(evaluated);
    } catch {
      return toFormulaError("#VALUE!");
    }
  };

  const evaluateCell = (sheetIndex: number, address: CellAddress): FormulaScalar => resolveCell(sheetIndex, address);

  return {
    evaluateCell,
    evaluateFormula: (sheetIndex, formula) => evaluateFormula(sheetIndex, formula),
  };
}
