/**
 * @file SpreadsheetML number/date formatting helpers (ECMA-376 style/numFmt)
 *
 * Provides basic formatting for Excel-style format codes (e.g. `0.00`, `#,##0.00`, `000.00`).
 *
 * NOTE:
 * - This is intentionally a limited implementation, expanded incrementally via POI fixtures.
 * - The goal is stable, deterministic display for the editor and formula `TEXT()` evaluation.
 */

import { isDateFormat } from "./number-format";
import type { XlsxDateSystem } from "../date-system";
import { EXCEL_1904_TO_1900_DAY_OFFSET } from "../date-system";
import { parseNumberFormatSection } from "./format-code/number-section";

const MS_IN_DAY = 86_400_000;

function stripQuotedStrings(formatCode: string): string {
  return formatCode.replace(/"[^"]*"/gu, "");
}

function removeEscapes(section: string): string {
  return section.replace(/\\./gu, "");
}

function removeBracketCodes(section: string): string {
  return section.replace(/\[[^\]]+\]/gu, "");
}

function removeFillAndPadding(section: string): string {
  // `_x` adds spacing and `*x` fills by repeating chars. They are not part of numeric formatting output here.
  return section.replace(/_.?/gu, "").replace(/\*.?/gu, "");
}

function removeLiteralsForPattern(section: string): string {
  return removeFillAndPadding(removeBracketCodes(removeEscapes(stripQuotedStrings(section))));
}

