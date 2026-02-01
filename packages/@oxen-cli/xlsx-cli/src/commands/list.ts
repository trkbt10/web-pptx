/**
 * @file list command - list sheets with summary
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { getSheetRange } from "../serializers/sheet-serializer";

export type SheetListItem = {
  readonly name: string;
  readonly rowCount: number;
  readonly cellCount: number;
  readonly range?: string;
  readonly mergedCellCount?: number;
  readonly formulaCount?: number;
};

export type ListData = {
  readonly sheets: readonly SheetListItem[];
};

/**
 * List sheets in an XLSX file with summary information.
 */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetListItem[] = workbook.sheets.map((sheet) => {
      let cellCount = 0;
      let formulaCount = 0;

      for (const row of sheet.rows) {
        cellCount += row.cells.length;
        for (const cell of row.cells) {
          if (cell.formula) {
            formulaCount++;
          }
        }
      }

      const range = getSheetRange(sheet);
      const rangeStr = range
        ? `${range.startCol}${range.startRow}:${range.endCol}${range.endRow}`
        : undefined;

      return {
        name: sheet.name,
        rowCount: sheet.rows.length,
        cellCount,
        range: rangeStr,
        ...(sheet.mergeCells && sheet.mergeCells.length > 0 && { mergedCellCount: sheet.mergeCells.length }),
        ...(formulaCount > 0 && { formulaCount }),
      };
    });

    return success({ sheets });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
