/**
 * @file Editor utilities
 *
 * Re-exports from slide/shape for backwards compatibility.
 * New code should import directly from slide/shape.
 */

export {
  // Transform accessors
  getShapeTransform,
  withUpdatedTransform,
  hasEditableTransform,
  // Coordinate utilities
  clientToSlideCoords,
  getAbsoluteBounds,
  type AbsoluteBounds,
  // Shape capabilities (ECMA-376 locks)
  getShapeCapabilities,
  type ShapeCapabilities,
} from "../slide/shape";