function splitFormatSections(formatCode: string): readonly string[] {
  const sections: string[] = [];
  const state = { inQuoted: false, bufferParts: [] as string[] };

  for (let i = 0; i < formatCode.length; i += 1) {
    const ch = formatCode[i]!;
    if (ch === "\\" && i + 1 < formatCode.length) {
      state.bufferParts.push(ch, formatCode[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && formatCode[i + 1] === "\"") {
        state.bufferParts.push("\"\"");
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      state.bufferParts.push(ch);
      continue;
    }
    if (!state.inQuoted && ch === ";") {
      sections.push(state.bufferParts.join(""));
      state.bufferParts.length = 0;
      continue;
    }
    state.bufferParts.push(ch);
  }

  sections.push(state.bufferParts.join(""));
  return sections;
}

type NumericSectionCondition = Readonly<{
  op: "<" | "<=" | ">" | ">=" | "=" | "<>";
  compareTo: number;
}>;

function parseLeadingNumericCondition(section: string): NumericSectionCondition | null {
  const trimmedStart = section.trimStart();
  const state = { index: 0 };

  while (state.index < trimmedStart.length) {
    const ch = trimmedStart[state.index];
    if (ch !== "[") {
      return null;
    }
    const end = trimmedStart.indexOf("]", state.index + 1);
    if (end === -1) {
      return null;
    }

    const inner = trimmedStart.slice(state.index + 1, end);
    const match = /^\s*(<=|>=|<>|<|>|=)\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/u.exec(inner);
    if (match) {
      const op = match[1] as NumericSectionCondition["op"];
      const compareTo = Number(match[2]);
      if (!Number.isFinite(compareTo)) {
        return null;
      }
      return { op, compareTo };
    }

    state.index = end + 1;
  }

  return null;
}

function isNumericConditionMet(value: number, condition: NumericSectionCondition): boolean {
  switch (condition.op) {
    case "<":
      return value < condition.compareTo;
    case "<=":
      return value <= condition.compareTo;
    case ">":
      return value > condition.compareTo;
    case ">=":
      return value >= condition.compareTo;
    case "=":
      return value === condition.compareTo;
    case "<>":
      return value !== condition.compareTo;
  }
}

function pickFormatSection(formatCode: string, value: number): { readonly section: string; readonly hasNegativeSection: boolean } {
  const sections = splitFormatSections(formatCode);
  const hasNegativeSection = sections.length > 1;

  if (sections.length <= 1) {
    const condition = parseLeadingNumericCondition(formatCode);
    if (condition && !isNumericConditionMet(value, condition)) {
      return { section: "General", hasNegativeSection: false };
    }
    return { section: formatCode, hasNegativeSection: false };
  }

  const parsedSections = sections.map((section) => ({ section, condition: parseLeadingNumericCondition(section) }));
  const hasCondition = parsedSections.some(({ condition }) => condition !== null);
  if (hasCondition) {
    for (const candidate of parsedSections) {
      if (candidate.condition && isNumericConditionMet(value, candidate.condition)) {
        return { section: candidate.section, hasNegativeSection };
      }
    }

    for (let i = parsedSections.length - 1; i >= 0; i -= 1) {
      const candidate = parsedSections[i];
      if (candidate && candidate.condition === null) {
        return { section: candidate.section, hasNegativeSection };
      }
    }

    return { section: "General", hasNegativeSection };
  }

  if (value > 0) {
    return { section: sections[0]!, hasNegativeSection };
  }
  if (value < 0) {
    return { section: sections[1] ?? sections[0]!, hasNegativeSection };
  }
  return { section: sections[2] ?? sections[0]!, hasNegativeSection };
}

function countIntegerZeros(integerPattern: string): number {
  return [...integerPattern].filter((ch) => ch === "0").length;
}

function countFractionDigits(fractionPattern: string): { readonly min: number; readonly max: number } {
  const digits = [...fractionPattern].filter((ch) => ch === "0" || ch === "#");
  const min = digits.filter((ch) => ch === "0").length;
  const max = digits.length;
  return { min, max };
}

function wantsGrouping(integerPattern: string): boolean {
  return integerPattern.includes(",");
}

function isScientific(section: string): boolean {
  return /E\+0+/iu.test(removeLiteralsForPattern(section));
}

type ScientificMarker = Readonly<{
  index: number;
  letter: "e" | "E";
  signMode: "always" | "negativeOnly";
}>;

function findScientificMarker(section: string): ScientificMarker | null {
  const state = { inQuoted: false };
  for (let i = 0; i + 1 < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === "\\" && i + 1 < section.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && section[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }

    if (ch === "e" || ch === "E") {
      const sign = section[i + 1];
      if (sign === "+") {
        return { index: i, letter: ch, signMode: "always" };
      }
      if (sign === "-") {
        return { index: i, letter: ch, signMode: "negativeOnly" };
      }
    }
  }
  return null;
}

function parseNumericTemplate(template: string): {
  readonly integerPlaceholders: readonly string[];
  readonly fractionPlaceholders: readonly string[];
  readonly hasGrouping: boolean;
  readonly hasDecimalPoint: boolean;
} {
  const integerPlaceholders: string[] = [];
  const fractionPlaceholders: string[] = [];
  const state = { inQuoted: false, inFraction: false, hasGrouping: false, hasDecimalPoint: false };

  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && template[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (ch === ".") {
      state.inFraction = true;
      state.hasDecimalPoint = true;
      continue;
    }
    if (ch === ",") {
      if (!state.inFraction) {
        state.hasGrouping = true;
      }
      continue;
    }
    if (ch === "0" || ch === "#" || ch === "?") {
      if (state.inFraction) {
        fractionPlaceholders.push(ch);
      } else {
        integerPlaceholders.push(ch);
      }
    }
  }

  return {
    integerPlaceholders,
    fractionPlaceholders,
    hasGrouping: state.hasGrouping,
    hasDecimalPoint: state.hasDecimalPoint,
  };
}

function trimOptionalFractionDigits(
  digits: string,
  placeholders: readonly string[],
): { readonly digits: string; readonly placeholderCount: number } {
  const minDigits = placeholders.filter((ch) => ch === "0").length;
  const state = { end: digits.length, placeholderEnd: placeholders.length };

  while (state.end > minDigits && state.placeholderEnd > minDigits) {
    const digit = digits[state.end - 1];
    const placeholder = placeholders[state.placeholderEnd - 1];
    if (digit !== "0") {
      break;
    }
    if (placeholder === "0") {
      break;
    }
    state.end -= 1;
    state.placeholderEnd -= 1;
  }

  return { digits: digits.slice(0, state.end), placeholderCount: state.placeholderEnd };
}

function applyGroupingDigits(integerDigits: string): string {
  const negative = integerDigits.startsWith("-");
  const digits = negative ? integerDigits.slice(1) : integerDigits;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return negative ? `-${grouped}` : grouped;
}

function splitNumericRuns(template: string): {
  readonly prefix: string;
  readonly integerRun: string;
  readonly fractionRun: string;
  readonly suffix: string;
  readonly hasDecimalPoint: boolean;
  readonly hasGrouping: boolean;
} {
  const state = { inQuoted: false, foundStart: false };
  const startState = { start: -1, decimal: -1 };

  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && template[i + 1] === "\"") {
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (state.inQuoted) {
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (!state.foundStart && (ch === "0" || ch === "#" || ch === "?" || ch === ",")) {
      state.foundStart = true;
      startState.start = i;
      continue;
    }
    if (state.foundStart && startState.decimal === -1 && ch === ".") {
      startState.decimal = i;
      continue;
    }
  }

  if (startState.start === -1) {
    return { prefix: template, integerRun: "", fractionRun: "", suffix: "", hasDecimalPoint: false, hasGrouping: false };
  }

  const integerRunStart = startState.start;
  const hasDecimalPoint = startState.decimal !== -1;
  const integerEndState = { end: startState.decimal === -1 ? template.length : startState.decimal };
  if (!hasDecimalPoint) {
    for (let i = integerRunStart; i < template.length; i += 1) {
      const ch = template[i]!;
      if (ch === "0" || ch === "#" || ch === "?" || ch === ",") {
        integerEndState.end = i + 1;
        continue;
      }
      break;
    }
  }
  const integerRunEnd = integerEndState.end;
  const integerRun = template.slice(integerRunStart, integerRunEnd);
  const hasGrouping = integerRun.includes(",");

  if (startState.decimal === -1) {
    return {
      prefix: template.slice(0, integerRunStart),
      integerRun,
      fractionRun: "",
      suffix: template.slice(integerRunEnd),
      hasDecimalPoint,
      hasGrouping,
    };
  }

  const fractionStart = startState.decimal + 1;
  const fractionState = { end: fractionStart };
  for (let i = fractionStart; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      i += 1;
      continue;
    }
    if (ch === "\"") {
      break;
    }
    if (ch === "[") {
      break;
    }
    if (ch === "0" || ch === "#" || ch === "?" || ch === ",") {
      fractionState.end = i + 1;
      continue;
    }
    break;
  }

  const fractionRun = template.slice(fractionStart, fractionState.end);
  return {
    prefix: template.slice(0, integerRunStart),
    integerRun,
    fractionRun,
    suffix: template.slice(fractionState.end),
    hasDecimalPoint,
    hasGrouping,
  };
}

function formatNumberByTemplate(value: number, template: string): string {
  const runs = splitNumericRuns(template);
  const integerPlaceholders = [...runs.integerRun].filter((ch) => ch === "0" || ch === "#" || ch === "?");
  const fractionPlaceholders = [...runs.fractionRun].filter((ch) => ch === "0" || ch === "#" || ch === "?");

  const maxFractionDigits = fractionPlaceholders.length;
  const minFractionDigits = fractionPlaceholders.filter((ch) => ch === "0").length;

  const absolute = Math.abs(value);
  const fixed = maxFractionDigits > 0 ? absolute.toFixed(maxFractionDigits) : `${Math.round(absolute)}`;
  const [integerRaw, fractionRaw = ""] = fixed.split(".");
  const integerDigits = integerRaw ?? "0";
  const fractionDigits = fractionRaw ?? "";

  const integerPlaceholderCount = integerPlaceholders.length;
  const integerOverflow = integerDigits.length > integerPlaceholderCount;
  const extraLeadingDigits = integerOverflow ? integerDigits.slice(0, integerDigits.length - integerPlaceholderCount) : "";
  const digitsToUse = integerOverflow ? integerDigits.slice(integerDigits.length - integerPlaceholderCount) : integerDigits;

  const integerState = { digitIndex: digitsToUse.length - 1, parts: [] as string[] };
  for (let i = integerPlaceholderCount - 1; i >= 0; i -= 1) {
    const placeholder = integerPlaceholders[i]!;
    const digit = integerState.digitIndex >= 0 ? digitsToUse[integerState.digitIndex] : undefined;
    integerState.digitIndex -= 1;
    if (digit !== undefined) {
      integerState.parts.push(digit);
      continue;
    }
    if (placeholder === "0") {
      integerState.parts.push("0");
      continue;
    }
    if (placeholder === "?") {
      integerState.parts.push(" ");
      continue;
    }
  }
  const integerCoreRaw = `${extraLeadingDigits}${integerState.parts.reverse().join("")}`;
  const integerCore = runs.hasGrouping ? applyGroupingDigits(integerCoreRaw.replace(/^ +/u, "")) : integerCoreRaw;

  const trimmedFraction = trimOptionalFractionDigits(fractionDigits, fractionPlaceholders);
  const fractionPlaceholdersUsed = fractionPlaceholders.slice(0, trimmedFraction.placeholderCount);
  const fractionState = { index: 0, parts: [] as string[] };
  for (const placeholder of fractionPlaceholdersUsed) {
    const digit = trimmedFraction.digits[fractionState.index];
    if (digit !== undefined) {
      fractionState.parts.push(digit);
      fractionState.index += 1;
      continue;
    }
    if (placeholder === "0") {
      fractionState.parts.push("0");
      continue;
    }
    if (placeholder === "?") {
      fractionState.parts.push(" ");
      continue;
    }
  }
  const fractionCore = fractionState.parts.join("");
  const includeDecimal = runs.hasDecimalPoint && (fractionCore.length > 0 || minFractionDigits > 0);

  const sign = value < 0 ? "-" : "";
  return `${unescapeAffix(runs.prefix)}${sign}${integerCore}${includeDecimal ? `.${fractionCore}` : ""}${unescapeAffix(runs.suffix)}`;
}

function formatExponentByTemplate(exponent: number, template: string, signMode: ScientificMarker["signMode"]): string {
  const signText = exponent < 0 ? "-" : signMode === "always" ? "+" : "";
  const digits = String(Math.abs(exponent));
  const placeholders = [...template].filter((ch) => ch === "0" || ch === "#" || ch === "?");
  const placeholderCount = placeholders.length;

  const minDigits = placeholders.filter((ch) => ch === "0").length;
  const padded = digits.padStart(Math.max(minDigits, placeholderCount), "0");
  const state = { digitIndex: padded.length - 1, signInserted: false };

  const out: string[] = [];
  const templateState = { inQuoted: false };
  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i]!;
    if (ch === "\\" && i + 1 < template.length) {
      out.push(template[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      templateState.inQuoted = !templateState.inQuoted;
      continue;
    }
    if (templateState.inQuoted) {
      out.push(ch);
      continue;
    }
    if (ch === "[") {
      const end = template.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (ch === ",") {
      continue;
    }
    if (ch !== "0" && ch !== "#" && ch !== "?") {
      out.push(ch);
      continue;
    }

    if (!state.signInserted) {
      out.push(signText);
      state.signInserted = true;
    }

    const digit = state.digitIndex >= 0 ? padded[state.digitIndex] : undefined;
    state.digitIndex -= 1;
    if (digit !== undefined) {
      out.push(digit);
      continue;
    }
    if (ch === "0") {
      out.push("0");
      continue;
    }
    if (ch === "?") {
      out.push(" ");
      continue;
    }
  }
  return out.join("");
}

function resolveApproxScientificDigitsShown(args: {
  readonly abs: number;
  readonly log10Floor: number;
  readonly maxMantissaIntegerDigits: number;
}): number {
  if (args.abs >= 1) {
    const digitsBeforeDecimal = args.log10Floor + 1;
    if (digitsBeforeDecimal <= args.maxMantissaIntegerDigits) {
      return digitsBeforeDecimal;
    }
    return args.maxMantissaIntegerDigits >= 4 ? 2 : 1;
  }
  return args.maxMantissaIntegerDigits >= 7 ? 3 : args.maxMantissaIntegerDigits;
}

function unescapeAffix(text: string): string {
  const noBrackets = removeBracketCodes(text);
  const noPadding = removeFillAndPadding(noBrackets);
  const unescaped = noPadding.replace(/\\(.)/gu, "$1");
  return unescaped.replace(/"([^"]*)"/gu, "$1");
}

function formatTextSection(valueText: string, section: string): string {
  const parts: string[] = [];
  const state = { inQuoted: false };

  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === "\\" && i + 1 < section.length) {
      parts.push(section[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      if (state.inQuoted && section[i + 1] === "\"") {
        parts.push("\"");
        i += 1;
        continue;
      }
      state.inQuoted = !state.inQuoted;
      continue;
    }
    if (!state.inQuoted && ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        i = end;
        continue;
      }
    }
    if (!state.inQuoted && (ch === "_" || ch === "*")) {
      if (i + 1 < section.length) {
        i += 1;
      }
      continue;
    }
    if (!state.inQuoted && ch === "@") {
      parts.push(valueText);
      continue;
    }
    parts.push(ch);
  }

  return parts.join("");
}

