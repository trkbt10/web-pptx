/**
 * @file OOXML element access helpers
 *
 * These helpers provide type-safe access to common element paths,
 * abstracting away the nested structure of OOXML elements.
 */

import type {
  GraphicFrameElement,
  TableElement,
  ShapePropertiesElement,
} from "./presentationml";
import type {
  Scene3DElement,
  SP3DElement,
} from "./drawingml";

// =============================================================================
// GraphicFrame helpers
// =============================================================================

/**
 * Get table element from a graphic frame.
 *
 * Abstracts the path: graphicFrame["a:graphic"]["a:graphicData"]["a:tbl"]
 *
 * @example
 * ```typescript
 * const tbl = getTable(graphicFrame);
 * if (tbl !== undefined) {
 *   const rows = asArray(tbl["a:tr"]);
 * }
 * ```
 */
export function getTable(graphicFrame: GraphicFrameElement): TableElement | undefined {
  return graphicFrame["a:graphic"]?.["a:graphicData"]?.["a:tbl"];
}

// =============================================================================
// ShapeProperties helpers
// =============================================================================

/**
 * Get 3D scene from shape properties.
 *
 * Abstracts the path: spPr["a:scene3d"]
 */
export function getScene3D(spPr: ShapePropertiesElement | undefined): Scene3DElement | undefined {
  return spPr?.["a:scene3d"];
}

/**
 * Get shape 3D properties from shape properties.
 *
 * Abstracts the path: spPr["a:sp3d"]
 */
export function getSp3D(spPr: ShapePropertiesElement | undefined): SP3DElement | undefined {
  return spPr?.["a:sp3d"];
}

/**
 * Check if shape properties have 3D effects.
 */
export function has3DProperties(spPr: ShapePropertiesElement | undefined): boolean {
  return spPr?.["a:scene3d"] !== undefined || spPr?.["a:sp3d"] !== undefined;
}
