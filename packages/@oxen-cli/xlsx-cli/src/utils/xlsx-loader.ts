/**
 * @file XLSX workbook loader utility
 *
 * Wraps the comprehensive XLSX parser with file loading logic.
 */

import * as fs from "node:fs/promises";
import { loadZipPackage } from "@oxen/zip";
import { parseXlsxWorkbook } from "@oxen-office/xlsx/parser";
import type { XlsxWorkbook } from "@oxen-office/xlsx/domain/workbook";

/**
 * Load and parse an XLSX file using the comprehensive parser.
 *
 * @param filePath - Path to the XLSX file
 * @returns Parsed XlsxWorkbook with full P0 support (styles, formulas, merged cells, etc.)
 */
export async function loadXlsxWorkbook(filePath: string): Promise<XlsxWorkbook> {
  const buffer = await fs.readFile(filePath);
  const pkg = await loadZipPackage(buffer);

  const getFileContent = async (path: string): Promise<string | undefined> => {
    return pkg.readText(path) ?? undefined;
  };

  return parseXlsxWorkbook(getFileContent);
}