/**
 * Format a text value by an Excel/SpreadsheetML format code (text section only).
 *
 * This is used by the formula `TEXT()` function when its first argument is non-numeric.
 */
export function formatTextByCode(valueText: string, formatCode: string): string {
  const sections = splitFormatSections(formatCode);
  if (sections.length >= 4) {
    return formatTextSection(valueText, sections[3] ?? "");
  }
  return valueText;
}

function trimDecimalString(value: string): string {
  if (!value.includes(".")) {
    return value;
  }
  const trimmed = value.replace(/0+$/u, "").replace(/\.$/u, "");
  return trimmed.length === 0 ? "0" : trimmed;
}

function scientificToDecimal(mantissa: string, exponent: number): string {
  const negative = mantissa.startsWith("-");
  const mantissaAbs = negative ? mantissa.slice(1) : mantissa;
  const [integerPartRaw, fractionPartRaw = ""] = mantissaAbs.split(".");
  const digits = `${integerPartRaw ?? ""}${fractionPartRaw}`;
  const normalizedDigits = digits.length > 0 ? digits : "0";
  const pointIndex = (integerPartRaw ?? "").length + exponent;

  const signPrefix = negative ? "-" : "";
  if (/^0+$/u.test(normalizedDigits)) {
    return "0";
  }

  if (pointIndex <= 0) {
    const zeros = "0".repeat(Math.max(0, -pointIndex));
    return `${signPrefix}0.${zeros}${normalizedDigits}`;
  }
  if (pointIndex >= normalizedDigits.length) {
    const zeros = "0".repeat(Math.max(0, pointIndex - normalizedDigits.length));
    return `${signPrefix}${normalizedDigits}${zeros}`;
  }
  return `${signPrefix}${normalizedDigits.slice(0, pointIndex)}.${normalizedDigits.slice(pointIndex)}`;
}

