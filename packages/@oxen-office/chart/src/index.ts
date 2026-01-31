/**
 * @file ChartML domain/parser/patcher entry point
 *
 * This package is intended to be format-agnostic (PPTX/DOCX/XLSX),
 * providing reusable ChartML logic.
 */

// Chart types from serializer
export type {
  BuildableChartType,
  Grouping,
  BarGrouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
  ChartSpaceOptions,
} from "./serializer/chart-space-builder";

export { buildChartSpaceElement, buildChartSpaceDocument } from "./serializer/chart-space-builder";

