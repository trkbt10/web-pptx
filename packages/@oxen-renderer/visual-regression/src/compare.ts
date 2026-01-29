/**
 * @file Visual comparison utilities
 *
 * Re-exports comparison utilities from the root spec/visual-regression/compare.ts
 * for use within @oxen-renderer packages.
 */

// Re-export from the root visual regression module
export {
  compareSvgToSnapshot,
  svgToPng,
  hasSnapshot,
  listSnapshots,
  type CompareOptions,
  type CompareResult,
} from "../../../../spec/visual-regression/compare";