function normalizeScientificText(value: string): string {
  const match = /^([-+]?(?:\d+(?:\.\d+)?|\.\d+))[eE]([-+]?\d+)$/u.exec(value);
  if (!match) {
    return value;
  }
  const mantissa = trimDecimalString(match[1] ?? "");
  const exponentNumber = Number.parseInt(match[2] ?? "0", 10);
  const sign = exponentNumber >= 0 ? "+" : "-";
  const abs = Math.abs(exponentNumber);
  return `${mantissa}E${sign}${abs}`;
}

function formatGeneralNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (Object.is(value, -0) || value === 0) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e11 || abs < 1e-9) {
    return `${sign}${normalizeScientificText(abs.toExponential(14))}`;
  }

  const raw = abs.toPrecision(15);

  const expMatch = /^(\d+(?:\.\d+)?|\.\d+)[eE]([-+]?\d+)$/u.exec(raw);
  if (!expMatch) {
    return `${sign}${trimDecimalString(raw)}`;
  }

  const mantissa = expMatch[1] ?? "0";
  const exponent = Number.parseInt(expMatch[2] ?? "0", 10);
  if (!Number.isFinite(exponent)) {
    return `${sign}${trimDecimalString(raw)}`;
  }

  const decimal = scientificToDecimal(mantissa, exponent);
  const trimmed = trimDecimalString(decimal);
  if (trimmed.startsWith("-")) {
    return trimmed;
  }
  return `${sign}${trimmed}`;
}

