/**
 * @file Shape module exports
 *
 * Consolidated shape operations for slide editor.
 */

// Re-export ShapeId from domain
export type { ShapeId } from "../../../pptx/domain/types";

// Identity
export { getShapeId, hasShapeId } from "./identity";

// Query
export {
  findShapeById,
  findShapeByIdWithParents,
  getTopLevelShapeIds,
  isTopLevelShape,
} from "./query";

// Mutation
export {
  updateShapeById,
  deleteShapesById,
  reorderShape,
  moveShapeToIndex,
  generateShapeId,
} from "./mutation";

// Bounds
export { getShapeBounds, getCombinedBounds } from "./bounds";

// Render
export { getFillColor, getStrokeColor, getStrokeWidth } from "./render";

// Traverse
export {
  type ShapeRenderData,
  getShapeName,
  collectShapeRenderData,
} from "./traverse";

// Transform
export {
  type AbsoluteBounds,
  getShapeTransform,
  getAbsoluteBounds,
  withUpdatedTransform,
  hasEditableTransform,
} from "./transform";

// Capabilities
export { type ShapeCapabilities, getShapeCapabilities } from "./capabilities";

// Coords
export { clientToSlideCoords } from "./coords";
