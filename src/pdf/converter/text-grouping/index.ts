/**
 * @file Text grouping strategy exports
 *
 * Provides pluggable strategies for grouping PDF text elements
 * into logical blocks during PDF to PPTX conversion.
 */

// Types
export type {
  TextGroupingStrategy,
  GroupedText,
  GroupedParagraph,
  TextBounds,
} from "./types";

// Strategies
export { NoGroupingStrategy } from "./no-grouping";
export { SpatialGroupingStrategy } from "./spatial-grouping";
export type { SpatialGroupingOptions } from "./spatial-grouping";