function excelSerialToUtcDate1900(serial: number): Date {
  // 1900 date system with leap-year bug:
  // - serial 1 = 1900-01-01
  // - serial 60 = 1900-02-29 (non-existent but preserved by Excel)
  const days = Math.floor(serial);
  const fraction = serial - days;
  const timeMs = Math.round(fraction * MS_IN_DAY);
  const adjustedDays = days >= 60 ? days - 1 : days;

  const baseUtcMs = Date.UTC(1899, 11, 31);
  const dateUtcMs = baseUtcMs + adjustedDays * MS_IN_DAY + timeMs;
  return new Date(dateUtcMs);
}

function excelSerialToUtcDate(serial: number, dateSystem: XlsxDateSystem): Date {
  const normalizedSerial = dateSystem === "1904" ? serial + EXCEL_1904_TO_1900_DAY_OFFSET : serial;
  return excelSerialToUtcDate1900(normalizedSerial);
}

function buildDateTimeDetectionPattern(section: string): string {
  return removeFillAndPadding(removeEscapes(stripQuotedStrings(removeNonTimeBracketCodes(section))));
}

function resolveTimeRoundingUnitMs(section: string): number {
  const pattern = buildDateTimeDetectionPattern(section).toLowerCase();

  const maxFractionDigits = Math.min(
    3,
    Math.max(
      0,
      [...pattern.matchAll(/\.0+/gu)].reduce((acc, match) => Math.max(acc, match[0].length - 1), 0),
    ),
  );
  if (maxFractionDigits > 0) {
    return 10 ** (3 - maxFractionDigits);
  }

  if (pattern.includes("s")) {
    return 1_000;
  }

  return 1;
}

function roundSerialByUnitMs(serial: number, unitMs: number): number {
  if (unitMs <= 0) {
    throw new Error(`Expected unitMs > 0, got: ${unitMs}`);
  }
  return (Math.round((serial * MS_IN_DAY) / unitMs) * unitMs) / MS_IN_DAY;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const WEEKDAY_SHORT: readonly string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG: readonly string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT: readonly string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function removeNonTimeBracketCodes(section: string): string {
  // Preserve time elapsed tokens like [h], [m], [s] but drop colors/conditions like [Red], [<100], etc.
  // Important: bracket-looking text can also appear inside quoted literals; those must be preserved verbatim.
  const parts: string[] = [];
  const quoteState = { inQuoted: false };
  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === "\\" && i + 1 < section.length) {
      parts.push(ch + section[i + 1]!);
      i += 1;
      continue;
    }
    if (ch === "\"") {
      quoteState.inQuoted = !quoteState.inQuoted;
      parts.push(ch);
      continue;
    }
    if (!quoteState.inQuoted && ch === "[") {
      const end = section.indexOf("]", i + 1);
      if (end !== -1) {
        const inner = section.slice(i + 1, end).toLowerCase();
        if (inner === "h" || inner === "hh" || inner === "m" || inner === "mm" || inner === "s" || inner === "ss") {
          parts.push(section.slice(i, end + 1));
        }
        i = end;
        continue;
      }
    }
    parts.push(ch);
  }
  return parts.join("");
}

