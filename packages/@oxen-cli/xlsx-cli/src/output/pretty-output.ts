/**
 * @file Pretty output formatters for CLI
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { BuildData } from "../commands/build";
import type { VerifyData } from "../commands/verify";
import type { StringsData, RichTextRunJson } from "../commands/strings";
import type { FormulasData } from "../commands/formulas";

export function formatInfoPretty(data: InfoData): string {
  const lines = [
    `Sheets: ${data.sheetCount}`,
    `Sheet Names: ${data.sheetNames.join(", ")}`,
    `Shared Strings: ${data.sharedStringCount}`,
    `Total Rows: ${data.totalRows}`,
    `Total Cells: ${data.totalCells}`,
  ];

  return lines.join("\n");
}

export function formatListPretty(data: ListData): string {
  if (data.sheets.length === 0) {
    return "No sheets found";
  }

  return data.sheets
    .map((sheet) => {
      const parts = [
        `${sheet.name}:`,
        `  Rows: ${sheet.rowCount}`,
        `  Cells: ${sheet.cellCount}`,
      ];

      if (sheet.range) {
        parts.push(`  Range: ${sheet.range}`);
      }
      if (sheet.mergedCellCount) {
        parts.push(`  Merged Cells: ${sheet.mergedCellCount}`);
      }
      if (sheet.formulaCount) {
        parts.push(`  Formulas: ${sheet.formulaCount}`);
      }
      if (sheet.hasAutoFilter) {
        parts.push(`  Auto Filter: yes`);
      }

      return parts.join("\n");
    })
    .join("\n\n");
}

export function formatShowPretty(data: ShowData): string {
  const lines = [`Sheet: ${data.sheetName}`];

  if (data.range) {
    lines.push(`Range: ${data.range}`);
  }

  lines.push("");

  if (data.rows.length === 0) {
    lines.push("(empty)");
  } else {
    for (const row of data.rows) {
      const cellValues = row.cells.map((c) => `${c.ref}=${c.value ?? ""}`).join(", ");
      lines.push(`Row ${row.rowNumber}: ${cellValues}`);
    }
  }

  return lines.join("\n");
}

export function formatExtractPretty(data: ExtractData): string {
  const header = `Sheet: ${data.sheetName} (${data.format.toUpperCase()})`;
  return `${header}\n${"=".repeat(header.length)}\n${data.content}`;
}

export function formatBuildPretty(data: BuildData): string {
  return `Built: ${data.outputPath}`;
}

function formatRunProps(run: RichTextRunJson): string {
  const props: string[] = [];
  if (run.bold) props.push("bold");
  if (run.italic) props.push("italic");
  if (run.underline) props.push("underline");
  if (run.strike) props.push("strike");
  if (run.fontSize) props.push(`size:${run.fontSize}`);
  if (run.fontName) props.push(`font:${run.fontName}`);
  if (run.color) props.push(`color:${run.color}`);
  return props.length > 0 ? ` [${props.join(", ")}]` : "";
}

export function formatStringsPretty(data: StringsData): string {
  const lines = [`Shared Strings: ${data.count}`];
  lines.push("");

  for (const item of data.strings) {
    if (item.type === "plain") {
      lines.push(`[${item.index}] "${item.text}"`);
    } else {
      lines.push(`[${item.index}] (rich) "${item.text}"`);
      if (item.runs) {
        for (const run of item.runs) {
          const props = formatRunProps(run);
          lines.push(`    "${run.text}"${props}`);
        }
      }
    }
  }

  return lines.join("\n");
}

export function formatFormulasPretty(data: FormulasData): string {
  const lines = [`Total Formulas: ${data.totalCount}`];
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push(`Sheet: ${sheet.sheetName}`);
    for (const f of sheet.formulas) {
      const stored = f.storedValue === null ? "(empty)" : String(f.storedValue);
      if (f.calculatedValue !== undefined) {
        const calc = f.calculatedValue === null ? "(empty)" : String(f.calculatedValue);
        lines.push(`  ${f.ref}: =${f.formula} -> ${calc} (stored: ${stored})`);
      } else {
        lines.push(`  ${f.ref}: =${f.formula} = ${stored}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatVerifyPretty(data: VerifyData): string {
  const lines = [`Results: ${data.passed} passed, ${data.failed} failed`];
  lines.push("");

  for (const result of data.results) {
    const status = result.passed ? "✓" : "✗";
    lines.push(`${status} ${result.name}`);

    if (!result.passed) {
      for (const assertion of result.assertions.filter((a) => !a.passed)) {
        lines.push(`    ${assertion.path}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
      }
    }
  }

  return lines.join("\n");
}
