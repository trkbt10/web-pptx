/**
 * @file Pretty output formatters for CLI
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { BuildData } from "../commands/build";
import type { VerifyData } from "../commands/verify";

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