function looksLikeTimeMinutesContext(section: string, index: number): boolean {
  const prev = index > 0 ? section[index - 1] : undefined;
  const next = index + 1 < section.length ? section[index + 1] : undefined;
  return prev === ":" || next === ":";
}

function formatAmPmToken(tokenRaw: string, hours24: number): string {
  const lower = tokenRaw.toLowerCase();
  const isPm = hours24 >= 12;
  if (lower === "a/p") {
    const letter = isPm ? "P" : "A";
    return tokenRaw[0] === tokenRaw[0]?.toLowerCase() ? letter.toLowerCase() : letter.toUpperCase();
  }
  return isPm ? "PM" : "AM";
}

function formatDateByCode(serial: number, section: string, dateSystem: XlsxDateSystem): string {
  const raw = removeNonTimeBracketCodes(section);
  const rawLower = raw.toLowerCase();
  const usesElapsedTime = /\[(?:h+|m+|s+)\]/iu.test(rawLower);
  const hasElapsedHoursToken = /\[(?:h|hh)\]/iu.test(rawLower);
  const hasElapsedMinutesToken = /\[(?:m|mm)\]/iu.test(rawLower);
  const hasElapsedSecondsToken = /\[(?:s|ss)\]/iu.test(rawLower);
  const roundingUnitMs = resolveTimeRoundingUnitMs(raw);
  const roundedSerial = roundSerialByUnitMs(serial, roundingUnitMs);

  const date = usesElapsedTime ? undefined : excelSerialToUtcDate(roundedSerial, dateSystem);
  const y = date?.getUTCFullYear() ?? 0;
  const m = (date?.getUTCMonth() ?? 0) + 1;
  const d = date?.getUTCDate() ?? 0;
  const weekday = date?.getUTCDay() ?? 0;
  const hh = date?.getUTCHours() ?? 0;
  const mm = date?.getUTCMinutes() ?? 0;
  const ss = date?.getUTCSeconds() ?? 0;
  const ms = date?.getUTCMilliseconds() ?? 0;

  const elapsedTotalMs = usesElapsedTime ? Math.round(roundedSerial * MS_IN_DAY) : 0;
  const elapsedTotalSeconds = usesElapsedTime ? Math.floor(elapsedTotalMs / 1000) : 0;
  const elapsedMilliseconds = usesElapsedTime ? ((elapsedTotalMs % 1000) + 1000) % 1000 : 0;
  const elapsedTotalMinutes = usesElapsedTime ? Math.floor(elapsedTotalSeconds / 60) : 0;
  const elapsedTotalHours = usesElapsedTime ? Math.floor(elapsedTotalMinutes / 60) : 0;
  const elapsedSecondsWithinMinute = usesElapsedTime ? ((elapsedTotalSeconds % 60) + 60) % 60 : 0;
  const elapsedMinutesWithinHour = usesElapsedTime ? ((elapsedTotalMinutes % 60) + 60) % 60 : 0;
  const elapsedHoursWithinDay = usesElapsedTime ? ((elapsedTotalHours % 24) + 24) % 24 : 0;

  const usesAmPm = rawLower.includes("am/pm") || rawLower.includes("a/p");

  const resolveHourValue = (): number => {
    if (!usesElapsedTime) {
      return hh;
    }
    return hasElapsedHoursToken ? elapsedTotalHours : elapsedHoursWithinDay;
  };

  const parts: string[] = [];
  const quoteState = { inQuoted: false };
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (ch === "\\" && i + 1 < raw.length) {
      const next = raw[i + 1]!;
      if (next === "\"") {
        quoteState.inQuoted = !quoteState.inQuoted;
      } else {
        parts.push(next);
      }
      i += 1;
      continue;
    }
    if (ch === "\"") {
      quoteState.inQuoted = !quoteState.inQuoted;
      continue;
    }
    if (quoteState.inQuoted) {
      parts.push(ch);
      continue;
    }

    if (ch === "[" && i + 1 < raw.length) {
      const end = raw.indexOf("]", i + 1);
      if (end !== -1) {
        const innerRaw = raw.slice(i + 1, end);
        const inner = innerRaw.toLowerCase();
        if (inner === "h" || inner === "hh") {
          const digits = inner === "hh" ? 2 : 1;
          const value = elapsedTotalHours;
          parts.push(digits === 2 ? String(value).padStart(2, "0") : String(value));
          i = end;
          continue;
        }
        if (inner === "m" || inner === "mm") {
          const digits = inner === "mm" ? 2 : 1;
          const value = elapsedTotalMinutes;
          parts.push(digits === 2 ? String(value).padStart(2, "0") : String(value));
          i = end;
          continue;
        }
        if (inner === "s" || inner === "ss") {
          const digits = inner === "ss" ? 2 : 1;
          const value = elapsedTotalSeconds;
          parts.push(digits === 2 ? String(value).padStart(2, "0") : String(value));
          i = end;
          continue;
        }
      }
    }

    if (ch === "." && i + 1 < raw.length) {
      const zeroRun = /^[0]+/u.exec(raw.slice(i + 1));
      if (zeroRun) {
        const digits = zeroRun[0].length;
        if (digits <= 3) {
          const divisor = 10 ** (3 - digits);
          const fractionDigits = usesElapsedTime ? elapsedMilliseconds : ms;
          const fraction = Math.floor(fractionDigits / divisor);
          parts.push(`.${String(fraction).padStart(digits, "0")}`);
        } else {
          const fractionDigits = usesElapsedTime ? elapsedMilliseconds : ms;
          parts.push(`.${String(fractionDigits).padStart(3, "0")}${"0".repeat(digits - 3)}`);
        }
        i += digits;
        continue;
      }
    }

    const token = rawLower.slice(i);
    if (token.startsWith("am/pm")) {
      parts.push(formatAmPmToken(raw.slice(i, i + "AM/PM".length), hh));
      i += "AM/PM".length - 1;
      continue;
    }
    if (token.startsWith("a/p")) {
      parts.push(formatAmPmToken(raw.slice(i, i + "A/P".length), hh));
      i += "A/P".length - 1;
      continue;
    }
    if (token.startsWith("dddd")) {
      parts.push(WEEKDAY_LONG[weekday] ?? "");
      i += 3;
      continue;
    }
    if (token.startsWith("ddd")) {
      parts.push(WEEKDAY_SHORT[weekday] ?? "");
      i += 2;
      continue;
    }
    if (token.startsWith("yyyy")) {
      parts.push(String(y));
      i += 3;
      continue;
    }
    if (token.startsWith("yyy")) {
      parts.push(String(y));
      i += 2;
      continue;
    }
    if (token.startsWith("yy")) {
      parts.push(pad2(y % 100));
      i += 1;
      continue;
    }
    if (token.startsWith("y")) {
      parts.push(pad2(y % 100));
      continue;
    }
    if (token.startsWith("mmmm")) {
      parts.push(MONTH_LONG[m - 1] ?? "");
      i += 3;
      continue;
    }
    if (token.startsWith("mmm")) {
      parts.push(MONTH_SHORT[m - 1] ?? "");
      i += 2;
      continue;
    }
    if (token.startsWith("mm")) {
      if (usesElapsedTime) {
        const value = hasElapsedMinutesToken ? elapsedTotalMinutes : elapsedMinutesWithinHour;
        parts.push(String(value).padStart(2, "0"));
      } else if (looksLikeTimeMinutesContext(rawLower, i)) {
        parts.push(pad2(mm));
      } else {
        parts.push(pad2(m));
      }
      i += 1;
      continue;
    }
    if (token.startsWith("m")) {
      if (usesElapsedTime) {
        const value = hasElapsedMinutesToken ? elapsedTotalMinutes : elapsedMinutesWithinHour;
        parts.push(String(value));
      } else if (looksLikeTimeMinutesContext(rawLower, i)) {
        parts.push(String(mm));
      } else {
        parts.push(String(m));
      }
      continue;
    }
    if (token.startsWith("dd")) {
      parts.push(pad2(d));
      i += 1;
      continue;
    }
    if (token.startsWith("d")) {
      parts.push(String(d));
      continue;
    }
    if (token.startsWith("hh")) {
      const hourValue = resolveHourValue();
      const hour12Base = hourValue % 12;
      const hour12 = hour12Base === 0 ? 12 : hour12Base;
      parts.push(pad2(usesAmPm ? hour12 : hourValue));
      i += 1;
      continue;
    }
    if (token.startsWith("h")) {
      const hourValue = resolveHourValue();
      const hour12Base = hourValue % 12;
      const hour12 = hour12Base === 0 ? 12 : hour12Base;
      parts.push(String(usesAmPm ? hour12 : hourValue));
      continue;
    }
    if (token.startsWith("ss")) {
      if (usesElapsedTime) {
        const value = hasElapsedSecondsToken ? elapsedTotalSeconds : elapsedSecondsWithinMinute;
        parts.push(String(value).padStart(2, "0"));
      } else {
        parts.push(pad2(ss));
      }
      i += 1;
      continue;
    }
    if (token.startsWith("s")) {
      if (usesElapsedTime) {
        const value = hasElapsedSecondsToken ? elapsedTotalSeconds : elapsedSecondsWithinMinute;
        parts.push(String(value));
      } else {
        parts.push(String(ss));
      }
      continue;
    }

    parts.push(ch);
  }

  return parts.join("");
}

