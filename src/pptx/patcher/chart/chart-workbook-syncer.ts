/**
 * @file Chart-Workbook Synchronization
 *
 * Unified handler for synchronizing chart data with embedded workbooks.
 * Updates both chart caches and embedded Excel workbooks in the correct order.
 *
 * Update Order (per Phase 10 report):
 * 1. Workbook (xlsx) - the source of truth
 * 2. Chart formulas (c:f) - to match workbook ranges
 * 3. Chart caches (c:*Cache) - for display/compatibility
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 * @see docs/reports/phase-10-chart-externalData-workbook-sync.md
 */

import type { XmlDocument, XmlElement, XmlNode } from "../../../xml";
import { getByPath, getChild, getChildren, isXmlElement, getTextContent } from "../../../xml";
import { createElement, replaceChildByName, setChildren, updateDocumentRoot } from "../core/xml-mutator";
import type { PresentationFile } from "../../domain/opc";
import { patchChartData, type ChartData } from "./chart-data-patcher";
import {
  resolveChartExternalData,
  parseFormulaSheetName,
  composeFormula,
  hasExternalData,
  type ChartExternalDataReference,
} from "./chart-external-data-resolver";
import { parseRange, formatRange, updateRangeForItemCount } from "./a1-range";
import { parseWorkbook, type Workbook } from "../../../xlsx/workbook-parser";
import { updateChartDataInWorkbook } from "../../../xlsx/workbook-patcher";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of chart-workbook synchronization
 */
export type ChartSyncResult = {
  /** Updated chart XML document */
  readonly chartXml: XmlDocument;
  /** Updated workbook buffer (if external data exists) */
  readonly workbookBuffer: ArrayBuffer | undefined;
  /** Path to the workbook in the PPTX (if external data exists) */
  readonly workbookPath: string | undefined;
  /** Whether workbook was updated */
  readonly workbookUpdated: boolean;
};

/**
 * Options for chart-workbook sync
 */
export type ChartSyncOptions = {
  /** Whether to update workbook (default: true if external data exists) */
  readonly updateWorkbook?: boolean;
  /** Whether to update chart formulas (default: true) */
  readonly updateFormulas?: boolean;
  /** Sheet name in workbook (default: auto-detect from existing formulas) */
  readonly sheetName?: string;
};

// =============================================================================
// Main Sync Function
// =============================================================================

/**
 * Synchronize chart data with embedded workbook.
 *
 * This is the main entry point for chart data updates that need to
 * maintain consistency with embedded Excel workbooks.
 *
 * @param chartXml - Parsed chart XML document
 * @param chartPath - Path to chart XML (e.g., "ppt/charts/chart1.xml")
 * @param file - Presentation file for reading workbook
 * @param data - New chart data
 * @param options - Sync options
 * @returns Sync result with updated chart and optionally workbook
 *
 * @example
 * const result = await syncChartWithWorkbook(
 *   chartXml,
 *   "ppt/charts/chart1.xml",
 *   file,
 *   { categories: ["A", "B", "C"], series: [{ name: "Sales", values: [1, 2, 3] }] }
 * );
 * // Use result.chartXml for the updated chart
 * // Use result.workbookBuffer for the updated xlsx (if present)
 */
export async function syncChartWithWorkbook(
  chartXml: XmlDocument,
  chartPath: string,
  file: PresentationFile,
  data: ChartData,
  options: ChartSyncOptions = {},
): Promise<ChartSyncResult> {
  const { updateWorkbook = true, updateFormulas = true } = options;

  // Check for external data
  const externalDataRef = hasExternalData(chartXml)
    ? resolveChartExternalData(chartXml, chartPath, file)
    : undefined;

  let workbookBuffer: ArrayBuffer | undefined;
  let workbookUpdated = false;
  let updatedChartXml = chartXml;

  // Step 1: Update workbook (if exists and enabled)
  if (externalDataRef && updateWorkbook) {
    const xlsxBuffer = file.readBinary(externalDataRef.workbookPath);
    if (!xlsxBuffer) {
      throw new Error(
        `syncChartWithWorkbook: embedded workbook not found at ${externalDataRef.workbookPath}`,
      );
    }

    const workbook = await parseWorkbook(xlsxBuffer);

    // Detect sheet name from existing formulas
    const sheetName = options.sheetName ?? detectSheetNameFromChart(chartXml) ?? "Sheet1";

    // Update workbook data
    const seriesValues = data.series.map((s) => s.values);
    const seriesNames = data.series.map((s) => s.name);

    workbookBuffer = await updateChartDataInWorkbook(
      workbook,
      sheetName,
      data.categories,
      seriesValues,
      1, // headerRow
      seriesNames,
    );
    workbookUpdated = true;

    // Step 2: Update chart formulas (if enabled)
    if (updateFormulas) {
      updatedChartXml = updateChartFormulas(
        chartXml,
        sheetName,
        data.categories.length,
        data.series.length,
      );
    }
  }

  // Step 3: Update chart caches (always)
  updatedChartXml = patchChartData(updatedChartXml, data);

  return {
    chartXml: updatedChartXml,
    workbookBuffer,
    workbookPath: externalDataRef?.workbookPath,
    workbookUpdated,
  };
}

