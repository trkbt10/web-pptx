import type { ErrorValue } from "../domain/cell/types";

export type FormulaError = {
  readonly type: "error";
  readonly value: ErrorValue;
};

export type FormulaScalar = string | number | boolean | null | FormulaError;

export type FormulaArray = {
  readonly type: "array";
  readonly values: readonly (readonly FormulaScalar[])[];
};

export type EvalResult = FormulaScalar | FormulaArray;

export function isFormulaError(value: FormulaScalar): value is FormulaError {
  return typeof value === "object" && value !== null && "type" in value && value.type === "error";
}

export function toDisplayText(value: FormulaScalar): string {
  if (value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return value.value;
}