/**
 * Format a number (or Excel serial date) by an Excel/SpreadsheetML format code.
 */
export function formatNumberByCode(value: number, formatCode: string, options?: { readonly dateSystem?: XlsxDateSystem }): string {
  const { section, hasNegativeSection } = pickFormatSection(formatCode, value);
  const cleaned = removeLiteralsForPattern(section);

  const trimmed = cleaned.trim();
  if (trimmed === "General" || trimmed === "@") {
    return formatGeneralNumber(value);
  }

  const marker = findScientificMarker(section);
  if (marker) {
    const mantissaTemplate = section.slice(0, marker.index);
    const exponentTemplate = section.slice(marker.index + 2);
    const parsed = parseNumericTemplate(mantissaTemplate);

    const abs = Math.abs(value);
    if (abs === 0) {
      const mantissa = formatNumberByTemplate(0, mantissaTemplate);
      const exponent = formatExponentByTemplate(0, exponentTemplate, marker.signMode);
      return `${mantissa}${marker.letter}${exponent}`;
    }

    const maxMantissaIntegerDigits = Math.max(1, parsed.integerPlaceholders.length);
    const log10Floor = Math.floor(Math.log10(abs));

    const digitsShown = resolveApproxScientificDigitsShown({ abs, log10Floor, maxMantissaIntegerDigits });

    const exponent = log10Floor - (digitsShown - 1);
    const mantissaValue = abs / 10 ** exponent;
    const mantissa = formatNumberByTemplate(mantissaValue, mantissaTemplate);
    const exponentText = formatExponentByTemplate(exponent, exponentTemplate, marker.signMode);
    const signPrefix = value < 0 && !hasNegativeSection ? "-" : "";
    return `${signPrefix}${mantissa}${marker.letter}${exponentText}`;
  }

  const datePattern = buildDateTimeDetectionPattern(section);
  if (isDateFormat(datePattern)) {
    return formatDateByCode(value, section, options?.dateSystem ?? "1900");
  }

  const parsed = parseNumberFormatSection(section);
  if (parsed.kind === "literal") {
    return parsed.literal;
  }

  const scaled = (value * 100 ** parsed.percentCount) / 1000 ** parsed.scaleCommas;

  if (isScientific(section)) {
    const templateNoScale = parsed.fractionPattern.length > 0 ? `${parsed.integerPattern}.${parsed.fractionPattern}` : parsed.integerPattern;
    const expDigitsMatch = /E\+0+/iu.exec(templateNoScale);
    const expDigits = expDigitsMatch ? expDigitsMatch[0].length - 2 : 2;

    const dot = templateNoScale.indexOf(".");
    const fractionPatternForDigits = dot === -1 ? "" : templateNoScale.slice(dot + 1);
    const { min, max } = countFractionDigits(fractionPatternForDigits);
    const decimals = Math.max(min, max);

    const exp = scaled.toExponential(decimals);
    const [mantissa, exponentRaw] = exp.split("e");
    const exponent = Number.parseInt(exponentRaw ?? "0", 10);
    const sign = exponent >= 0 ? "+" : "-";
    const abs = Math.abs(exponent);
    return `${mantissa}E${sign}${String(abs).padStart(expDigits, "0")}`;
  }

  const minIntegerDigits = Math.max(1, countIntegerZeros(parsed.integerPattern));
  const { min: minFractionDigits, max: maxFractionDigits } = countFractionDigits(parsed.fractionPattern);
  const grouping = wantsGrouping(parsed.integerPattern);

  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: grouping,
    minimumIntegerDigits: minIntegerDigits,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });

  const isNegative = scaled < 0;
  const formattedCore = formatter.format(Math.abs(scaled));
  const suffixWithoutScale = parsed.suffix.replace(/^,+/u, "");
  const negativePrefix = isNegative && !hasNegativeSection ? "-" : "";

  return `${negativePrefix}${parsed.prefix}${formattedCore}${suffixWithoutScale}`;
}