// =============================================================================
// Formula Detection
// =============================================================================

/**
 * Detect sheet name from existing chart formulas.
 */
function detectSheetNameFromChart(chartXml: XmlDocument): string | undefined {
  const chartSpace = getByPath(chartXml, ["c:chartSpace"]);
  if (!chartSpace) return undefined;

  const chart = getChild(chartSpace, "c:chart");
  if (!chart) return undefined;

  const plotArea = getChild(chart, "c:plotArea");
  if (!plotArea) return undefined;

  // Find first c:f element
  const formula = findFirstFormula(plotArea);
  if (!formula) return undefined;

  const parsed = parseFormulaSheetName(formula);
  return parsed?.sheetName;
}

/**
 * Find first formula (c:f) in element tree.
 */
function findFirstFormula(element: XmlElement): string | undefined {
  for (const child of element.children) {
    if (!isXmlElement(child)) continue;

    if (child.name === "c:f") {
      return getTextContent(child) || undefined;
    }

    const found = findFirstFormula(child);
    if (found) return found;
  }
  return undefined;
}

// =============================================================================
// Formula Updates
// =============================================================================

/**
 * Update chart formulas (c:f elements) to match new data ranges.
 */
function updateChartFormulas(
  chartXml: XmlDocument,
  sheetName: string,
  categoryCount: number,
  seriesCount: number,
): XmlDocument {
  return updateDocumentRoot(chartXml, (root) => {
    return updateFormulasInElement(root, sheetName, categoryCount, seriesCount);
  });
}

/**
 * Recursively update c:f elements in an element tree.
 */
function updateFormulasInElement(
  element: XmlElement,
  sheetName: string,
  categoryCount: number,
  seriesCount: number,
): XmlElement {
  const updatedChildren = element.children.map((child): XmlNode => {
    if (!isXmlElement(child)) return child;

    // Handle c:f elements
    if (child.name === "c:f") {
      const formula = getTextContent(child) ?? "";
      const updatedFormula = updateFormulaRange(formula, sheetName, categoryCount);
      return createElement("c:f", child.attrs, [{ type: "text", value: updatedFormula }]);
    }

    // Recurse into children
    return updateFormulasInElement(child, sheetName, categoryCount, seriesCount);
  });

  return createElement(element.name, element.attrs, updatedChildren);
}

/**
 * Update a formula's range to match new item count.
 */
function updateFormulaRange(formula: string, sheetName: string, itemCount: number): string {
  const parsed = parseFormulaSheetName(formula);
  if (!parsed) return formula;

  const range = parseRange(parsed.rangeRef);
  if (!range) return formula;

  const updatedRange = updateRangeForItemCount(range, itemCount);
  const newRangeRef = formatRange(updatedRange);

  return composeFormula(parsed.sheetName, newRangeRef);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if a chart requires workbook synchronization.
 *
 * @param chartXml - Parsed chart XML
 * @returns true if chart has external data
 */
export function requiresWorkbookSync(chartXml: XmlDocument): boolean {
  return hasExternalData(chartXml);
}

/**
 * Get the workbook path for a chart (if external data exists).
 *
 * @param chartXml - Parsed chart XML
 * @param chartPath - Path to chart XML
 * @param file - Presentation file
 * @returns Workbook path or undefined
 */
export function getChartWorkbookPath(
  chartXml: XmlDocument,
  chartPath: string,
  file: PresentationFile,
): string | undefined {
  if (!hasExternalData(chartXml)) {
    return undefined;
  }

  try {
    const ref = resolveChartExternalData(chartXml, chartPath, file);
    return ref?.workbookPath;
  } catch {
    return undefined;
  }
}
